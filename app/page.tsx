import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

async function getFeaturedCourses() {
  const { data: courses } = await supabase
    .from('courses')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(6)
  
  return courses || []
}

async function getUserProgress() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select(`
      course:courses(*),
      progress:course_progress(completed_lessons, total_lessons)
    `)
    .eq('student_id', user.id)
    .limit(3)

  return enrollments || []
}

export default async function Page() {
  const [featuredCourses, userProgress] = await Promise.all([
    getFeaturedCourses(),
    getUserProgress()
  ])

  const { data: { user } } = await supabase.auth.getUser()
  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Estudiante'

  return (
    <div className="space-y-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto py-8">
      {/* Header de bienvenida */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white">
          ¡Bienvenido de vuelta, {userName}! 👋
        </h1>
        <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
          Continúa tu aprendizaje o explora nuevos cursos creados por tutores expertos.
        </p>
      </div>

      {/* Progreso del usuario */}
      {userProgress && userProgress.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Tu Progreso
            </h2>
            <Link 
              href="/dashboard/student" 
              className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
            >
              Ver todos mis cursos
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userProgress.map((enrollment: any) => (
              <div 
                key={enrollment.course.id}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
              >
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2 line-clamp-2">
                  {enrollment.course.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                  {enrollment.course.description}
                </p>
                
                {/* Barra de progreso */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>Progreso</span>
                    <span>
                      {enrollment.progress?.completed_lessons || 0} / {enrollment.progress?.total_lessons || 0} lecciones
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${enrollment.progress?.total_lessons ? 
                          ((enrollment.progress.completed_lessons / enrollment.progress.total_lessons) * 100) : 0}%`
                      }}
                    />
                  </div>
                </div>
                
                <Link
                  href={`/course/${enrollment.course.id}`}
                  className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors block text-center"
                >
                  Continuar aprendiendo
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Cursos destacados */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Cursos Destacados
          </h2>
          <Link 
            href="/courses" 
            className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
          >
            Explorar todos los cursos
          </Link>
        </div>

        {featuredCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredCourses.map((course) => (
              <div 
                key={course.id}
                className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300"
              >
                {course.video_url && (
                  <div className="aspect-video bg-gray-200 dark:bg-gray-700">
                    {String(course.video_url).includes('<iframe') ? (
                      <div
                        className="w-full h-full [&>*]:w-full [&>*]:h-full"
                        dangerouslySetInnerHTML={{ __html: course.video_url }}
                      />
                    ) : (
                      <iframe
                        className="w-full h-full"
                        src={course.video_url}
                        title={course.title}
                        allowFullScreen
                      />
                    )}
                  </div>
                )}
                
                <div className="p-6">
                  <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2 line-clamp-2">
                    {course.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-3">
                    {course.description}
                  </p>
                  <Link
                    href={`/course/${course.id}`}
                    className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors block text-center"
                  >
                    Ver curso
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <div className="text-gray-400 dark:text-gray-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No hay cursos disponibles
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Pronto habrá nuevos cursos para explorar.
            </p>
          </div>
        )}
      </section>

      {/* Características de la plataforma */}
      <section className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            ¿Por qué aprender con EduTrack AI?
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Tutor IA Personalizado</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Asistente inteligente que responde tus dudas en tiempo real sobre cada lección.
            </p>
          </div>
          
          <div className="text-center space-y-3">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Seguimiento de Progreso</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Monitorea tu avance y retoma donde lo dejaste en cualquier momento.
            </p>
          </div>
          
          <div className="text-center space-y-3">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Tutores Expertos</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Aprende de instructores especializados en cada materia.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}