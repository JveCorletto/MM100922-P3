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

  // Obtener lecciones completadas por el usuario
  let completedLessonsCount = 0
  let isCourseCompleted = false

  if (user && lessons && lessons.length > 0) {
    const { data: completedLessons, error } = await supabase
      .from('lesson_completions')
      .select('lesson_id')
      .eq('student_id', user.id)
      .in('lesson_id', lessons.map(lesson => lesson.id))

    if (!error && completedLessons) {
      completedLessonsCount = completedLessons.length
      isCourseCompleted = completedLessonsCount === lessons.length
    }
  }

  if (!course) return <div className="text-white p-4">Curso no encontrado</div>

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-7xl mx-auto">
      {/* Header con título y botón de edición para tutores */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 lg:gap-6">
        <div className="flex-1 space-y-2 sm:space-y-3 lg:space-y-4">
          <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-white leading-tight">
            {course.title}
          </h1>
          <p className="text-gray-300 text-sm sm:text-base lg:text-lg xl:text-xl leading-relaxed sm:leading-loose">
            {course.description}
          </p>
        </div>
        
        {/* Botón de edición solo para el tutor del curso */}
        {isTutor && (
          <div className="flex justify-start sm:justify-end">
            <EditCourseButton courseId={course.id} />
          </div>
        )}
      </div>

      {/* Video del curso */}
      {course.video_url && (
        <div className="aspect-video bg-black rounded-lg sm:rounded-xl lg:rounded-2xl overflow-hidden shadow-lg">
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
      <div className="bg-gray-800 rounded-lg sm:rounded-xl lg:rounded-2xl p-3 sm:p-4 lg:p-6 shadow-lg">
        <h3 className="text-base sm:text-lg lg:text-xl xl:text-2xl font-semibold mb-3 sm:mb-4 lg:mb-6 text-white">
          Lecciones del Curso
        </h3>
        
        {(!lessons || lessons.length === 0) ? (
          <div className="text-center py-6 sm:py-8 lg:py-12">
            <p className="text-gray-400 text-base sm:text-lg lg:text-xl">No hay lecciones disponibles</p>
          </div>
        ) : (
          <ul className="space-y-2 sm:space-y-3 lg:space-y-4">
            {lessons.map((l: any, index: number) => (
              <li 
                key={l.id} 
                className="flex items-center gap-2 sm:gap-3 lg:gap-4 p-2 sm:p-3 lg:p-4 hover:bg-gray-700 rounded-lg sm:rounded-xl transition-colors duration-200 border border-gray-700 hover:border-gray-600"
              >
                <div className="flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-xs sm:text-sm font-medium text-white">
                    {index + 1}
                  </span>
                </div>
                
                <Link 
                  className="text-gray-200 hover:text-white font-medium flex-1 no-underline text-sm sm:text-base lg:text-lg transition-colors duration-200 line-clamp-2 break-words pr-2"
                  href={`/course/${course.id}/lesson/${l.id}`}
                >
                  {l.title}
                </Link>
                
                <svg 
                  className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-gray-400 flex-shrink-0" 
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
      <div className="bg-gray-800 rounded-lg sm:rounded-xl lg:rounded-2xl p-3 sm:p-4 lg:p-6 shadow-lg">
        <CourseActions 
          courseId={course.id} 
          tutorId={course.tutor_id} 
          isPublished={course.is_published} 
          courseName={course.title}
          isCourseCompleted={isCourseCompleted}
          completedLessonsCount={completedLessonsCount}
          totalLessonsCount={lessons?.length || 0}
        />
      </div>
    </div>
  )
}