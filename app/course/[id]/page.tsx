import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import CourseActions from '@/components/CourseActions'
import { EditCourseButton } from '@/components/EditCourseButton'

export const dynamic = 'force-dynamic'

export default async function CourseDetail({ params }: { params: { id: string } }) {
  const { data: course } = await supabase
    .from('courses')
    .select('*')
    .eq('id', params.id)
    .single()

  const { data: lessons } = await supabase
    .from('lessons')
    .select('*')
    .eq('course_id', params.id)
    .order('sort_order')

  // Obtener información del usuario actual
  const { data: { user } } = await supabase.auth.getUser()
  
  // Verificar si el usuario es el tutor del curso
  const isTutor = user?.id === course?.tutor_id

  if (!course) return <div>Curso no encontrado</div>

  return (
    <div className="space-y-6">
      {/* Header con título y botón de edición para tutores */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1 space-y-2">
          <h1 className="text-3xl font-bold text-white-900">{course.title}</h1>
          <p className="text-white-600 text-lg">{course.description}</p>
        </div>
        
        {/* Botón de edición solo para el tutor del curso */}
        {isTutor && (
          <EditCourseButton courseId={course.id} />
        )}
      </div>

      {course.video_url && (
        <div className="aspect-video bg-black rounded-xl overflow-hidden">
          {String(course.video_url).includes('<iframe')
            ? (
              <div
                className="w-full h-full [&>*]:w-full [&>*]:h-full"
                dangerouslySetInnerHTML={{ __html: course.video_url }}
              />
            )
            : (
              <iframe
                className="w-full h-full"
                src={course.video_url}
                title={course.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            )}
        </div>
      )}

      <div className="card">
        <h3 className="text-xl font-semibold mb-4 text-white-900">Lecciones del Curso</h3>
        <ul className="space-y-3">
          {(lessons || []).map((l: any) => (
            <li key={l.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-blue-600">
                  {(lessons || []).indexOf(l) + 1}
                </span>
              </div>
              <Link className="text-white-700 hover:text-blue-600 font-medium flex-1 no-underline" href={`/course/${course.id}/lesson/${l.id}`}>
                {l.title}
              </Link>
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </li>
          ))}
        </ul>
      </div>

      {/* Acciones contextuales por rol/inscripción/propiedad/admin */}
      <CourseActions 
        courseId={course.id} 
        tutorId={course.tutor_id} 
        isPublished={course.is_published} 
      />
    </div>
  )
}