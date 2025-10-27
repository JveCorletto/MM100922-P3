'use client'
import Link from 'next/link'

export default function CourseCard({ course }: { course: { id: string; title: string; description?: string } }) {
  return (
    <div className="bg-gray-800 rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-lg border border-gray-700 hover:border-gray-600 transition-all duration-300 hover:shadow-xl h-full flex flex-col">
      {/* Título del curso */}
      <h3 className="text-lg sm:text-xl font-semibold text-white mb-3 line-clamp-2 flex-shrink-0">
        {course.title}
      </h3>
      
      {/* Descripción */}
      <div className="text-gray-300 text-sm sm:text-base leading-relaxed line-clamp-3 mb-4 flex-1">
        {course.description || 'Este curso no tiene descripción disponible.'}
      </div>
      
      {/* Botón de acción */}
      <div className="flex gap-2 pt-2 flex-shrink-0">
        <Link 
          href={`/course/${course.id}`} 
          className="inline-flex items-center justify-center px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 no-underline text-sm sm:text-base flex-1 text-center"
        >
          Ver curso
        </Link>
      </div>
    </div>
  )
}