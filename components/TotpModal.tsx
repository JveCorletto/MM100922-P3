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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white p-6 space-y-4">
        <h2 className="text-lg font-semibold text-black">
          {hasTotp ? "Desactivar TOTP" : "Activar TOTP"}
        </h2>

        {!hasTotp ? (
          !qrSrc ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Activaremos TOTP con Google Authenticator. Genera el QR y escanéalo.
              </p>
              <div className="flex justify-end gap-2">
                <button className="btn btn-ghost" onClick={handleCancel}>
                  Cancelar
                </button>
                <button 
                  className="btn btn-primary" 
                  onClick={enrollTotp} 
                  disabled={loading}
                >
                  {loading ? "Generando..." : "Generar QR"}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className={`mx-auto inline-block rounded-lg ring-blue-500 ${ringIntensity} transition-all`}>
                <img src={qrSrc} alt="TOTP QR" className="rounded border max-w-full h-auto" />
              </div>
              <div className="text-center text-sm text-gray-700">
                Código cambia en <span className="font-semibold">{remaining}s</span>
              </div>
              <p className="text-sm text-gray-600">Escribe el código de 6 dígitos de Google Authenticator:</p>
              <input
                className="input input-bordered w-full text-center tracking-widest"
                placeholder="XXX-XXX"
                value={formattedCode}
                onChange={(e) => setCode(e.target.value)}
                inputMode="numeric"
              />
              <div className="flex justify-end gap-2">
                <button 
                  className="btn btn-ghost" 
                  onClick={handleCancelActivation}
                  disabled={loading}
                >
                  Cancelar Activación
                </button>
                <button
                  className="btn btn-primary"
                  onClick={verifyTotp}
                  disabled={loading || code.replace(/\D/g, "").length !== 6}
                >
                  {loading ? "Verificando..." : "Verificar y Activar"}
                </button>
              </div>
            </div>
          )
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Para desactivar, valida tu TOTP actual:</p>
            <input
              className="input input-bordered w-full text-center tracking-widest"
              placeholder="XXX-XXX"
              value={formattedCode}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
            />
            <div className="flex justify-end gap-2">
              <button className="btn btn-ghost" onClick={onClose}>
                Cancelar
              </button>
              <button
                className="btn btn-error"
                onClick={disableTotp}
                disabled={loading || code.replace(/\D/g, "").length !== 6}
              >
                {loading ? "Desactivando..." : "Desactivar"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}