'use client'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function DashboardIndex(){
  const router = useRouter()
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if(!user){ router.replace('/login'); return }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      const role = profile?.role || 'student'
      if (role === 'admin') router.replace('/dashboard/admin')
      else if (role === 'tutor') router.replace('/dashboard/tutor')
      else router.replace('/dashboard/student')
    })()
  }, [router])
  return <div>Cargando dashboard…</div>
}