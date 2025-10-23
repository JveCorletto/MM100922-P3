import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'

export async function POST(req: NextRequest){
  const supabase = createSupabaseServerClient()
  const body = await req.json()

  const { data: { user } } = await supabase.auth.getUser()
  if(!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if(profile?.role !== 'tutor' && profile?.role !== 'admin'){
    return NextResponse.json({ error:'forbidden' }, { status: 403 })
  }

  const { data, error } = await supabase.from('courses').insert({
    tutor_id: user.id,
    title: body.title,
    description: body.description,
    video_url: body.video_url || '',
    is_published: false
  }).select().single()

  if(error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}
