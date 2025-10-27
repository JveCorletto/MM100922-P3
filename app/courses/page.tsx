import CourseCard from '@/components/CourseCard'
import { supabase } from '@/lib/supabaseClient'
import SearchBar from '@/components/SearchBar'

export const dynamic = 'force-dynamic'

async function fetchCourses(searchTerm?: string) {
  let query = supabase
    .from('courses')
    .select('id,title,description')
    .eq('is_published', true)

  if (searchTerm) {
    query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
  }

  query = query.order('created_at', { ascending: false })
  
  const { data } = await query
  return data || []
}

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: { search?: string }
}) {
  const searchTerm = searchParams.search || ''
  const courses = await fetchCourses(searchTerm)

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header y Buscador */}
      <div className="space-y-6">
        <div className="text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2">
            Todos los Cursos
          </h1>
          <p className="text-gray-300 text-base sm:text-lg">
            Explora nuestra colección de cursos disponibles
          </p>
        </div>

        {/* Componente de búsqueda */}
        <SearchBar initialSearch={searchTerm} />
      </div>

      {/* Contador de resultados */}
      {searchTerm && (
        <div className="text-gray-300 text-sm">
          {courses.length === 0 
            ? 'No se encontraron cursos'
            : `Se encontraron ${courses.length} curso${courses.length !== 1 ? 's' : ''}`
          }
        </div>
      )}

      {/* Grid de cursos */}
      {courses.length === 0 ? (
        <div className="bg-gray-800 rounded-lg sm:rounded-xl p-8 sm:p-12 text-center shadow-lg">
          <div className="text-gray-300 text-lg sm:text-xl mb-4">
            {searchTerm ? 'No se encontraron cursos que coincidan con tu búsqueda' : 'No hay cursos publicados en este momento.'}
          </div>
          <div className="text-gray-400 text-sm sm:text-base">
            {searchTerm ? 'Intenta con otros términos de búsqueda' : 'Vuelve pronto para ver nuevos cursos disponibles.'}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </div>
  )
}