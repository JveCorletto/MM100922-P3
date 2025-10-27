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

  if (!course) return <div className="text-white p-4">Curso no encontrado</div>

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header con título y botón de edición para tutores */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1 space-y-3 sm:space-y-4">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">{course.title}</h1>
          <p className="text-gray-300 text-base sm:text-lg lg:text-xl leading-relaxed">
            {course.description}
          </p>
        </div>
        
        {/* Botón de edición solo para el tutor del curso */}
        {isTutor && (
          <div className="flex sm:flex-col justify-end sm:justify-start">
            <EditCourseButton courseId={course.id} />
          </div>
        )}
      </div>

      {/* Video del curso */}
      {course.video_url && (
        <div className="aspect-video bg-black rounded-lg sm:rounded-xl overflow-hidden shadow-lg">
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

      {/* Lista de lecciones */}
      <div className="bg-gray-800 rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-lg">
        <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold mb-4 sm:mb-6 text-white">
          Lecciones del Curso
        </h3>
        
        {(!lessons || lessons.length === 0) ? (
          <div className="text-center py-8">
            <p className="text-gray-400 text-lg">No hay lecciones disponibles</p>
          </div>
        ) : (
          <ul className="space-y-2 sm:space-y-3">
            {lessons.map((l: any, index: number) => (
              <li 
                key={l.id} 
                className="flex items-center gap-3 p-3 sm:p-4 hover:bg-gray-700 rounded-lg transition-colors duration-200 border border-gray-700 hover:border-gray-600"
              >
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    {index + 1}
                  </span>
                </div>
                
                <Link 
                  className="text-gray-200 hover:text-white font-medium flex-1 no-underline text-base sm:text-lg transition-colors duration-200 line-clamp-2"
                  href={`/course/${course.id}/lesson/${l.id}`}
                >
                  {l.title}
                </Link>
                
                <svg 
                  className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M9 5l7 7-7 7" 
                  />
                </svg>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Acciones contextuales por rol/inscripción/propiedad/admin */}
      <div className="bg-gray-800 rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-lg">
        <CourseActions 
          courseId={course.id} 
          tutorId={course.tutor_id} 
          isPublished={course.is_published} 
        />
      </div>
    </div>
  )
}