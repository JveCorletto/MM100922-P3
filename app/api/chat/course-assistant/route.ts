import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { supabase } from '@/lib/supabaseClient'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!)

export async function POST(request: NextRequest) {
  try {
    const {
      courseId,
      lessonId,
      courseTitle,
      lessonTitle,
      lessonContent,
      materialUrl,
      videoUrl,
      message,
      chatHistory
    } = await request.json()

    if (!process.env.GOOGLE_API_KEY) {
      throw new Error('GOOGLE_API_KEY no configurada')
    }

    // 1. Obtener perfil del tutor para este curso
    const { data: tutorProfile, error: profileError } = await supabase
      .from('tutor_profiles')
      .select('*')
      .eq('course_id', courseId)
      .single()

    // 2. Obtener contexto adicional del curso
    const { data: courseData } = await supabase
      .from('courses')
      .select('description')
      .eq('id', courseId)
      .single()

    const { data: lessons } = await supabase
      .from('lessons')
      .select('title, body_md, sort_order')
      .eq('course_id', courseId)
      .order('sort_order')

    // 3. Construir el prompt inteligente para Gemini
    const systemPrompt = buildSystemPrompt({
      courseTitle,
      lessonTitle,
      lessonContent,
      courseDescription: courseData?.description,
      tutorProfile,
      chatHistory,
      userMessage: message
    })

    // 4. Generar respuesta con Gemini
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      }
    })
    
    const result = await model.generateContent(systemPrompt)
    const response = await result.response
    const aiResponse = response.text()

    return NextResponse.json({ response: aiResponse })

  } catch (error: any) {
    console.error('Error in Gemini assistant:', error)
    
    // Respuesta de fallback inteligente
    const fallbackResponse = `¡Hola! Soy tu tutor para el curso. 

Parece que hay un problema temporal con mi configuración, pero normalmente puedo ayudarte con:

• Explicaciones detalladas del contenido
• Resolución de dudas específicas
• Ejemplos prácticos y aplicaciones
• Guías paso a paso

¿Podrías intentar tu pregunta de nuevo o contactar al administrador del curso si el problema persiste?`

    return NextResponse.json({ response: fallbackResponse })
  }
}

// Función para construir el prompt inteligente
function buildSystemPrompt({
  courseTitle,
  lessonTitle,
  lessonContent,
  courseDescription,
  tutorProfile,
  chatHistory,
  userMessage
}: {
  courseTitle: string
  lessonTitle: string
  lessonContent: string | null
  courseDescription?: string
  tutorProfile: any
  chatHistory: any[]
  userMessage: string
}) {
  
  // Personalidad base del tutor
  let personalityInstructions = `
Eres un tutor especializado en educación en línea. Tu rol es ayudar a estudiantes con dudas específicas sobre el contenido del curso.

TONO GENERAL: Educativo, motivador y claro.
`

  // Personalizar según el perfil del tutor
  if (tutorProfile) {
    personalityInstructions = `
Eres un tutor especializado en: ${tutorProfile.specialty}

TONO: ${getToneDescription(tutorProfile.tone)}
NIVEL DE EXPERTISE: ${tutorProfile.expertise_level}
ESTILO DE ENSEÑANZA: ${getTeachingStyleDescription(tutorProfile.teaching_style)}

${tutorProfile.custom_instructions ? `INSTRUCCIONES PERSONALIZADAS: ${tutorProfile.custom_instructions}` : ''}
`
  }

  const context = `
CONTEXTO DEL CURSO:
- CURSO: ${courseTitle}
- DESCRIPCIÓN: ${courseDescription || 'No disponible'}
- LECCIÓN ACTUAL: ${lessonTitle}
- CONTENIDO DE LA LECCIÓN: ${lessonContent ? lessonContent.substring(0, 3000) + '...' : 'Contenido no disponible'}

INSTRUCCIONES ESPECÍFICAS:
1. Responde ÚNICAMENTE sobre temas relacionados con "${courseTitle}" y específicamente la lección "${lessonTitle}"
2. Si la pregunta está fuera del contexto del curso, sugiere amablemente consultar el material oficial o hacer preguntas relacionadas con el contenido
3. Sé preciso y basado en el contenido proporcionado
4. Usa ejemplos cuando sea posible
5. Si no hay suficiente información, sugiere revisar el material de apoyo
6. Mantén un enfoque educativo y motivador

HISTORIAL DE CONVERSACIÓN:
${chatHistory.map((msg: any) => 
  `${msg.role === 'user' ? 'ESTUDIANTE' : 'TUTOR'}: ${msg.content}`
).join('\n')}

PREGUNTA ACTUAL DEL ESTUDIANTE: ${userMessage}

Responde como tutor especializado en este curso:
`

  return personalityInstructions + context
}

// Funciones auxiliares para personalización
function getToneDescription(tone: string) {
  const tones: { [key: string]: string } = {
    'educativo': 'Claro, paciente y explicativo. Usa analogías y ejemplos.',
    'tecnico': 'Preciso, detallado y específico. Incluye tecnicismos cuando sea necesario.',
    'creativo': 'Inspirador, motivador y enfocado en la aplicación práctica.',
    'academico': 'Formal, estructurado y basado en metodologías educativas.',
    'coloquial': 'Cercano, amigable y conversacional.'
  }
  return tones[tone] || tones['educativo']
}

function getTeachingStyleDescription(style: string) {
  const styles: { [key: string]: string } = {
    'practico': 'Enfocado en ejemplos reales y aplicación inmediata',
    'teorico': 'Explicaciones conceptuales y fundamentos teóricos',
    'mixto': 'Combina teoría con práctica de manera balanceada',
    'socratico': 'Guía al estudiante mediante preguntas reflexivas',
    'demonstrativo': 'Muestra procesos paso a paso'
  }
  return styles[style] || styles['practico']
}