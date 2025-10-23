'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

type Role = 'admin'|'tutor'|'student'

export default function RoleGate({
  allow,
  children
}: { allow: Role[]; children: React.ReactNode }) {
  const [ok, setOk] = useState<boolean | null>(null)
  const router = useRouter()

  useEffect(() => {
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (!profile?.role) { router.replace('/login'); return }
      setOk(allow.includes(profile.role as Role))
      if (!allow.includes(profile.role as Role)) {
        // Redirige al dashboard correcto
        if (profile.role === 'admin') router.replace('/dashboard/admin')
        else if (profile.role === 'tutor') router.replace('/dashboard/tutor')
        else router.replace('/dashboard/student')
      }
    }
    run()
  }, [router, allow])

  if (ok === null) return <div>Cargando...</div>
  return ok ? <>{children}</> : null
}