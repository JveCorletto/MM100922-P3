'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import toast from 'react-hot-toast'
import ReactMarkdown from 'react-markdown'

import ConfirmModal from '@/components/ConfirmModal'
import LessonModal, { LessonForm } from '@/components/LessonModal'

type Lesson = { id: string; title: string; body_md: string | null; material_url: string | null; sort_order: number; video_url?: string | null }

export default function EditCoursePage({ params }: { params: { id: string } }) {
  const courseId = params.id
  const [course, setCourse] = useState<any>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [videoUrl, setVideoUrl] = useState('')
  const [videoLesson, setVideoLesson] = useState('')
  const [saving, setSaving] = useState(false)

  // edición
  const [editing, setEditing] = useState<Lesson | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editBody, setEditBody] = useState('')
  const [editVideo, setEditVideo] = useState('')
  const [editFile, setEditFile] = useState<File | null>(null)
  const [removeMaterial, setRemoveMaterial] = useState(false)

  // confirmación de borrado
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [toDelete, setToDelete] = useState<Lesson | null>(null)

  // Estados de la Modal
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  useEffect(() => { load() }, [])
  const load = async () => {
    const { data: c } = await supabase.from('courses').select('*').eq('id', courseId).single()
    setCourse(c)
    setVideoUrl(c?.video_url || '')
    const { data: l } = await supabase.from('lessons').select('*').eq('course_id', courseId).order('sort_order')
    setLessons((l || []) as any)
  }

  const saveVideo = async () => {
    const { error } = await supabase.from('courses').update({ video_url: videoUrl }).eq('id', courseId)
    if (error) toast.error(error.message); else toast.success('Video guardado')
  }

  // CREAR
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

  // EDITAR
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

  const startEdit = (l: Lesson) => {
    setEditing(l)
    setEditOpen(true)
  }

  const saveEdit = async () => {
    if (!editing) return
    const lessonId = editing.id
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { toast.error('Inicia sesión'); return }

      let newMaterial = removeMaterial ? null : editing.material_url
      if (editFile) {
        const safeName = editFile.name.replaceAll('/', '-').replaceAll('\\', '-')
        const p = `${user.id}/${courseId}/${crypto.randomUUID()}_${safeName}`
        const up = await supabase.storage.from('materials').upload(p, editFile, { upsert: true, contentType: editFile.type })
        if (up.error) { toast.error(up.error.message); return }
        // borro el anterior si existía (ignorar error si no se puede)
        if (editing.material_url) {
          await supabase.storage.from('materials').remove([editing.material_url]).catch(() => { })
        }
        newMaterial = p
      }

      const { error } = await supabase.rpc('update_lesson', {
        _lesson_id: lessonId,
        _title: editTitle,
        _body: editBody,
        _material_url: newMaterial,
        _sort: editing.sort_order,
        _video_url: editVideo || null
      })
      if (error) { toast.error(error.message); return }
      setEditing(null)
      await load()
      toast.success('Lección actualizada')
    } catch (e: any) {
      toast.error(e?.message || 'Error al actualizar')
    }
  }

  const askDelete = (l: Lesson) => { setToDelete(l); setConfirmOpen(true) }
  const doDelete = async () => {
    if (!toDelete) return
    setConfirmOpen(false)
    const l = toDelete
    setToDelete(null)
    const { error } = await supabase.rpc('delete_lesson', { _lesson_id: l.id })
    if (error) { toast.error(error.message); return }
    // eliminar material del storage si existía (best effort)
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
    <div className="space-y-4">
      <Link href="/dashboard/tutor" className="underline">← Volver</Link>
      <h1 className="text-2xl font-bold">Editar curso</h1>

      {course && <div className="card space-y-2">
        <div className="text-sm opacity-80">Título</div>
        <div className="font-semibold">{course.title}</div>
        <div className="text-sm opacity-80">Descripción</div>
        <div>{course.description}</div>
        <div className="space-y-2">
          <div className="text-sm opacity-80">Video (YouTube embed)</div>
          <input className="input" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="https://www.youtube.com/embed/xxxxx" />
          <button className="btn" onClick={saveVideo}>Guardar video</button>
        </div>
      </div>}

      {/* NUEVA LECCIÓN */}
      <div className="card space-y-2">
        <h3 className="text-xl font-semibold">Lecciones</h3>
        <button className="btn" onClick={() => setCreateOpen(true)}>+ Nueva lección</button>
      </div>

      {/* LISTA DE LECCIONES */}
      <div className="card space-y-3">
        <h3 className="text-xl font-semibold">Lecciones</h3>
        {lessons.length === 0 && <div className="text-sm text-gray-300">Aún no hay lecciones.</div>}
        <ul className="space-y-2">
          {lessons.map((l) => (
            <li key={l.id} className="border border-[#233] rounded-md p-3 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold">{l.title}</div>
                <div className="flex gap-2">
                  <button className="btn" onClick={async () => {
                    const { error } = await supabase.rpc('move_lesson', { _course_id: courseId, _lesson_id: l.id, _dir: 'up' })
                    if (error) toast.error(error.message); else { await load(); }
                  }}>↑</button>
                  <button className="btn" onClick={async () => {
                    const { error } = await supabase.rpc('move_lesson', { _course_id: courseId, _lesson_id: l.id, _dir: 'down' })
                    if (error) toast.error(error.message); else { await load(); }
                  }}>↓</button>
                  <button className="btn" onClick={() => startEdit(l)}>Editar</button>
                  <Link className="btn no-underline" href={`/course/${courseId}/lesson/${l.id}`} target="_blank">Ver como alumno</Link>
                  <button className="btn" onClick={() => askDelete(l)}>Borrar</button>
                </div>
              </div>
              {l.material_url && <div className="text-xs opacity-70">{l.material_url.split('/').at(-1)}</div>}
              {l.material_url && (<button className="btn" onClick={() => signedUrl(l.material_url!)}>Abrir material</button>)}
            </li>
          ))}
        </ul>
      </div>

      {/* CONFIRMAR BORRADO */}
      <ConfirmModal
        open={confirmOpen}
        title="Eliminar lección"
        message={`¿Seguro que quieres eliminar "${toDelete?.title}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={doDelete}
        onCancel={() => setConfirmOpen(false)}
      />

      {/* MODAL CREAR */}
      <LessonModal
        open={createOpen}
        mode="create"
        onCancel={() => setCreateOpen(false)}
        saving={saving}
        onSave={handleCreate}
      />

      {/* MODAL EDITAR */}
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
    </div>
  )
}