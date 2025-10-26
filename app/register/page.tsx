'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function RegisterPage() {
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<'student' | 'tutor'>('student')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.replace('/dashboard')
    })
  }, [router])

  const onSignup = async () => {
    setErr('')
    setLoading(true)

    try {
      // Solo registro en Auth - el trigger creará el perfil automáticamente
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
        options: {
          data: {
            full_name: fullName,
            role: role
          }
        }
      })

      if (authError) {
        setErr(authError.message)
        return
      }

      if (!authData.user) {
        setErr('No se recibió datos del usuario creado')
        return
      }
      
      toast.success('✅ Cuenta creada exitosamente. Revisa tu correo para confirmar.')
      router.push('/login')

    } catch (error: any) {
      toast.error('Unexpected error:', error)
      setErr(`Error inesperado: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto space-y-3 p-4">
      <h1 className="text-2xl font-bold">Crear cuenta</h1>

      <div>
        <label className="label">Nombre completo</label>
        <input
          className="input w-full"
          value={fullName}
          onChange={e => setFullName(e.target.value)}
          placeholder="Tu nombre completo"
        />
      </div>

      <div>
        <div className="label">Rol</div>
        <div className="flex gap-6 items-center">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="role"
              checked={role === 'student'}
              onChange={() => setRole('student')}
            />
            Estudiante
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="role"
              checked={role === 'tutor'}
              onChange={() => setRole('tutor')}
            />
            Tutor
          </label>
        </div>
      </div>

      <div>
        <label className="label">Email</label>
        <input
          className="input w-full"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="tu@email.com"
          type="email"
        />
      </div>

      <div>
        <label className="label">Password</label>
        <input
          type="password"
          className="input w-full"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Mínimo 6 caracteres"
          minLength={6}
        />
      </div>

      {err && (
        <div className="text-red-400 text-sm bg-red-950 p-2 rounded">
          {err}
        </div>
      )}

      <div className="flex gap-2 pt-4">
        <button
          className="btn primary flex-1"
          onClick={onSignup}
          disabled={loading}
        >
          {loading ? 'Creando cuenta...' : 'Registrarme'}
        </button>
        <Link href="/login" className="btn secondary no-underline">
          Ya tengo cuenta
        </Link>
      </div>
    </div>
  )
}