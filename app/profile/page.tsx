"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import ConfirmPasswordModal from "components/ConfirmPasswordModal";
import TotpModal from "components/TotpModal";

export default function ProfilePage() {
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");

  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingSave, setPendingSave] = useState(false);

  const [hasTotp, setHasTotp] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [showTotp, setShowTotp] = useState(false);

  // Función para cargar el estado real del TOTP
  const loadTotpState = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const u = userData.user;
    if (!u) return;

    setUserId(u.id);
    setEmail(u.email ?? "");

    // Cargar perfil
    const { data: prof } = await supabase
      .from("profiles")
      .select("id, full_name, role, mfa_enabled, mfa_factor_id")
      .eq("id", u.id)
      .single();
    setFullName(prof?.full_name ?? "");

    // Verificar factores TOTP (estado VERIFIED)
    const { data: fData } = await supabase.auth.mfa.listFactors();

    const verifiedTotp = fData?.totp?.find(
      (f: any) => (f?.status || "").toLowerCase() === "verified"
    );

    // Usar SOLO el estado verificado para determinar si TOTP está activo
    const totpActive = !!verifiedTotp;
    setHasTotp(totpActive);
    setFactorId(verifiedTotp?.id ?? null);

    // Sincronizar la BD si es necesario
    if (prof && totpActive !== prof.mfa_enabled) {
      await supabase.from("profiles")
        .update({
          mfa_enabled: totpActive,
          mfa_factor_id: totpActive ? verifiedTotp?.id : null
        })
        .eq("id", u.id);
    }
  };

  useEffect(() => {
    loadTotpState();
  }, []);

  // Recargar estado cuando se cierre el modal TOTP
  useEffect(() => {
    if (!showTotp) {
      // Pequeño delay para asegurar que las operaciones de Supabase hayan terminado
      setTimeout(() => {
        loadTotpState();
      }, 500);
    }
  }, [showTotp]);

  const handleSave = async (password: string) => {
    setPendingSave(true);
    try {
      // Reautenticar
      const { error: reauthErr } = await supabase.auth.signInWithPassword({ email, password });
      if (reauthErr) throw reauthErr;

      // Actualizar perfil (solo full_name)
      const { error: pErr } = await supabase
        .from("profiles")
        .update({ full_name: fullName || null })
        .eq("id", userId);
      if (pErr) throw pErr;

      // (Opcional) reflejar en metadatos
      const { error: aErr } = await supabase.auth.updateUser({
        data: { full_name: fullName || null },
      });
      if (aErr) throw aErr;

      alert("Perfil actualizado correctamente.");
    } catch (e: any) {
      alert(`Error al guardar: ${e.message || e.toString()}`);
    } finally {
      setPendingSave(false);
      setShowConfirm(false);
    }
  };

  const onClickGuardar = () => setShowConfirm(true);

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-semibold">Mi perfil</h1>

      <section className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Correo (solo lectura)</label>
          <input className="input input-bordered w-full" disabled value={email} />
        </div>

        <div>
          <label className="block text-sm font-medium">Nombre completo</label>
          <input className="input input-bordered w-full" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>

        <div className="flex gap-3">
          <button className="btn btn-primary" onClick={onClickGuardar}> Guardar cambios </button>
          <button className={`btn ${hasTotp ? "btn-error" : "btn-outline"}`} onClick={() => setShowTotp(true)}>
            {hasTotp ? "Desactivar TOTP" : "Activar TOTP"}
          </button>
        </div>
      </section>

      <ConfirmPasswordModal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleSave}
        loading={pendingSave}
      />

      <TotpModal
        open={showTotp}
        onClose={() => setShowTotp(false)}
        hasTotp={hasTotp}
        factorId={factorId}
        onTotpStateChange={(s) => {
          setHasTotp(s.hasTotp);
          setFactorId(s.factorId);

          // FORZAR actualización de BD independientemente del estado de verificación
          if (userId) {
            supabase.from("profiles")
              .update({
                mfa_enabled: s.hasTotp,
                mfa_factor_id: s.factorId
              })
              .eq("id", userId)
              .then(({ error, data }) => {
                if (error) {
                  console.error("=== DEBUG: Error forzando actualización BD ===", error);
                } else {
                  console.log("=== DEBUG: BD actualizada forzadamente ===", data);
                }
              });
          }
        }}
      />
    </div>
  );
}