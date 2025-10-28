'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import toast from 'react-hot-toast'

import ConfirmModal from '@/components/ConfirmModal'
import LessonModal, { LessonForm } from '@/components/LessonModal'
import TutorProfileManagerModal from '@/components/TutorProfileManagerModal'

type Lesson = {
  id: string
  title: string
  body_md: string | null
  material_url: string | null
  sort_order: number
  video_url?: string | null
}

export default function EditCoursePage({ params }: { params: { id: string } }) {
  const courseId = params.id
  const [course, setCourse] = useState<any>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [videoUrl, setVideoUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [courseCompleted, setCourseCompleted] = useState<boolean>(false)

  // edición / modales
  const [editing, setEditing] = useState<Lesson | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false)

  // confirmación de borrado
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [toDelete, setToDelete] = useState<Lesson | null>(null)

  useEffect(() => { load() }, [])
  const load = async () => {
    const { data: c } = await supabase.from('courses').select('*').eq('id', courseId).single()
    setCourse(c)
    setVideoUrl(c?.video_url || '')
    setCourseCompleted(c?.is_completed || false) // ← Cargar estado de finalización
    const { data: l } = await supabase.from('lessons').select('*').eq('course_id', courseId).order('sort_order')
    setLessons((l || []) as any)
  }

  const saveVideo = async () => {
    const { error } = await supabase.from('courses').update({ video_url: videoUrl }).eq('id', courseId)
    if (error) toast.error(error.message); else toast.success('Video guardado')
  }

  // Función para marcar/desmarcar curso como finalizado
  const toggleCourseCompletion = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('courses')
        .update({ is_completed: !courseCompleted })
        .eq('id', courseId)

      if (error) {
        toast.error(error.message)
        return
      }

      setCourseCompleted(!courseCompleted)
      toast.success(!courseCompleted ?
        '✅ Curso marcado como finalizado' :
        '🔄 Curso reactivado'
      )
    } catch (error: any) {
      toast.error('Error: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  // CREAR (desde modal)
  const handleCreate = async (vals: LessonForm) => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { toast.error('Inicia sesión'); return }

      let material_url: string | null = null
      if (vals.file) {
        const safe = vals.file.name.replaceAll('/', '-').replaceAll('\\', '-')
        const path = `${user.id}/${courseId}/${crypto.randomUUID()}_${safe}`
        const up = await supabase.storage.from('materials')
          .upload(path, vals.file, { upsert: true, contentType: vals.file.type })
        if (up.error) { toast.error(up.error.message); return }
        material_url = path
      }

      const { error } = await supabase.rpc('create_lesson', {
        _course_id: courseId,
        _title: vals.title,
        _body: vals.body_md,
        _material_url: material_url,
        _sort: (lessons[lessons.length - 1]?.sort_order || 0) + 1,
        _video_url: vals.video_url || null
      })
      if (error) { toast.error(error.message); return }

      setCreateOpen(false)
      await load()
      toast.success('Lección creada')
    } finally {
      setSaving(false)
    }
  }

  // EDITAR (desde modal)
  const handleEdit = async (vals: LessonForm) => {
    if (!editing) return
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { toast.error('Inicia sesión'); return }

      let newMaterial = editing.material_url
      if (vals.file) {
        const safe = vals.file.name.replaceAll('/', '-').replaceAll('\\', '-')
        const p = `${user.id}/${courseId}/${crypto.randomUUID()}_${safe}`
        const up = await supabase.storage.from('materials')
          .upload(p, vals.file, { upsert: true, contentType: vals.file.type })
        if (up.error) { toast.error(up.error.message); return }
        if (editing.material_url) await supabase.storage.from('materials').remove([editing.material_url]).catch(() => { })
        newMaterial = p
      }

      const { error } = await supabase.rpc('update_lesson', {
        _lesson_id: editing.id,
        _title: vals.title,
        _body: vals.body_md,
        _material_url: newMaterial,
        _sort: editing.sort_order,
        _video_url: vals.video_url || null
      })
      if (error) { toast.error(error.message); return }

      setEditOpen(false); setEditing(null)
      await load()
      toast.success('Lección actualizada')
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (l: Lesson) => { setEditing(l); setEditOpen(true) }
  const askDelete = (l: Lesson) => { setToDelete(l); setConfirmOpen(true) }
  const doDelete = async () => {
    if (!toDelete) return
    setConfirmOpen(false)
    const l = toDelete
    setToDelete(null)
    const { error } = await supabase.rpc('delete_lesson', { _lesson_id: l.id })
    if (error) { toast.error(error.message); return }
    if (l.material_url) { await supabase.storage.from('materials').remove([l.material_url]).catch(() => { }) }
    await load()
    toast.success('Lección eliminada')
  }

  const signedUrl = async (path: string) => {
    const { data, error } = await supabase.storage.from('materials').createSignedUrl(path, 60 * 10)
    if (error) { toast.error(error.message); return }
    window.open(data.signedUrl, '_blank')
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-7xl mx-auto">
      {/* Header y navegación */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="space-y-2">
          <Link href="/dashboard/tutor"
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline text-sm sm:text-base">
            ← Volver al dashboard
          </Link>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
            Editar curso
          </h1>
        </div>
        
        {/* Botón para abrir el modal de perfil del tutor */}
          <button
            onClick={() => setShowProfileModal(true)}
            disabled={courseCompleted}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium text-sm sm:text-base transition-colors">
            🎭 Configurar Tutor IA
          </button>

        {/* Botón para marcar como finalizado */}
        <button
          onClick={toggleCourseCompletion}
          disabled={saving}
          className={`px-4 py-2 rounded-lg font-medium text-sm sm:text-base transition-colors ${courseCompleted
            ? 'bg-green-600 hover:bg-green-700 text-white'
            : 'bg-yellow-500 hover:bg-yellow-600 text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}>
          {saving ? 'Guardando...' :
            courseCompleted ? '✅ Curso Finalizado' : '🎯 Marcar como Finalizado'}
        </button>
      </div>

      {/* Información del curso */}
      {course && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl p-4 sm:p-6 space-y-3 sm:space-y-4">
          {/* Banner de estado del curso */}
          {courseCompleted && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="font-semibold text-green-800 dark:text-green-200 text-sm">
                    Curso Marcado como Finalizado
                  </h3>
                  <p className="text-green-600 dark:text-green-400 text-xs mt-1">
                    Los estudiantes pueden generar diplomas al completar todas las lecciones.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título</div>
              <div className="font-semibold text-lg sm:text-xl text-gray-900 dark:text-white break-words">
                {course.title}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</div>
              <div className="text-sm sm:text-base text-gray-600 dark:text-gray-400 break-words">
                {course.description}
              </div>
            </div>
          </div>

          {/* Estado del curso */}
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${courseCompleted ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {courseCompleted ? 'Curso finalizado' : 'Curso en desarrollo'}
              </span>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {lessons.length} lección{lessons.length !== 1 ? 'es' : ''}
            </span>
          </div>

          <div className="space-y-2 sm:space-y-3">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Video (YouTube embed)</div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <input
                className="input text-sm sm:text-base flex-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/embed/xxxxx"
              />
              <button
                className="btn text-sm sm:text-base px-4 py-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:text-white"
                onClick={saveVideo} disabled={courseCompleted}>
                Guardar video
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gestión de lecciones */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div>
            <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white">
              Lecciones del curso
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {courseCompleted ?
                'Curso finalizado - Los estudiantes pueden generar diplomas' :
                'Agrega y organiza las lecciones del curso'}
            </p>
          </div>
          <button
            className="btn text-sm sm:text-base px-4 py-2 w-full sm:w-auto dark:bg-blue-600 dark:hover:bg-blue-700 dark:text-white"
            onClick={() => setCreateOpen(true)} disabled={courseCompleted}>
            + Nueva lección
          </button>
        </div>

        {/* Mensaje cuando el curso está finalizado */}
        {courseCompleted && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="font-medium text-blue-800 dark:text-blue-200 text-sm">
                  Curso Finalizado
                </h4>
                <p className="text-blue-600 dark:text-blue-400 text-xs mt-1">
                  No puedes agregar nuevas lecciones. Si necesitas hacer cambios, primero reactiva el curso.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Lista de lecciones */}
        {lessons.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <div className="text-gray-400 dark:text-gray-500 text-sm sm:text-base">
              {courseCompleted ?
                'Este curso fue marcado como finalizado sin lecciones.' :
                'Aún no hay lecciones en este curso.'}
            </div>
            {!courseCompleted && (
              <button
                className="btn mt-4 text-sm sm:text-base px-4 py-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:text-white"
                onClick={() => setCreateOpen(true)}
              >
                Crear primera lección
              </button>
            )}
          </div>
        ) : (
          <ul className="space-y-3 sm:space-y-4">
            {lessons.map((l) => (
              <li
                key={l.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl p-3 sm:p-4 space-y-3 sm:space-y-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white break-words mb-1">
                      {l.title}
                    </div>
                    {l.material_url && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {l.material_url.split("/").at(-1)}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1 sm:gap-2 justify-start lg:justify-end">
                    {/* Deshabilitar botones de edición cuando el curso está finalizado */}
                    <button
                      className="btn text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={async () => {
                        const { error } = await supabase.rpc("move_lesson", {
                          _course_id: courseId,
                          _lesson_id: l.id,
                          _dir: "up",
                        })
                        if (error) toast.error(error.message)
                        else await load()
                      }}
                      disabled={courseCompleted}
                    >
                      ↑
                    </button>
                    <button
                      className="btn text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={async () => {
                        const { error } = await supabase.rpc("move_lesson", {
                          _course_id: courseId,
                          _lesson_id: l.id,
                          _dir: "down",
                        })
                        if (error) toast.error(error.message)
                        else await load()
                      }}
                      disabled={courseCompleted}
                    >
                      ↓
                    </button>
                    <button
                      className="btn text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => startEdit(l)}
                      disabled={courseCompleted}
                    >
                      Editar
                    </button>
                    <button
                      className="btn bg-red-500 hover:bg-red-600 text-white text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 dark:bg-red-600 dark:hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => askDelete(l)}
                      disabled={courseCompleted}
                    >
                      Borrar
                    </button>
                    <Link
                      className="btn no-underline text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white dark:border-gray-600"
                      href={`/course/${courseId}/lesson/${l.id}`}
                      target="_blank"
                    >
                      Ver
                    </Link>
                  </div>
                </div>

                {l.material_url && (
                  <button
                    className="btn text-xs sm:text-sm px-3 sm:px-4 py-1 sm:py-2 w-full sm:w-auto dark:bg-green-600 dark:hover:bg-green-700 dark:text-white"
                    onClick={() => signedUrl(l.material_url!)}
                  >
                    📎 Abrir material adjunto
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Modales */}
      <ConfirmModal
        open={confirmOpen}
        title="Eliminar lección"
        message={`¿Seguro que quieres eliminar "${toDelete?.title}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={doDelete}
        onCancel={() => setConfirmOpen(false)}
      />

      <LessonModal
        open={createOpen}
        mode="create"
        onCancel={() => setCreateOpen(false)}
        saving={saving}
        onSave={handleCreate}
      />

      <LessonModal
        open={editOpen}
        mode="edit"
        initial={{
          title: editing?.title,
          video_url: editing?.video_url || '',
          body_md: editing?.body_md || ''
        }}
        onCancel={() => { setEditOpen(false); setEditing(null) }}
        saving={saving}
        onSave={handleEdit}
      />

      {/* Modal del Tutor Profile Manager */}
      <TutorProfileManagerModal
        courseId={courseId}
        courseTitle={course?.title || ''}
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </div>
  )
}