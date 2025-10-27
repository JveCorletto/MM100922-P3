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

  if (loading) return (
    <div className="flex justify-center items-center min-h-64">
      <div className="text-white text-lg">Cargando…</div>
    </div>
  )

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
        Mis cursos
      </h1>

      {rows.length === 0 ? (
        <div className="bg-gray-800 rounded-lg sm:rounded-xl p-6 sm:p-8 shadow-lg space-y-4 text-center">
          <div className="text-gray-300 text-base sm:text-lg">
            Aún no estás inscrito en ningún curso.
          </div>
          <Link 
            href="/courses" 
            className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 no-underline text-sm sm:text-base"
          >
            Explorar cursos
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {rows.map((r) => {
            const pct = r.total > 0 ? Math.round((r.completed / r.total) * 100) : 0
            const isDone = r.total > 0 && r.completed >= r.total
            return (
              <div 
                key={r.course_id} 
                className="bg-gray-800 rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-lg space-y-4 border border-gray-700 hover:border-gray-600 transition-colors duration-200"
              >
                {/* Header con título y botón */}
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-white text-lg sm:text-xl line-clamp-2 flex-1">
                    {r.title}
                  </h3>
                  <Link 
                    href={`/course/${r.course_id}`} 
                    className="flex-shrink-0 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors duration-200 no-underline whitespace-nowrap"
                  >
                    Ver curso
                  </Link>
                </div>

                {/* Progreso */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-300">Progreso:</span>
                    <span className="text-white font-medium">
                      {r.completed}/{r.total} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-gray-700 overflow-hidden">
                    <div
                      className="h-3 bg-blue-600 transition-all duration-300"
                      style={{ width: `${pct}%` }}
                      aria-label={`Progreso ${pct}%`}
                    />
                  </div>
                </div>

                {/* Acción principal */}
                <div className="flex gap-2">
                  {isDone ? (
                    <Link 
                      className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white text-center font-medium rounded-lg transition-colors duration-200 no-underline text-sm sm:text-base"
                      href={`/course/${r.course_id}`}
                    >
                      Revisar contenido
                    </Link>
                  ) : r.next_lesson_id ? (
                    <Link
                      className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white text-center font-medium rounded-lg transition-colors duration-200 no-underline text-sm sm:text-base"
                      href={`/course/${r.course_id}/lesson/${r.next_lesson_id}`}
                    >
                      Continuar
                    </Link>
                  ) : (
                    <Link 
                      className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white text-center font-medium rounded-lg transition-colors duration-200 no-underline text-sm sm:text-base"
                      href={`/course/${r.course_id}`}
                    >
                      Empezar
                    </Link>
                  )}
                </div>

                {/* Fecha de inscripción */}
                <div className="text-xs text-gray-400 border-t border-gray-700 pt-3">
                  Inscrito el {new Date(r.enrolled_at).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}