import CourseCard from '@/components/CourseCard'
import { supabase } from '@/lib/supabaseClient'

export const dynamic = 'force-dynamic'

async function fetchCourses(){
  const { data } = await supabase.from('courses').select('id,title,description').eq('is_published', true).order('created_at', { ascending: false })
  return data || []
}

export default async function CoursesPage(){
  const courses = await fetchCourses()
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {courses.map((c:any)=>(<CourseCard key={c.id} course={c} />))}
      {courses.length===0 && <div>No hay cursos publicados.</div>}
    </div>
  )
}