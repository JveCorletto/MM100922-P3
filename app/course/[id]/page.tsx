import { supabase } from '@/lib/supabaseClient'
import ChatBox from '@/components/ChatBox'
import Link from 'next/link'
import EnrollButton from '@/components/EnrollButton'
import { OpenMaterialButton } from '@/components/OpenMaterialButton'

export const dynamic = 'force-dynamic'

export default async function CourseDetail({ params }: { params: { id: string } }) {
  const { data: course } = await supabase.from('courses').select('*').eq('id', params.id).single()
  const { data: lessons } = await supabase.from('lessons').select('*').eq('course_id', params.id).order('sort_order')
  if (!course) return <div>Curso no encontrado</div>

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">{course.title}</h1>
      <p className="text-gray-300">{course.description}</p>

      {
        course.video_url && (
          <div className="aspect-video">
            {String(course.video_url).includes('<iframe')
              ? (
                <div
                  className="w-full h-full [&>*]:w-full [&>*]:h-full rounded-xl"
                  dangerouslySetInnerHTML={{ __html: course.video_url }}
                />
              )
              : (
                <iframe
                  className="w-full h-full rounded-xl"
                  src={course.video_url}
                  title={course.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              )}
          </div>
        )
      }

      <div className="card">
        <h3 className="text-xl font-semibold mb-2">Lecciones</h3>
        <ul className="list-disc pl-6 space-y-1">
          {(lessons || []).map((l: any) => (
            <li key={l.id}>
              <Link className="underline" href={`/course/${course.id}/lesson/${l.id}`}>
                <b>{l.title}</b>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex gap-2">
        <EnrollButton courseId={course.id} />
        <Link href={`/chat/${course.id}`} className="btn no-underline">Ir al chat</Link>
      </div>

      <ChatBox courseId={course.id} />
    </div>
  )
}