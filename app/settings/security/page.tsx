"use client"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import toast from "react-hot-toast"

export default function SecuritySettings() {
  const [secret, setSecret] = useState<string | null>(null)
  const [qr, setQr] = useState<string | null>(null)
  const [token, setToken] = useState("")
  const [factorId, setFactorId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [hasTotp, setHasTotp] = useState(false)

  useEffect(() => { checkTotpStatus() }, [])

  const checkTotpStatus = async () => {
    const { data, error } = await supabase.auth.mfa.listFactors()
    if (error) return
    // ✔ usa data.all (o data.totp) para ver si hay TOTP verificado
    const totpActive = !!data?.all?.some(f => f.factor_type === "totp" && f.status === "verified")
    setHasTotp(totpActive)
  }

  const setupTotp = async () => {
    setLoading(true)
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" })
    if (error) { toast.error(error.message); setLoading(false); return }

    // ✔ Narrowing por el discriminante "type"
    if (data && data.type === "totp" && data.totp) {
      setSecret(data.totp.secret ?? null)
      setQr(data.totp.uri ?? null)     // NOTA: la propiedad es "uri" (no "qr_code")
      setFactorId(data.id ?? null)
    } else {
      toast.error("No se pudo inicializar TOTP")
    }
    setLoading(false)
  }

  const verifyTotp = async () => {
    if (!factorId) { toast.error("Error en la configuración"); return }
    setLoading(true)

    // ✔ flujo correcto: challenge -> verify (usa challengeId)
    const { data: challenge, error: chErr } = await supabase.auth.mfa.challenge({ factorId })
    if (chErr || !challenge?.id) { toast.error(chErr?.message ?? "No se pudo iniciar el desafío"); setLoading(false); return }

    const { error: verErr } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: token
    })
    if (verErr) {
      toast.error(verErr.message)
    } else {
      toast.success("TOTP activado ✅")
      setSecret(null); setQr(null); setToken(""); setFactorId(null)
      await checkTotpStatus()
    }
    setLoading(false)
  }

  const removeTotp = async () => {
    setLoading(true)
    const { data, error } = await supabase.auth.mfa.listFactors()
    if (error) { toast.error(error.message); setLoading(false); return }

    // ✔ toma el factor TOTP verificado y lo desinscribe
    const verified = data?.all?.find(f => f.factor_type === "totp" && f.status === "verified")
    if (!verified) { toast.error("No hay TOTP activo"); setLoading(false); return }

    const { error: unErr } = await supabase.auth.mfa.unenroll({ factorId: verified.id })
    if (unErr) toast.error(unErr.message)
    else { toast.success("TOTP desactivado"); setHasTotp(false) }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Seguridad</h1>

      <div className="card p-4">
        <h2 className="text-lg font-semibold mb-2">Autenticación en dos pasos (TOTP)</h2>
        <p className={hasTotp ? "text-green-500" : "text-yellow-400"}>
          Estado: {hasTotp ? "🟢 Activada" : "🟡 No activada"}
        </p>
      </div>

      {hasTotp ? (
        <div className="space-y-4">
          <p>✅ Ya tienes activada la autenticación TOTP.</p>
          <button className="btn btn-danger" onClick={removeTotp} disabled={loading}>
            {loading ? "Desactivando..." : "Desactivar TOTP"}
          </button>
        </div>
      ) : !qr ? (
        <div className="space-y-4">
          <button className="btn" onClick={setupTotp} disabled={loading}>
            {loading ? "Generando..." : "Configurar verificación en dos pasos"}
          </button>
        </div>
      ) : (
        <div className="card p-4 space-y-4">
          <p>Escanea este código QR en tu app de autenticación (Google Authenticator, Authy, etc.).</p>
          {qr && <img src={qr} alt="QR Code" className="w-56 h-56 mx-auto" />}
          {secret && (
            <div className="text-center">
              <p className="text-sm text-gray-400">O ingresa este código manualmente:</p>
              <code className="bg-gray-100 p-2 rounded">{secret}</code>
            </div>
          )}
          <input
            className="input"
            placeholder="Código de 6 dígitos"
            value={token}
            onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
          />
          <button className="btn" onClick={verifyTotp} disabled={loading || token.length !== 6}>
            {loading ? "Verificando..." : "Verificar y activar"}
          </button>
        </div>
      )}
    </div>
  )
}