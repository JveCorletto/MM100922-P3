'use client'
import RoleGate from '@/components/RoleGate'
import { supabase } from '@/lib/supabaseClient'
import { useEffect, useState } from 'react'
import Link from 'next/link'

type ProgressRow = {
  course_id: string
  title: string
  enrolled_at: string
  total: number
  completed: number
  next_lesson_id: string | null
}

export default function StudentPanel() {
  return (
    <RoleGate allow={['student', 'admin']}>
      <StudentBody />
    </RoleGate>
  )
}

function StudentBody() {
  const [rows, setRows] = useState<ProgressRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data, error } = await supabase.rpc('course_progress_for_student', { _student: user.id })
      if (error) { console.error(error); setRows([]); setLoading(false); return }
      setRows(data || [])
      setLoading(false)
    })()
  }, [])

  if (loading) return <div>Cargando…</div>

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">Mis cursos</h1>

      {rows.length === 0 ? (
        <div className="card space-y-2">
          <div className="text-sm text-gray-300">
            Aún no estás inscrito en ningún curso.
          </div><br/>
          <Link href="/courses" className="btn no-underline">Explorar cursos</Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {rows.map((r) => {
            const pct = r.total > 0 ? Math.round((r.completed / r.total) * 100) : 0
            const isDone = r.total > 0 && r.completed >= r.total
            return (
              <div key={r.course_id} className="card space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold">{r.title}</div>
                  <Link href={`/course/${r.course_id}`} className="btn no-underline">Ver curso</Link>
                </div>

                {/* Progreso */}
                <div className="text-sm">
                  Progreso: {r.completed}/{r.total} ({pct}%)
                </div>
                <div className="w-full h-2 rounded bg-[#1a2234] overflow-hidden">
                  <div
                    className="h-2 bg-[#4f90ff]"
                    style={{ width: `${pct}%` }}
                    aria-label={`Progreso ${pct}%`}
                  />
                </div>

                {/* Acción principal */}
                <div className="flex gap-2">
                  {isDone ? (
                    <Link className="btn no-underline" href={`/course/${r.course_id}`}>
                      Revisar contenido
                    </Link>
                  ) : r.next_lesson_id ? (
                    <Link
                      className="btn no-underline"
                      href={`/course/${r.course_id}/lesson/${r.next_lesson_id}`}
                    >
                      Continuar
                    </Link>
                  ) : (
                    <Link className="btn no-underline" href={`/course/${r.course_id}`}>
                      Empezar
                    </Link>
                  )}
                </div>

                <div className="text-xs text-gray-400">
                  Inscrito el {new Date(r.enrolled_at).toLocaleString()}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}