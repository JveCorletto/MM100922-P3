'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabaseClient'
import EnrollButton from '@/components/EnrollButton'
import TotpModal from './TotpModal'

interface CourseActionsProps {
  courseId: string
  tutorId: string
  isPublished: boolean
  courseName: string
  isCourseCompleted: boolean
  completedLessonsCount: number
  totalLessonsCount: number
}

export default function CourseActions({ courseId, tutorId, isPublished, courseName, isCourseCompleted,
  completedLessonsCount, totalLessonsCount }: CourseActionsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')

  const [role, setRole] = useState<'student' | 'tutor' | 'admin' | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [enrolled, setEnrolled] = useState<boolean>(false)
  const [nextLesson, setNextLesson] = useState<string | null>(null)
  const [pub, setPub] = useState<boolean>(isPublished)
  const [totpEnabled, setTotpEnabled] = useState<boolean>(false)
  const [loading, setLoading] = useState(true)
  const [showTotpModal, setShowTotpModal] = useState(false)
  const [factorId, setFactorId] = useState<string | null>(null)

  // Estados locales para el progreso
  const [actualCompletedLessons, setActualCompletedLessons] = useState(0)
  const [actualIsCourseCompleted, setActualIsCourseCompleted] = useState(false)

  const isOwner = userId && userId === tutorId

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false);
        return
      }
      setUserId(user.id)

      // 1) rol
      const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      const r = (prof?.role as any) ?? null
      setRole(r)

      // 2) TOTP habilitado
      const { data: lf } = await supabase.auth.mfa.listFactors()
      const verifiedTotp = lf?.totp?.find((f: any) => f?.status?.toLowerCase() === 'verified')
      const isTotpOn = !!verifiedTotp
      setTotpEnabled(isTotpOn)
      setFactorId(verifiedTotp?.id || null)

      // 3) Inscripción (para student/admin)
      if (r === 'student' || r === 'admin') {
        const { data: enr } = await supabase
          .from('enrollments')
          .select('id').eq('course_id', courseId).eq('student_id', user.id).maybeSingle()
        setEnrolled(!!enr)

        // 4) Calcular progreso REAL
        if (enr) {
          console.log('🔄 CourseActions - Calculando progreso...')

          // Obtener todas las lecciones del curso
          const { data: lessons } = await supabase
            .from('lessons')
            .select('id, title')
            .eq('course_id', courseId)
            .order('sort_order')

          if (lessons && lessons.length > 0) {
            // Obtener lecciones completadas por el usuario
            const { data: completedLessons, error: completionsError } = await supabase
              .from('lesson_completions')
              .select('lesson_id')
              .eq('student_id', user.id)

            if (!completionsError && completedLessons) {
              // Filtrar solo las lecciones completadas que pertenecen a este curso
              const completedInThisCourse = completedLessons?.filter(cl =>
                lessons.some(lesson => lesson.id === cl.lesson_id)
              ) || []

              const completedCount = completedInThisCourse.length
              setActualCompletedLessons(completedCount)
              setActualIsCourseCompleted(completedCount === lessons.length)

              // 5) Encontrar siguiente lección pendiente
              if (completedCount < lessons.length) {
                const completedLessonIds = new Set(completedLessons.map(cl => cl.lesson_id))
                const nextUncompletedLesson = lessons.find(lesson => !completedLessonIds.has(lesson.id))
                setNextLesson(nextUncompletedLesson?.id || null)
              } else {
                setNextLesson(null)
              }
            }
          }

          // siguiente lección pendiente (backup con RPC si existe)
          try {
            const { data: rows } = await supabase.rpc('course_progress_for_student', { _student: user.id })
            const row = (rows || []).find((x: any) => x.course_id === courseId)
            if (row && !nextLesson) {
              setNextLesson(row?.next_lesson_id ?? null)
            }
          } catch (error) {
            // RPC no disponible, usar cálculo local
          }
        }
      }

      setLoading(false)
    })()
  }, [courseId, tutorId])

  const handleTotpStateChange = (state: { hasTotp: boolean; factorId: string | null }) => {
    setTotpEnabled(state.hasTotp)
    setFactorId(state.factorId)
  }

  const handleDownloadCertificate = async () => {
    if (!actualIsCourseCompleted) return

    setIsLoading(true)
    setMessage('')

    try {
      // Obtener el token del localStorage directamente
      const token = localStorage.getItem('sb-veplyttqepkyyxocnccf-auth-token')
      if (!token) {
        throw new Error('No se encontró token de autenticación')
      }

      const tokenData = JSON.parse(token)
      const accessToken = tokenData.access_token

      if (!accessToken) {
        throw new Error('Token de acceso no válido')
      }

      // Obtener el perfil del usuario para conseguir su nombre
      const { data: { user } } = await supabase.auth.getUser()
      let studentName = ''

      if (user) {
        // Intentar obtener el nombre del perfil
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single()

        studentName = profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || ''
      }

      // Llamar a la API para generar el diploma - ENDPOINT CORRECTO
      const response = await fetch('/api/certificates-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          courseId,
          studentName: studentName // ← Nombre real del usuario
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Error ${response.status}`)
      }

      // Descargar el PDF
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Diploma-${courseName.replace(/\s+/g, '-')}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      toast.success('Diploma descargado exitosamente')

    } catch (error) {
      console.error('Error downloading certificate:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error al descargar el diploma'
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  if (loading) return (
    <div className="flex justify-center py-3 sm:py-4">
      <div className="text-sm text-gray-500 dark:text-gray-400">Cargando...</div>
    </div>
  )

  // ADMIN: toggle publicar/ocultar
  const togglePublish = async () => {
    const { error } = await supabase.from('courses')
      .update({ is_published: !pub })
      .eq('id', courseId)
    if (error) { toast.error(error.message); return }
    setPub(!pub)
    toast.success(!pub ? 'Curso publicado' : 'Curso ocultado')
  }

  // Usar los estados locales calculados en lugar de los props
  const displayCompletedLessons = actualCompletedLessons > 0 ? actualCompletedLessons : completedLessonsCount
  const displayIsCourseCompleted = actualIsCourseCompleted || isCourseCompleted

  // ---- Render rules ----
  // Tutor: no se inscribe; si es dueño, puede editar
  if (role === 'tutor') {
    return (
      <div className="space-y-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start sm:items-center gap-2 sm:gap-3">
              <svg className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5 sm:mt-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">Eres el tutor de este curso</h3>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Puedes editar el contenido y gestionar estudiantes</p>
              </div>
            </div>
            <div className="flex flex-col xs:flex-row gap-2 sm:gap-3 self-stretch sm:self-auto">
              {isOwner && (
                <Link
                  href={`/dashboard/tutor/course/${courseId}`}
                  className="btn btn-outline btn-sm no-underline text-center px-3 py-2 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Editar curso
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Student inscrito → Continuar / Ver progreso + Diploma si está completado
  if (role === 'student' && enrolled) {
    return (
      <div className="space-y-4">
        {/* Progreso del curso */}
        <div className="bg-gray-700 p-4 rounded-lg">
          <h4 className="text-white font-medium mb-2">Tu Progreso</h4>
          <div className="w-full bg-gray-600 rounded-full h-2.5 mb-2">
            <div
              className="bg-green-500 h-2.5 rounded-full transition-all duration-300"
              style={{
                width: `${totalLessonsCount > 0 ? (displayCompletedLessons / totalLessonsCount) * 100 : 0}%`
              }}
            ></div>
          </div>
          <p className="text-sm text-gray-300">
            {displayCompletedLessons} de {totalLessonsCount} lecciones completadas
            {displayIsCourseCompleted && ' - ¡Curso Completado! 🎉'}
          </p>
        </div>

        {/* Botón de descarga de diploma */}
        {displayIsCourseCompleted && (
          <div className="bg-green-900/20 border border-green-500 p-4 rounded-lg">
            <h4 className="text-green-400 font-medium mb-2">¡Felicidades!</h4>
            <p className="text-green-300 text-sm mb-3">
              Has completado exitosamente este curso. Descarga tu diploma de certificación.
            </p>
            <button
              onClick={handleDownloadCertificate}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Generando Diploma...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Descargar Diploma
                </>
              )}
            </button>
            {message && (
              <p className={`text-sm mt-2 ${message.includes('Error') ? 'text-red-400' : 'text-green-400'}`}>
                {message}
              </p>
            )}
          </div>
        )}

        {/* Estado de inscripción y botón para continuar */}
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start sm:items-center gap-2 sm:gap-3">
              <svg className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 dark:text-green-400 flex-shrink-0 mt-0.5 sm:mt-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-green-800 dark:text-green-200">Ya estás inscrito en este curso</h3>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">Puedes comenzar con las lecciones o continuar donde te quedaste</p>
              </div>
            </div>
            <div className="flex gap-2 self-stretch sm:self-auto">
              {nextLesson ? (
                <Link
                  href={`/course/${courseId}/lesson/${nextLesson}`}
                  className="btn btn-primary btn-sm no-underline text-center px-4 py-2 flex-1 sm:flex-none dark:bg-blue-600 dark:hover:bg-blue-700 dark:text-white"
                >
                  Continuar
                </Link>
              ) : (
                <Link
                  href={`/course/${courseId}`}
                  className="btn btn-primary btn-sm no-underline text-center px-4 py-2 flex-1 sm:flex-none dark:bg-blue-600 dark:hover:bg-blue-700 dark:text-white"
                >
                  Ver progreso
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Student NO inscrito: exigir TOTP antes de permitir inscripción */}
      {role === 'student' && !totpEnabled ? (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-5">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <svg className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500 dark:text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Autenticación de dos factores requerida
              </h3>
              <div className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                <p className="break-words">
                  Para inscribirte en este curso, debes activar la autenticación de dos factores (TOTP).
                  Esto protege tu cuenta y el contenido educativo.
                </p>
              </div>
              <div className="mt-3 flex flex-col xs:flex-row gap-2">
                <button
                  className="btn btn-primary btn-sm px-3 py-2 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:text-white"
                  onClick={() => setShowTotpModal(true)}
                >
                  Activar TOTP
                </button>
                <Link
                  href="/settings/security"
                  className="btn btn-outline btn-sm no-underline text-center px-3 py-2 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Configurar en Ajustes
                </Link>
              </div>
            </div>
          </div>

          <TotpModal
            open={showTotpModal}
            onClose={() => setShowTotpModal(false)}
            hasTotp={totpEnabled}
            factorId={factorId}
            onTotpStateChange={handleTotpStateChange}
          />
        </div>
      ) : (
        // Visitante o student con TOTP → mostrar botón de inscribirse
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">¿Te interesa este curso?</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {role === 'student' ? 'Inscríbete para comenzar a aprender' : 'Inicia sesión para inscribirte'}
              </p>
            </div>
            <div className="flex gap-2 self-stretch sm:self-auto">
              <EnrollButton courseId={courseId} />
            </div>
          </div>
        </div>
      )}

      {/* Admin: publicar/ocultar */}
      {role === 'admin' && (
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-5">
          <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <svg className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500 dark:text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-sm font-medium text-purple-800 dark:text-purple-200">Acciones de Administrador</span>
            </div>
            <button
              className="btn btn-sm px-3 py-2 text-center xs:self-start sm:self-auto dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white dark:border-gray-600"
              onClick={togglePublish}
            >
              {pub ? 'Ocultar curso' : 'Publicar curso'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}