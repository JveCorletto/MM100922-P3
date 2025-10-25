'use client'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { OpenMaterialButton } from '@/components/OpenMaterialButton'
import ReactMarkdown from 'react-markdown'

type Lesson = { id: string; title: string; body_md: string | null; material_url: string | null; sort_order: number; video_url?: string | null }
type Course = { id: string; title: string; video_url?: string | null }

const toEmbed = (u?: string | null) => {
    if (!u) return null
    try {
        if (u.includes('<iframe')) return u
        const url = new URL(u)
        if (url.hostname.includes('youtube.com') && url.searchParams.get('v'))
            return `https://www.youtube.com/embed/${url.searchParams.get('v')}`
        if (url.hostname === 'youtu.be')
            return `https://www.youtube.com/embed/${url.pathname.slice(1)}`
    } catch { }
    return u
}

export default function LessonPage({ params }: { params: { id: string; lessonId: string } }) {
    const courseId = params.id
    const lessonId = params.lessonId

    const [course, setCourse] = useState<Course | null>(null)
    const [lessons, setLessons] = useState<Lesson[]>([])
    const [lesson, setLesson] = useState<Lesson | null>(null)
    const [can, setCan] = useState<boolean | null>(null)
    const [completed, setCompleted] = useState<boolean>(false)

    useEffect(() => {
        (async () => {
            const c = await supabase.from('courses').select('id,title,video_url').eq('id', courseId).single()
            if (c.data) setCourse(c.data as Course)

            const l = await supabase.from('lessons').select('*').eq('course_id', courseId).order('sort_order')
            const arr = (l.data || []) as Lesson[]
            setLessons(arr)
            setLesson(arr.find(x => x.id === lessonId) || null)

            const access = await supabase.rpc('can_access_lesson', { _course_id: courseId, _lesson_id: lessonId })
            setCan(access.data === true)

            const me = await supabase.auth.getUser()
            if (me.data.user) {
                const chk = await supabase.from('lesson_completions')
                    .select('lesson_id').eq('lesson_id', lessonId).eq('student_id', me.data.user.id).maybeSingle()
                setCompleted(!!chk.data)
            }
        })()
    }, [courseId, lessonId])

    const idx = useMemo(() => lessons.findIndex(l => l.id === lessonId), [lessons, lessonId])
    const prev = idx > 0 ? lessons[idx - 1] : null
    const next = idx >= 0 && idx < lessons.length - 1 ? lessons[idx + 1] : null

    const markCompleted = async () => {
        const { error } = await supabase.rpc('set_lesson_completed', { _lesson_id: lessonId })
        if (error) { toast.error(error.message); return }
        setCompleted(true); toast.success('Lección marcada como vista')
    }

    if (can === false) {
        return (
            <div className="space-y-4">
                <h1 className="text-2xl font-bold">Lección bloqueada</h1>
                <p className="text-gray-300">Debes completar la lección anterior.</p>
                {prev && <Link className="btn no-underline" href={`/course/${courseId}/lesson/${prev.id}`}>← Anterior</Link>}
                <Link className="btn no-underline" href={`/course/${courseId}`}>Volver al curso</Link>
            </div>
        )
    }
    if (!lesson || can === null) return <div>Cargando…</div>

    const embed = toEmbed(lesson.video_url || course?.video_url || null)

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">{course?.title} — {lesson.title}</h1>
                <Link href={`/course/${courseId}`} className="underline">Volver al curso</Link>
            </div>

            {embed && (
                <div className="aspect-video">
                    {String(embed).includes('<iframe')
                        ? <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: embed! }} />
                        : <iframe className="w-full h-full rounded-xl" src={embed!}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen />
                    }
                </div>
            )}

            {lesson.body_md && (
                <div className="card prose prose-invert max-w-none">
                    <ReactMarkdown>{lesson.body_md}</ReactMarkdown>
                </div>
            )}

            {lesson.material_url && (
                <div className="card">
                    <div className="mb-2 font-semibold">Material</div>
                    <OpenMaterialButton path={lesson.material_url} />
                </div>
            )}

            <div className="flex items-center gap-2">
                <button className="btn" disabled={completed} onClick={markCompleted}>
                    {completed ? 'Vista ✔' : 'Marcar como vista'}
                </button>
                {prev && <Link className="btn no-underline" href={`/course/${courseId}/lesson/${prev.id}`}>← Anterior</Link>}
                {next && <Link className="btn no-underline" href={`/course/${courseId}/lesson/${next.id}`}>Siguiente →</Link>}
            </div>
        </div>
    )
}