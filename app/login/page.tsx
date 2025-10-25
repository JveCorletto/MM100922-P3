"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"

type Mode = "password" | "link_sent"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [mode, setMode] = useState<Mode>("password")
  const [err, setErr] = useState("")
  const [info, setInfo] = useState("")
  const [busy, setBusy] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  const router = useRouter()
  const params = useSearchParams()
  const next = params.get("next") || "/dashboard"
  const msg = params.get("msg")

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.replace("/dashboard")
    })
  }, [router])

  useEffect(() => {
    if (!cooldown) return
    const t = setInterval(() => setCooldown(c => Math.max(0, c - 1)), 1000)
    return () => clearInterval(t)
  }, [cooldown])

  const onLoginPassword = async () => {
    setErr(""); setInfo(""); setBusy(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setErr(error.message); return }
      router.push(next)
    } finally { setBusy(false) }
  }

  const sendMagicLink = async () => {
    if (!email) { setErr("Escribe tu email."); return }
    setErr(""); setInfo(""); setBusy(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
          // Opcional: redirige al volver del link
          emailRedirectTo: `${window.location.origin}${next.startsWith("/") ? next : "/dashboard"}`
        }
      })
      if (error) { setErr(error.message); return }
      setMode("link_sent")
      setInfo("Te enviamos un enlace para iniciar sesión. Revisa tu correo y haz clic en el link.")
      setCooldown(60)
    } finally { setBusy(false) }
  }

  const resend = async () => {
    if (cooldown > 0) return
    await sendMagicLink()
  }

  const backToPassword = () => {
    setMode("password")
    setInfo(""); setErr("")
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="max-w-md w-full space-y-3">
        <h1 className="text-2xl font-bold">Iniciar sesión</h1>

        {msg === "student-required" && (
          <div className="text-yellow-400 text-sm">
            Debes iniciar sesión como <b>estudiante</b> para inscribirte en el curso.
          </div>
        )}

        {/* Email */}
        <label className="label">Email</label>
        <input
          className="input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="tucorreo@ejemplo.com"
        />

        {mode === "password" ? (
          <>
            <label className="label">Password</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
            />

            {err && <div className="text-red-400 text-sm">{err}</div>}
            {info && <div className="text-green-400 text-sm">{info}</div>}

            <div className="flex flex-col gap-2">
              <button className="btn" onClick={onLoginPassword} disabled={busy}>
                {busy ? "Entrando…" : "Entrar"}
              </button>

              <button className="btn" type="button" onClick={sendMagicLink} disabled={busy || !email}>
                {busy ? "Enviando…" : "Enviar enlace de acceso al correo"}
              </button>

              <Link href="/register" className="text-blue-500 hover:text-blue-700 hover:underline no-underline">
                ¿No tienes una cuenta? Regístrate
              </Link>
            </div>
          </>
        ) : (
          <>
            {err && <div className="text-red-400 text-sm">{err}</div>}
            {info && <div className="text-green-400 text-sm">{info}</div>}

            <div className="flex flex-col gap-2">
              <button className="btn" type="button" onClick={resend} disabled={busy || cooldown > 0}>
                {cooldown > 0 ? `Reenviar enlace en ${cooldown}s` : "Reenviar enlace"}
              </button>

              <button className="btn" type="button" onClick={backToPassword}>
                Usar contraseña
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}