'use client'
import RoleGate from '@/components/RoleGate'
import { supabase } from '@/lib/supabaseClient'
import { useEffect, useState } from 'react'

export default function StudentPanel() {
  return (
    <RoleGate allow={['student', 'admin']}>
      <StudentBody />
    </RoleGate>
  )
}

function StudentBody() {
  const [enrolls, setEnrolls] = useState<any[]>([])
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('enrollments').select('*, courses(title)').eq('student_id', user.id).order('created_at', { ascending: false })
      setEnrolls(data || [])
    })()
  }, [])

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">Mis cursos</h1>

      {enrolls.length === 0 ? (
        <div className="card space-y-2">
          <div className="text-sm text-gray-300">
            Aún no estás inscrito en ningún curso.
          </div><br /> 
          <a href="/courses" className="btn no-underline">Explorar cursos</a> {/* 👈 CTA */}
        </div>
      ) : (
        enrolls.map((e: any) => (
          <div key={e.id} className="card">
            <div className="font-semibold">{e.courses?.title}</div>
            <div className="text-sm text-gray-400">{new Date(e.created_at).toLocaleString()}</div>
          </div>
        ))
      )}
    </div>
  )
}