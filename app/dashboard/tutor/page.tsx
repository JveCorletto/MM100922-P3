'use client'
import RoleGate from '@/components/RoleGate'
import { supabase } from '@/lib/supabaseClient'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function TutorPanel(){
  return (
    <RoleGate allow={['tutor','admin']}>
      <TutorBody />
    </RoleGate>
  )
}

function TutorBody(){
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [courses, setCourses] = useState<any[]>([])
  useEffect(()=>{ load() },[])
  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if(!user) return
    const { data } = await supabase.from('courses').select('*').eq('tutor_id', user.id).order('created_at', { ascending:false })
    setCourses(data||[])
  }
  const createCourse = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if(!user) return
    const { error } = await supabase.from('courses').insert({ title, description, video_url: '', is_published:false, tutor_id: user.id })
    if(error) { alert(error.message); return }
    setTitle(''); setDescription(''); await load()
  }
  const publish = async (id:string, is_published:boolean) => {
    const { error } = await supabase.from('courses').update({ is_published: !is_published }).eq('id', id)
    if(error) alert(error.message); else load()
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Panel de Tutor</h1>
      <div className="card space-y-2">
        <input className="input" placeholder="Título del curso" value={title} onChange={e=>setTitle(e.target.value)} />
        <textarea className="input h-28" placeholder="Descripción" value={description} onChange={e=>setDescription(e.target.value)} />
        <button className="btn" onClick={createCourse}>Crear curso</button>
      </div>
      <div className="space-y-2">
        {courses.map(c => (
          <div key={c.id} className="card flex items-center justify-between gap-2">
            <div>
              <div className="font-semibold">{c.title}</div>
              <div className="text-sm text-gray-400">{c.is_published ? 'Publicado' : 'Borrador'}</div>
            </div>
            <div className="flex gap-2">
              <button className="btn" onClick={()=>publish(c.id, c.is_published)}>{c.is_published ? 'Ocultar' : 'Publicar'}</button>
              <Link className="btn no-underline" href={`/dashboard/tutor/course/${c.id}`}>Editar</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}