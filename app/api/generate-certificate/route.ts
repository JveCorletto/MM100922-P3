import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

export async function POST(request: NextRequest) {
    try {
        // Obtener el token del header Authorization
        const authHeader = request.headers.get('Authorization')
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.log('❌ No hay token en el header')
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
        }

        const token = authHeader.replace('Bearer ', '')

        // Crear cliente Supabase con el token
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return cookies().get(name)?.value
                    },
                    set(name: string, value: string, options: any) {
                        cookies().set(name, value, options)
                    },
                    remove(name: string, options: any) {
                        cookies().set(name, '', { ...options, maxAge: 0 })
                    },
                },
                global: {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            }
        )

        // Cliente admin (sin cambios)
        const supabaseAdmin = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return cookies().get(name)?.value
                    },
                    set(name: string, value: string, options: any) {
                        cookies().set(name, value, options)
                    },
                    remove(name: string, options: any) {
                        cookies().set(name, '', { ...options, maxAge: 0 })
                    },
                },
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )

        // Verificar autenticación usando el token
        const { data: { user }, error: authError } = await supabase.auth.getUser(token)
        if (authError || !user) {
            console.log('❌ Error verificando token:', authError)
            return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
        }
        const { courseId, studentName, completionDate } = await request.json()

        // Obtener información del curso
        const { data: courseData, error: courseError } = await supabaseAdmin
            .from('courses')
            .select('id, title, tutor_id')
            .eq('id', courseId)
            .single()

        if (courseError || !courseData) {
            console.log('❌ Curso no encontrado:', courseError)
            return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 })
        }

        // Obtener lecciones del curso
        const { data: lessons, error: lessonsError } = await supabaseAdmin
            .from('lessons')
            .select('id, title')
            .eq('course_id', courseId)

        if (lessonsError || !lessons || lessons.length === 0) {
            console.log('❌ Error obteniendo lecciones:', lessonsError)
            return NextResponse.json({ error: 'Curso sin lecciones' }, { status: 400 })
        }

        // Obtener lecciones completadas por el usuario
        const { data: completedLessons, error: completionsError } = await supabaseAdmin
            .from('lesson_completions')
            .select('lesson_id')
            .eq('student_id', user.id)

        if (completionsError) {
            console.log('❌ Error obteniendo completiones:', completionsError)
            return NextResponse.json({ error: 'Error al verificar el progreso' }, { status: 500 })
        }

        // Filtrar lecciones completadas que pertenecen a este curso
        const lessonIds = lessons.map(lesson => lesson.id)
        const completedInThisCourse = completedLessons?.filter(cl =>
            lessonIds.includes(cl.lesson_id)
        ) || []

        const isCourseCompleted = completedInThisCourse.length === lessons.length
        if (!isCourseCompleted) {
            return NextResponse.json({
                error: `Curso no completado. Has completado ${completedInThisCourse.length} de ${lessons.length} lecciones.`
            }, { status: 400 })
        }

        // Obtener información del tutor
        const { data: tutorData } = await supabaseAdmin
            .from('profiles')
            .select('full_name')
            .eq('id', courseData.tutor_id)
            .single()

        // Obtener información del perfil del estudiante
        const { data: studentProfile } = await supabaseAdmin
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single()

        const finalStudentName = studentName?.trim() ||
            studentProfile?.full_name ||
            user.user_metadata?.full_name ||
            user.email?.split('@')[0] ||
            'Estudiante'

        // Generar el PDF del diploma
        const pdfBytes = await generatePDFDiploma({
            studentName: finalStudentName,
            courseName: courseData.title,
            completionDate: completionDate || new Date().toISOString(),
            tutorName: tutorData?.full_name || 'Tutor',
            platformName: 'EduTrack AI Inc.'
        })

        const stream = new ReadableStream({
            start(controller) {
                controller.enqueue(pdfBytes)
                controller.close()
            }
        })

        return new Response(stream, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="Diploma-${courseData.title.replace(/\s+/g, '-')}.pdf"`,
                'Content-Length': pdfBytes.length.toString(),
            },
        })

    } catch (error) {
        console.error('💥 Error generating certificate:', error)
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }
}

async function generatePDFDiploma({
    studentName,
    courseName,
    completionDate,
    tutorName,
    platformName
}: {
    studentName: string
    courseName: string
    completionDate: string
    tutorName: string
    platformName: string
}): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create()

    // Crear una página
    const page = pdfDoc.addPage([800, 600])

    const { width, height } = page.getSize()

    // Cargar fuentes
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica)

    // Fondo decorativo - borde
    page.drawRectangle({
        x: 20,
        y: 20,
        width: width - 40,
        height: height - 40,
        borderWidth: 3,
        borderColor: rgb(0.8, 0.8, 0.8),
        color: rgb(1, 1, 1),
    })

    // Título del diploma
    const titleText = 'DIPLOMA DE CERTIFICACIÓN'
    const titleWidth = boldFont.widthOfTextAtSize(titleText, 24)
    page.drawText(titleText, {
        x: (width - titleWidth) / 2,
        y: height - 120,
        size: 24,
        font: boldFont,
        color: rgb(0.2, 0.4, 0.6),
    })

    // Texto principal
    const subtitleText = 'Se otorga el presente diploma a:'
    const subtitleWidth = regularFont.widthOfTextAtSize(subtitleText, 16)
    page.drawText(subtitleText, {
        x: (width - subtitleWidth) / 2,
        y: height - 180,
        size: 16,
        font: regularFont,
        color: rgb(0.2, 0.2, 0.2),
    })

    // Nombre del estudiante
    const studentNameWidth = boldFont.widthOfTextAtSize(studentName, 28)
    page.drawText(studentName, {
        x: (width - studentNameWidth) / 2,
        y: height - 240,
        size: 28,
        font: boldFont,
        color: rgb(0.1, 0.1, 0.1),
    })

    // Por completar el curso
    const courseText = 'Por haber completado exitosamente el curso:'
    const courseTextWidth = regularFont.widthOfTextAtSize(courseText, 14)
    page.drawText(courseText, {
        x: (width - courseTextWidth) / 2,
        y: height - 300,
        size: 14,
        font: regularFont,
        color: rgb(0.3, 0.3, 0.3),
    })

    // Nombre del curso
    const courseNameText = `"${courseName}"`
    const courseNameWidth = boldFont.widthOfTextAtSize(courseNameText, 18)
    page.drawText(courseNameText, {
        x: (width - courseNameWidth) / 2,
        y: height - 340,
        size: 18,
        font: boldFont,
        color: rgb(0.2, 0.4, 0.6),
    })

    // Fecha de completación
    const completionDateObj = new Date(completionDate)
    const formattedDate = completionDateObj.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })

    const dateText = `Completado el: ${formattedDate}`
    const dateWidth = regularFont.widthOfTextAtSize(dateText, 12)
    page.drawText(dateText, {
        x: (width - dateWidth) / 2,
        y: height - 390,
        size: 12,
        font: regularFont,
        color: rgb(0.4, 0.4, 0.4),
    })

    // Firmas
    const signatureY = height - 470

    // Firma del tutor
    page.drawText('_________________________', {
        x: 100,
        y: signatureY,
        size: 12,
        font: regularFont,
        color: rgb(0.3, 0.3, 0.3),
    })

    const tutorNameWidth = regularFont.widthOfTextAtSize(tutorName, 12)
    page.drawText(tutorName, {
        x: 100 + (210 - tutorNameWidth) / 2,
        y: signatureY - 25,
        size: 12,
        font: regularFont,
        color: rgb(0.3, 0.3, 0.3),
    })

    const tutorLabelWidth = regularFont.widthOfTextAtSize('Tutor', 10)
    page.drawText('Tutor', {
        x: 100 + (210 - tutorLabelWidth) / 2,
        y: signatureY - 45,
        size: 10,
        font: regularFont,
        color: rgb(0.5, 0.5, 0.5),
    })

    // Firma de la plataforma
    page.drawText('_________________________', {
        x: width - 310,
        y: signatureY,
        size: 12,
        font: regularFont,
        color: rgb(0.3, 0.3, 0.3),
    })

    const platformNameWidth = regularFont.widthOfTextAtSize(platformName, 12)
    page.drawText(platformName, {
        x: width - 310 + (210 - platformNameWidth) / 2,
        y: signatureY - 25,
        size: 12,
        font: regularFont,
        color: rgb(0.3, 0.3, 0.3),
    })

    const platformLabelWidth = regularFont.widthOfTextAtSize('Plataforma Educativa', 10)
    page.drawText('Plataforma Educativa', {
        x: width - 310 + (210 - platformLabelWidth) / 2,
        y: signatureY - 45,
        size: 10,
        font: regularFont,
        color: rgb(0.5, 0.5, 0.5),
    })

    // Sello decorativo
    page.drawCircle({
        x: width / 2,
        y: height - 520,
        size: 25,
        color: rgb(0.95, 0.95, 1),
        borderWidth: 3,
        borderColor: rgb(0.8, 0.1, 0.1),
    })

    page.drawLine({
        start: { x: width / 2 - 8, y: height - 515 },
        end: { x: width / 2 - 2, y: height - 525 },
        thickness: 3,
        color: rgb(0.8, 0.1, 0.1),
    })

    page.drawLine({
        start: { x: width / 2 - 2, y: height - 525 },
        end: { x: width / 2 + 8, y: height - 510 },
        thickness: 3,
        color: rgb(0.8, 0.1, 0.1),
    })

    // Líneas decorativas en las esquinas
    const cornerSize = 40
    const lineWidth = 2

    // Esquina superior izquierda
    page.drawLine({
        start: { x: 50, y: height - 50 },
        end: { x: 50 + cornerSize, y: height - 50 },
        thickness: lineWidth,
        color: rgb(0.2, 0.4, 0.6),
    })

    page.drawLine({
        start: { x: 50, y: height - 50 },
        end: { x: 50, y: height - 50 - cornerSize },
        thickness: lineWidth,
        color: rgb(0.2, 0.4, 0.6),
    })

    // Esquina superior derecha
    page.drawLine({
        start: { x: width - 50, y: height - 50 },
        end: { x: width - 50 - cornerSize, y: height - 50 },
        thickness: lineWidth,
        color: rgb(0.2, 0.4, 0.6),
    })

    page.drawLine({
        start: { x: width - 50, y: height - 50 },
        end: { x: width - 50, y: height - 50 - cornerSize },
        thickness: lineWidth,
        color: rgb(0.2, 0.4, 0.6),
    })

    // Esquina inferior izquierda
    page.drawLine({
        start: { x: 50, y: 50 },
        end: { x: 50 + cornerSize, y: 50 },
        thickness: lineWidth,
        color: rgb(0.2, 0.4, 0.6),
    })

    page.drawLine({
        start: { x: 50, y: 50 },
        end: { x: 50, y: 50 + cornerSize },
        thickness: lineWidth,
        color: rgb(0.2, 0.4, 0.6),
    })

    // Esquina inferior derecha
    page.drawLine({
        start: { x: width - 50, y: 50 },
        end: { x: width - 50 - cornerSize, y: 50 },
        thickness: lineWidth,
        color: rgb(0.2, 0.4, 0.6),
    })

    page.drawLine({
        start: { x: width - 50, y: 50 },
        end: { x: width - 50, y: 50 + cornerSize },
        thickness: lineWidth,
        color: rgb(0.2, 0.4, 0.6),
    })

    // Generar el PDF
    return await pdfDoc.save()
}