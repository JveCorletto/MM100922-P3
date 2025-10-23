import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient()

  const contentType = req.headers.get('content-type') || ''
  let course_id: string | null = null
  if (contentType.includes('application/json')) {
    const body = await req.json()
    course_id = body.course_id
  } else {
    const form = await req.formData()
    course_id = String(form.get('course_id') || '')
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!course_id) return NextResponse.json({ error: 'missing course_id' }, { status: 400 })

  // Requiere ser STUDENT para inscribirse
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'student') {
    return NextResponse.json({ error: 'Debes iniciar sesión como estudiante para inscribirte.' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('enrollments')
    .insert({ course_id, student_id: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}