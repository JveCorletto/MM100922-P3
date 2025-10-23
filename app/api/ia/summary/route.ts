
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest){
  const { text } = await req.json()
  const key = process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY
  if(!key){
    const sentences = String(text||'').split('.').map(s=>s.trim()).filter(Boolean)
    const pick = sentences.slice(0,3).join('. ') + (sentences.length>3 ? '...' : '')
    return NextResponse.json({ summary: `Resumen (mock): ${pick}` })
  }
  return NextResponse.json({ summary: 'IA real disponible (agrega tu API key en el deploy).' })
}
