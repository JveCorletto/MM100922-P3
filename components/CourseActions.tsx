'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabaseClient'
import EnrollButton from '@/components/EnrollButton'

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

      // 2) TOTP habilitado
      const { data: lf } = await supabase.auth.mfa.listFactors()
      const isTotpOn = !!lf?.all?.some((f) => f.factor_type === 'totp' && f.status === 'verified')
      setTotpEnabled(isTotpOn)

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

  if (loading) return null

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

  // 2 + 3) Tutor: no se inscribe; si es dueño, puede editar
  if (role === 'tutor') {
    return (
      <div className="flex gap-2">
        {isOwner && (
          <Link href={`/dashboard/tutor/course/${courseId}`} className="btn no-underline">
            Editar curso
          </Link>
        )}
        <Link href={`/chat/${courseId}`} className="btn no-underline">Ir al chat</Link>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {/* 1) Student inscrito → Continuar / Ver progreso */}
      {role === 'student' && enrolled ? (
        <>
          {nextLesson ? (
            <Link href={`/course/${courseId}/lesson/${nextLesson}`} className="btn no-underline">
              Continuar
            </Link>
          ) : (
            <Link href={`/course/${courseId}`} className="btn no-underline">
              Ver progreso
            </Link>
          )}
          <Link href={`/chat/${courseId}`} className="btn no-underline">Ir al chat</Link>
        </>
      ) : (
        <>
          {/* Student NO inscrito: exigir TOTP antes de permitir inscripción */}
          {role === 'student' && !totpEnabled ? (
            <div className="card text-sm text-yellow-300 space-y-2">
              <p>Para inscribirte en este curso, primero activa la autenticación en dos pasos (TOTP).</p>
              <Link href="/settings/security" className="btn no-underline">
                Activar autenticación TOTP
              </Link>
            </div>
          ) : (
            // visitante o student con TOTP → mostrar botón de inscribirse
            <>
              <EnrollButton courseId={courseId} />
              <Link href={`/chat/${courseId}`} className="btn no-underline">Ir al chat</Link>
            </>
          )}
        </>
      )}

      {/* 4) Admin: publicar/ocultar */}
      {role === 'admin' && (
        <button className="btn" onClick={togglePublish}>
          {pub ? 'Ocultar curso' : 'Publicar curso'}
        </button>
      )}
    </div>
  )
}