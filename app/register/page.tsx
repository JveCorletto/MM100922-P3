'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage(){
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<'student'|'tutor'>('student')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string>('')
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.replace('/dashboard')
    })
  }, [router])

  const onSignup = async () => {
    setErr('')
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName, role } }
    })
    if(error){ setErr(error.message); return }

    const { data: { user } } = await supabase.auth.getUser()
    if (user) await supabase.from('profiles').upsert({ id: user.id, full_name: fullName, role })

    alert('Cuenta creada. Revisa tu correo para confirmar.')
    router.push('/login')
  }

  return (
    <div className="max-w-md mx-auto space-y-3">
      <h1 className="text-2xl font-bold">Crear cuenta</h1>
      <label className="label">Nombre completo</label>
      <input className="input" value={fullName} onChange={e=>setFullName(e.target.value)} />
      <div className="label">Rol</div>
      <div className="flex gap-6 items-center">
        <label className="flex items-center gap-2">
          <input type="radio" name="role" checked={role==='student'} onChange={()=>setRole('student')} /> Estudiante
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="role" checked={role==='tutor'} onChange={()=>setRole('tutor')} /> Tutor
        </label>
      </div>
      <label className="label">Email</label>
      <input className="input" value={email} onChange={e=>setEmail(e.target.value)} />
      <label className="label">Password</label>
      <input type="password" className="input" value={password} onChange={e=>setPassword(e.target.value)} />
      {err && <div className="text-red-400 text-sm">{err}</div>}
      <div className="flex gap-2">
        <button className="btn" onClick={onSignup}>Registrarme</button>
        <Link href="/login" className="btn no-underline">Ya tengo cuenta</Link>
      </div>
    </div>
  )
}