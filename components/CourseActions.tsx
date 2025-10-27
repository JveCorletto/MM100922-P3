'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabaseClient'
import EnrollButton from '@/components/EnrollButton'
import TotpModal from './TotpModal'

type Props = {
  courseId: string
  tutorId: string
  isPublished: boolean
}

export default function CourseActions({ courseId, tutorId, isPublished }: Props) {
  const [role, setRole] = useState<'student' | 'tutor' | 'admin' | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [enrolled, setEnrolled] = useState<boolean>(false)
  const [nextLesson, setNextLesson] = useState<string | null>(null)
  const [pub, setPub] = useState<boolean>(isPublished)
  const [totpEnabled, setTotpEnabled] = useState<boolean>(false)
  const [loading, setLoading] = useState(true)
  const [showTotpModal, setShowTotpModal] = useState(false)
  const [factorId, setFactorId] = useState<string | null>(null)

  const isOwner = userId && userId === tutorId

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      setUserId(user.id)

      // 1) rol
      const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      const r = (prof?.role as any) ?? null
      setRole(r)

      // 2) TOTP habilitado - versión mejorada
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

        // siguiente lección pendiente (CTA "Continuar")
        const { data: rows } = await supabase.rpc('course_progress_for_student', { _student: user.id })
        const row = (rows || []).find((x: any) => x.course_id === courseId)
        setNextLesson(row?.next_lesson_id ?? null)
      }

      setLoading(false)
    })()
  }, [courseId, tutorId])

  const handleTotpStateChange = (state: { hasTotp: boolean; factorId: string | null }) => {
    setTotpEnabled(state.hasTotp)
    setFactorId(state.factorId)
  }

  if (loading) return (
    <div className="flex justify-center py-4">
      <div className="text-sm text-gray-500">Cargando...</div>
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

  // ---- Render rules ----

  // Tutor: no se inscribe; si es dueño, puede editar
  if (role === 'tutor') {
    return (
      <div className="card bg-blue-50 border border-blue-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-white">Eres el tutor de este curso</h3>
              <p className="text-xs text-blue-600">Puedes editar el contenido y gestionar estudiantes</p>
            </div>
          </div>
          <div className="flex gap-2">
            {isOwner && (
              <Link href={`/dashboard/tutor/course/${courseId}`} className="btn btn-outline btn-sm no-underline">
                Editar curso
              </Link>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Student inscrito → Continuar / Ver progreso
  if (role === 'student' && enrolled) {
    return (
      <div className="card bg-green-50 border border-green-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-green-800">Ya estás inscrito en este curso</h3>
              <p className="text-xs text-green-600">Puedes comenzar con las lecciones o continuar donde te quedaste</p>
            </div>
          </div>
          <div className="flex gap-2">
            {nextLesson ? (
              <Link href={`/course/${courseId}/lesson/${nextLesson}`} className="btn btn-primary btn-sm no-underline">
                Continuar
              </Link>
            ) : (
              <Link href={`/course/${courseId}`} className="btn btn-primary btn-sm no-underline">
                Ver progreso
              </Link>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Student NO inscrito: exigir TOTP antes de permitir inscripción */}
      {role === 'student' && !totpEnabled ? (
        <div className="card bg-yellow-50 border border-yellow-200">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-1">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-yellow-800">
                Autenticación de dos factores requerida
              </h3>
              <div className="mt-1 text-sm text-yellow-700">
                <p>
                  Para inscribirte en este curso, debes activar la autenticación de dos factores (TOTP). 
                  Esto protege tu cuenta y el contenido educativo.
                </p>
              </div>
              <div className="mt-3 flex gap-2">
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowTotpModal(true)}
                >
                  Activar TOTP
                </button>
                <Link href="/settings/security" className="btn btn-outline btn-sm no-underline">
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
        <div className="card">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-sm font-medium text-white-900">¿Te interesa este curso?</h3>
              <p className="text-xs text-white-600">
                {role === 'student' ? 'Inscríbete para comenzar a aprender' : 'Inicia sesión para inscribirte'}
              </p>
            </div>
            <div className="flex gap-2">
              <EnrollButton courseId={courseId} />
            </div>
          </div>
        </div>
      )}

      {/* Admin: publicar/ocultar */}
      {role === 'admin' && (
        <div className="card bg-purple-50 border border-purple-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-sm font-medium text-purple-800">Acciones de Administrador</span>
            </div>
            <button className="btn btn-sm" onClick={togglePublish}>
              {pub ? 'Ocultar curso' : 'Publicar curso'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}