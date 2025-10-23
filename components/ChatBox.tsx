
'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function ChatBox({ courseId }: { courseId: string }){
  const [messages, setMessages] = useState<any[]>([])
  const [text, setText] = useState('')
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('messages').select('*').eq('course_id', courseId).order('created_at')
      setMessages(data || [])
    }
    load()
    const ch = supabase.channel('room_'+courseId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `course_id=eq.${courseId}` }, (p: any) => {
        setMessages(m => [...m, p.new])
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [courseId])

  const send = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if(!user || !text) return
    await supabase.from('messages').insert({ course_id: courseId, sender_id: user.id, content: text })
    setText('')
  }

  return (
    <div className="card space-y-2">
      <div className="space-y-1 max-h-64 overflow-auto">
        {messages.map((m) => (
          <div key={m.id}><b>{String(m.sender_id).slice(0,6)}:</b> {m.content}</div>
        ))}
      </div>
      <div className="flex gap-2">
        <input className="input" value={text} onChange={e=>setText(e.target.value)} placeholder="Escribe un mensaje..." />
        <button className="btn" onClick={send}>Enviar</button>
      </div>
    </div>
  )
}
