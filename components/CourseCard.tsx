'use client'
import Link from 'next/link'

export default function CourseCard({ course }: { course: { id: string; title: string; description?: string } }) {
  return (
    <div className="card space-y-2">
      <div className="text-lg font-semibold">{course.title}</div>
      <div className="text-sm text-gray-300 line-clamp-3">{course.description}</div>
      <div className="flex gap-2">
        <Link href={`/course/${course.id}`} className="btn no-underline">Ver curso</Link>
      </div>
    </div>
  )
}