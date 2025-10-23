'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage(){
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string>('')
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next') || '/dashboard'
  const msg = params.get('msg') // e.g. "student-required"

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.replace('/dashboard')
    })
  }, [router])

  const onLogin = async () => {
    setErr('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if(error){ setErr(error.message); return }
    router.push(next)
  }

  return (
    <div className="max-w-md mx-auto space-y-3">
      <h1 className="text-2xl font-bold">Iniciar sesión</h1>
      {msg === 'student-required' && <div className="text-yellow-400 text-sm">
        Debes iniciar sesión como <b>estudiante</b> para inscribirte en el curso.
      </div>}
      <label className="label">Email</label>
      <input className="input" value={email} onChange={e=>setEmail(e.target.value)} />
      <label className="label">Password</label>
      <input type="password" className="input" value={password} onChange={e=>setPassword(e.target.value)} />
      {err && <div className="text-red-400 text-sm">{err}</div>}
      <div className="flex gap-2">
        <button className="btn" onClick={onLogin}>Entrar</button>
        <Link href="/register" className="btn no-underline">Crear cuenta</Link>
      </div>
    </div>
  )
}