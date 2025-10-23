
'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

export default function Protected({ children }: { children: React.ReactNode }){
  const [ok, setOk] = useState<boolean | null>(null)
  useEffect(() => {
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setOk(!!user)
    }; run()
  }, [])
  if (ok === null) return <div>Cargando...</div>
  if (!ok) return <div className="card">Necesitas <Link href="/login">iniciar sesión</Link>.</div>
  return <>{children}</>
}
