'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import toast from 'react-hot-toast'

export default function EnrollButton({ courseId }: { courseId: string }) {
  const [loading, setLoading] = useState(false)

  const enroll = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = `/login?msg=student-required&next=/course/${courseId}`
        return
      }

      // (opcional) pre-check rápido: que exista (y publicado) para UX
      const pre = await supabase.from('courses')
        .select('id,is_published')
        .eq('id', courseId).maybeSingle()
      if (pre.error) { toast.error('No se pudo validar el curso.'); return }
      if (!pre.data) { toast.error('Este curso no está disponible.'); return }
      if (pre.data.is_published !== true) { toast.error('El curso aún no está publicado.'); return }

      const { error } = await supabase.rpc('enroll_course', { _course_id: courseId })
      if (error) {
        const msg = (error.message || '').toLowerCase()
        if (msg.includes('course_fk_missing')) toast.error('El curso ya no existe.')
        else if (msg.includes('must_be_student')) toast.error('Inicia sesión como estudiante.')
        else if (msg.includes('unauthorized')) {
          window.location.href = `/login?msg=student-required&next=/course/${courseId}`
        } else {
          toast.error(error.message)
        }
        return
      }

      toast.success('¡Inscripción realizada!')
      window.location.reload()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button className="btn" onClick={enroll} disabled={loading}>
      {loading ? 'Procesando…' : 'Inscribirme'}
    </button>
  )
}