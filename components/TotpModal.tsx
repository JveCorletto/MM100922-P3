"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";

type TotpState = { hasTotp: boolean; factorId: string | null };

// --- helpers robustos ---
function resolveTotpArray(data: any): any[] {
  if (Array.isArray(data?.totp)) return data.totp;
  if (Array.isArray(data?.factors))
    return data.factors.filter((f: any) => (f?.factor_type || f?.type) === "totp");
  return [];
}

function pickTotpId(data: any): { id: string | null; verified: boolean } {
  const arr = resolveTotpArray(data);
  if (arr.length === 0) return { id: null, verified: false };

  // Buscar PRIMERO un factor verificado
  const verified = arr.find((f: any) => (f?.status || "").toLowerCase() === "verified");
  if (verified?.id) {
    return { id: verified.id, verified: true };
  }

  return { id: arr[0]?.id ?? null, verified: false };
}

export default function TotpModal({
  open,
  onClose,
  hasTotp,
  factorId,
  onTotpStateChange,
}: {
  open: boolean;
  onClose: () => void;
  hasTotp: boolean;
  factorId: string | null;
  onTotpStateChange: (s: TotpState) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [qrRaw, setQrRaw] = useState<string | null>(null);
  const [otpUri, setOtpUri] = useState<string | null>(null);
  const [newFactorId, setNewFactorId] = useState<string | null>(null);
  const [activeFactorId, setActiveFactorId] = useState<string | null>(factorId ?? null);
  const [code, setCode] = useState("");

  // Countdown exacto de 30s
  const [remaining, setRemaining] = useState<number>(30);
  const tickRef = useRef<number | null>(null);

  // Sincroniza prop -> estado local
  useEffect(() => {
    setActiveFactorId(factorId ?? null);
  }, [factorId]);

  // Al abrir, sincroniza estado real del factor
  useEffect(() => {
    if (!open) return;

    (async () => {
      startCountdown();

      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) return;

      const { data, error } = await supabase.auth.mfa.listFactors();
      
      if (!error) {
        const pick = pickTotpId(data);
        
        const hasVerifiedTotp = !! (pick.verified && pick.id);
        setActiveFactorId(pick.id);
        onTotpStateChange({
          hasTotp: hasVerifiedTotp,
          factorId: hasVerifiedTotp ? pick.id : null
        });
      }
    })();

    return () => {
      stopCountdown();
      setQrRaw(null);
      setOtpUri(null);
      setCode("");
      setLoading(false);
      // NO limpiar newFactorId aquí - lo manejamos manualmente
    };
  }, [open, onTotpStateChange]);

  // Función manual para limpiar factores no verificados
  const cleanupUnverifiedFactors = async () => {
    if (!newFactorId) return;
    
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const factor = resolveTotpArray(factors).find(f => f.id === newFactorId);
      
      // Solo limpiar si el factor existe y NO está verificado
      if (factor && factor.status?.toLowerCase() !== "verified") {
        await supabase.auth.mfa.unenroll({ factorId: newFactorId });
      } else {
        console.log("=== DEBUG: Factor está verificado, no se limpia ===", newFactorId);
      }
    } catch (error) {
      console.error("=== DEBUG: Error en limpieza manual ===", error);
    }
  };

  // Llamar a cleanup cuando se cancele explícitamente
  const handleCancel = async () => {
    if (newFactorId && !hasTotp) {
      await cleanupUnverifiedFactors();
    }
    onClose();
  };

  // Función específica para cancelar la activación (cuando ya hay QR generado)
  const handleCancelActivation = async () => {
    if (newFactorId) {
      await cleanupUnverifiedFactors();
    }
    onClose();
  };

  // Normalizador de QR
  const qrSrc = useMemo(() => {
    if (!qrRaw) return null;
    const s = qrRaw.trim();
    if (s.startsWith("data:")) return s;
    if (s.startsWith("<svg")) return `data:image/svg+xml;utf8,${encodeURIComponent(s)}`;
    return `data:image/png;base64,${s}`;
  }, [qrRaw]);

  const startCountdown = () => {
    const sync = () => {
      const now = Math.floor(Date.now() / 1000);
      const rem = 30 - (now % 30);
      setRemaining(rem === 0 ? 30 : rem);
    };
    sync();
    tickRef.current = window.setInterval(sync, 1000);
  };

  const stopCountdown = () => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  // Formato XXX-XXX
  const formattedCode = useMemo(() => {
    const digits = code.replace(/\D/g, "").slice(0, 6);
    return digits.replace(/(\d{3})(\d{0,3})/, (_, a, b) => (b ? `${a}-${b}` : a));
  }, [code]);

  // Enrolar (issuer y nombre bonitos)
  const enrollTotp = async () => {
    setLoading(true);
    try {
      const { data: lf, error: lfErr } = await supabase.auth.mfa.listFactors();
      if (lfErr) throw lfErr;

      const arr = resolveTotpArray(lf);
      const alreadyVerified = arr.find((f: any) => (f?.status || "").toLowerCase() === "verified");
      if (alreadyVerified?.id) {
        setActiveFactorId(alreadyVerified.id);
        onTotpStateChange({ hasTotp: true, factorId: alreadyVerified.id });
        toast("TOTP ya está activado para tu cuenta.");
        onClose();
        return;
      }

      // Limpiar factores no verificados existentes
      for (const factor of arr) {
        if (factor.status?.toLowerCase() !== "verified" && factor.id) {
          await supabase.auth.mfa.unenroll({ factorId: factor.id }).catch(() => {});
        }
      }

      const { data: uinfo } = await supabase.auth.getUser();
      const userEmail = uinfo.user?.email ?? uinfo.user?.id ?? "user";

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        issuer: "EduTrack IA",
        friendlyName: `EduTrack IA - ${userEmail}`,
      });
      if (error) throw error;

      if (data && data.type === "totp" && "totp" in data && data.totp) {
        setNewFactorId(data.id);
        setQrRaw(data.totp.qr_code ?? null);
        setOtpUri(data.totp.uri ?? null);
      } else {
        throw new Error("El factor devuelto no es de tipo TOTP.");
      }
    } catch (e: any) {
      toast.error(`Error al iniciar enrolamiento TOTP: ${e.message || e.toString()}`);
    } finally {
      setLoading(false);
    }
  };

  // Verificar (persistir mfa_enabled)
  const verifyTotp = async () => {
    const codeDigits = code.replace(/\D/g, "");
    if (!newFactorId) return toast.error("No hay factor de enrolamiento activo.");
    if (codeDigits.length !== 6) return toast.error("Ingresa el código de 6 dígitos.");

    setLoading(true);
    try {
      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: newFactorId });
      if (chErr) throw chErr;
      const cid = ch?.id;
      if (!cid) throw new Error("No se obtuvo challengeId.");

      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId: newFactorId,
        challengeId: cid,
        code: codeDigits,
      });
      if (vErr) throw vErr;

      // Verificar que el factor ahora está verified
      const { data: factorsAfterVerify } = await supabase.auth.mfa.listFactors();
      const verifiedFactor = resolveTotpArray(factorsAfterVerify).find(f => f.id === newFactorId);
      
      if (!verifiedFactor || verifiedFactor.status?.toLowerCase() !== "verified") {
        throw new Error("El factor no se marcó como verificado después de la verificación.");
      }

      const { data: uinfo } = await supabase.auth.getUser();
      const uid = uinfo.user?.id;
      if (uid) {
        await supabase.from("profiles")
          .update({ 
            mfa_enabled: true, 
            mfa_factor_id: newFactorId 
          })
          .eq("id", uid);
      }

      setActiveFactorId(newFactorId);
      
      onTotpStateChange({ 
        hasTotp: true, 
        factorId: newFactorId 
      });
      
      toast.success("TOTP activado correctamente.");
      onClose();
    } catch (e: any) {
      // Si falla la verificación, limpiar el factor
      if (newFactorId) {
        await cleanupUnverifiedFactors();
      }
      toast.error(`Código TOTP inválido: ${e.message || e.toString()}`);
    } finally {
      setLoading(false);
    }
  };

  // Desactivar TOTP
  const disableTotp = async () => {
    const codeDigits = code.replace(/\D/g, "");
    if (codeDigits.length !== 6) {
      toast.error("Ingresa tu código TOTP de 6 dígitos.");
      return;
    }

    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) throw new Error("Sesión no disponible. Vuelve a iniciar sesión.");

      let factorToUse = activeFactorId || factorId;

      if (!factorToUse) {
        const { data: uinfo } = await supabase.auth.getUser();
        const uid = uinfo.user?.id;
        if (uid) {
          const { data: prof } = await supabase
            .from("profiles")
            .select("mfa_factor_id")
            .eq("id", uid)
            .single();
          factorToUse = prof?.mfa_factor_id;
        }
      }

      if (!factorToUse) {
        throw new Error("No se encontró un factor TOTP para desactivar.");
      }

      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: factorToUse });
      if (chErr) throw chErr;
      const cid = ch?.id;
      if (!cid) throw new Error("No se obtuvo challengeId.");

      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId: factorToUse,
        challengeId: cid,
        code: codeDigits,
      });
      if (vErr) throw vErr;

      const { error: uErr } = await supabase.auth.mfa.unenroll({ factorId: factorToUse });
      if (uErr) throw uErr;

      const { data: uinfo } = await supabase.auth.getUser();
      const uid = uinfo.user?.id;
      if (uid) {
        await supabase.from("profiles")
          .update({ 
            mfa_enabled: false, 
            mfa_factor_id: null 
          })
          .eq("id", uid);
      }

      onTotpStateChange({ 
        hasTotp: false, 
        factorId: null 
      });
      
      setActiveFactorId(null);
      toast.success("TOTP desactivado correctamente.");
      onClose();
    } catch (e: any) {
      toast.error(`No se pudo desactivar: ${e.message || e.toString()}`);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const ringIntensity = remaining <= 5 ? "ring-4" : remaining <= 10 ? "ring-2" : "ring-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 sm:px-6">
      <div className="w-full max-w-md rounded-xl bg-white dark:bg-gray-800 p-4 sm:p-6 space-y-4 sm:space-y-6 shadow-lg border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="text-center sm:text-left">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
            {hasTotp ? "Desactivar autenticación en dos pasos" : "Activar autenticación en dos pasos"}
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {hasTotp 
              ? "Para desactivar, ingresa tu código de verificación actual" 
              : "Protege tu cuenta con autenticación en dos pasos"
            }
          </p>
        </div>

        {!hasTotp ? (
          !qrSrc ? (
            // Configuración inicial
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">¿Qué necesitas?</p>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      Una aplicación autenticadora como Google Authenticator, Authy, o Microsoft Authenticator.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button 
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 py-2.5 px-4 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                  onClick={handleCancel}
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button 
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                  onClick={enrollTotp} 
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Generando QR...
                    </div>
                  ) : (
                    "Generar código QR"
                  )}
                </button>
              </div>
            </div>
          ) : (
            // Verificación del código
            <div className="space-y-4">
              {/* Código QR */}
              <div className="flex flex-col items-center space-y-4">
                <div className={`bg-white p-4 rounded-lg border-2 border-gray-200 dark:border-gray-600 ${ringIntensity} ring-blue-500 transition-all`}>
                  <img src={qrSrc} alt="Código QR para autenticación" className="w-48 h-48 sm:w-56 sm:h-56" />
                </div>
                
                <div className="text-center space-y-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Escanea este código QR con tu aplicación autenticadora
                  </p>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    El código cambia en <span className="font-semibold text-blue-600 dark:text-blue-400">{remaining}s</span>
                  </div>
                </div>
              </div>

              {/* Input de verificación */}
              <div className="space-y-3">
                <label htmlFor="totp-code" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Código de verificación de 6 dígitos
                </label>
                <input
                  id="totp-code"
                  className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors text-center text-lg font-mono tracking-widest"
                  placeholder="123-456"
                  value={formattedCode}
                  onChange={(e) => setCode(e.target.value)}
                  inputMode="numeric"
                  maxLength={7}
                />
              </div>

              {/* Botones de acción */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button 
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 py-2.5 px-4 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                  onClick={handleCancelActivation}
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                  onClick={verifyTotp}
                  disabled={loading || code.replace(/\D/g, "").length !== 6}
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Verificando...
                    </div>
                  ) : (
                    "Verificar y activar"
                  )}
                </button>
              </div>
            </div>
          )
        ) : (
          // Desactivar TOTP
          <div className="space-y-4">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">¿Estás seguro?</p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    Desactivar la autenticación en dos pasos reduce la seguridad de tu cuenta.
                  </p>
                </div>
              </div>
            </div>

            {/* Input de verificación */}
            <div className="space-y-3">
              <label htmlFor="disable-totp-code" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Código de verificación actual
              </label>
              <input
                id="disable-totp-code"
                className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors text-center text-lg font-mono tracking-widest"
                placeholder="123-456"
                value={formattedCode}
                onChange={(e) => setCode(e.target.value)}
                inputMode="numeric"
                maxLength={7}
              />
            </div>

            {/* Botones de acción */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button 
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 py-2.5 px-4 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                onClick={onClose}
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                onClick={disableTotp}
                disabled={loading || code.replace(/\D/g, "").length !== 6}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Desactivando...
                  </div>
                ) : (
                  "Desactivar"
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}