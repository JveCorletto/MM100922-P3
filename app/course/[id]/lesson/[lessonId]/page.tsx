'use client'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { OpenMaterialButton } from '@/components/OpenMaterialButton'
import CourseChat from '@/components/CourseChat'
import ReactMarkdown from 'react-markdown'

type Lesson = { id: string; title: string; body_md: string | null; material_url: string | null; sort_order: number; video_url?: string | null }
type Course = { id: string; title: string; video_url?: string | null; tutor_id: string }

const toEmbed = (u?: string | null) => {
    if (!u) return null
    try {
        if (u.includes('<iframe')) return u
        const url = new URL(u)
        if (url.hostname.includes('youtube.com') && url.searchParams.get('v'))
            return `https://www.youtube.com/embed/${url.searchParams.get('v')}`
        if (url.hostname === 'youtu.be')
            return `https://www.youtube.com/embed/${url.pathname.slice(1)}`
    } catch { }
    return u
}

type UserRole = 'student' | 'tutor' | 'admin' | null

export default function LessonPage({ params }: { params: { id: string; lessonId: string } }) {
    const courseId = params.id
    const lessonId = params.lessonId

    const [course, setCourse] = useState<Course | null>(null)
    const [lessons, setLessons] = useState<Lesson[]>([])
    const [lesson, setLesson] = useState<Lesson | null>(null)
    const [canAccess, setCanAccess] = useState<boolean | null>(null)
    const [completed, setCompleted] = useState<boolean>(false)
    const [userRole, setUserRole] = useState<UserRole>(null)
    const [userId, setUserId] = useState<string | null>(null)
    const [isEnrolled, setIsEnrolled] = useState<boolean>(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        (async () => {
            try {
                setLoading(true)

                // Obtener información del curso
                const c = await supabase.from('courses').select('id,title,video_url,tutor_id').eq('id', courseId).single()
                if (c.data) setCourse(c.data as Course)

                // Obtener lecciones
                const l = await supabase.from('lessons').select('*').eq('course_id', courseId).order('sort_order')
                const arr = (l.data || []) as Lesson[]
                setLessons(arr)
                setLesson(arr.find(x => x.id === lessonId) || null)

                // Obtener información del usuario actual
                const { data: { user } } = await supabase.auth.getUser()
                setUserId(user?.id || null)

                if (user) {
                    // Obtener rol del usuario
                    const { data: profile } = await supabase.from('profiles')
                        .select('role')
                        .eq('id', user.id)
                        .single()

                    const role = profile?.role as UserRole
                    setUserRole(role)

                    // Verificar si está inscrito
                    const { data: enrollment } = await supabase
                        .from('enrollments')
                        .select('id')
                        .eq('course_id', courseId)
                        .eq('student_id', user.id)
                        .single()
                    setIsEnrolled(!!enrollment)

                    // LÓGICA CORREGIDA: Determinar acceso a la lección
                    let hasAccess = false

                    if (role === 'tutor' || role === 'admin') {
                        // Tutores y admins pueden ver todas las lecciones
                        hasAccess = true
                    } else if (role === 'student') {
                        if (enrollment) {
                            // Estudiante inscrito: usa la función can_access_lesson
                            const access = await supabase.rpc('can_access_lesson', {
                                _course_id: courseId,
                                _lesson_id: lessonId
                            })
                            hasAccess = access.data === true
                        } else {
                            // Estudiante NO inscrito: puede ver la primera lección
                            const lessonIndex = arr.findIndex(l => l.id === lessonId)
                            hasAccess = lessonIndex === 0 // Solo puede ver la primera lección
                        }
                    } else {
                        // Usuario no autenticado o sin rol: puede ver la primera lección
                        const lessonIndex = arr.findIndex(l => l.id === lessonId)
                        hasAccess = lessonIndex === 0
                    }

                    setCanAccess(hasAccess)

                    // Verificar progreso de lección (solo para estudiantes inscritos)
                    if (enrollment && role === 'student') {
                        const chk = await supabase.from('lesson_completions')
                            .select('lesson_id')
                            .eq('lesson_id', lessonId)
                            .eq('student_id', user.id)
                            .maybeSingle()
                        setCompleted(!!chk.data)
                    }
                } else {
                    // Usuario no autenticado: puede ver la primera lección
                    const lessonIndex = lessons.findIndex(l => l.id === lessonId)
                    setCanAccess(lessonIndex === 0)
                }
            } catch (error) {
                console.error('Error loading lesson:', error)
            } finally {
                setLoading(false)
            }
        })()
    }, [courseId, lessonId])

    const idx = useMemo(() => lessons.findIndex(l => l.id === lessonId), [lessons, lessonId])
    const prev = idx > 0 ? lessons[idx - 1] : null
    const next = idx >= 0 && idx < lessons.length - 1 ? lessons[idx + 1] : null

    const isCourseOwner = userId === course?.tutor_id
    const canMarkCompleted = userRole === 'student' && isEnrolled
    const canEditLesson = isCourseOwner

    const markCompleted = async () => {
        if (!canMarkCompleted) {
            toast.error('No tienes permiso para marcar esta lección como vista')
            return
        }

        const { error } = await supabase.rpc('set_lesson_completed', { _lesson_id: lessonId })
        if (error) {
            toast.error(error.message);
            return
        }
        setCompleted(true);
        toast.success('Lección marcada como vista')
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-64">
                <div className="text-lg text-gray-400">Cargando lección...</div>
            </div>
        )
    }

    if (canAccess === false) {
        const lessonIndex = lessons.findIndex(l => l.id === lessonId)
        const isFirstLesson = lessonIndex === 0

        return (
            <div className="space-y-6 p-4">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 mx-auto bg-yellow-500/20 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-white">Acceso limitado</h1>

                    {isFirstLesson ? (
                        <div className="space-y-3">
                            <p className="text-gray-400 max-w-md mx-auto">
                                {userRole === 'student' && !isEnrolled
                                    ? 'Inscríbete en el curso para acceder a todas las lecciones'
                                    : 'Inicia sesión para acceder a todas las lecciones'
                                }
                            </p>
                            {userRole === 'student' && !isEnrolled && (
                                <Link
                                    href={`/course/${courseId}`}
                                    className="btn btn-primary inline-block no-underline"
                                >
                                    Inscribirse en el curso
                                </Link>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-gray-400 max-w-md mx-auto">
                                {userRole === 'student' && isEnrolled
                                    ? 'Debes completar la lección anterior para acceder a esta.'
                                    : userRole === 'student' && !isEnrolled
                                        ? 'Inscríbete en el curso y completa las lecciones anteriores.'
                                        : 'Completa las lecciones anteriores para acceder a esta.'
                                }
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                {prev && (
                                    <Link
                                        className="btn btn-primary no-underline text-center"
                                        href={`/course/${courseId}/lesson/${prev.id}`}
                                    >
                                        ← Ir a lección anterior
                                    </Link>
                                )}
                                <Link
                                    className="btn btn-outline no-underline text-center"
                                    href={`/course/${courseId}`}
                                >
                                    Volver al curso
                                </Link>
                            </div>
                        </div>
                    )}
                </div>

                {/* Chat para vista previa de primera lección */}
                <CourseChat
                    courseId={courseId}
                    lessonId={lessonId}
                    courseTitle={course?.title || ''}
                    lessonTitle={lesson?.title || ''}
                    lessonContent={lesson?.body_md || null}
                    materialUrl={lesson?.material_url || null}
                    videoUrl={lesson?.video_url || course?.video_url || null}
                    isEnrolled={isEnrolled}
                />
            </div>
        )
    }

    if (!lesson) {
        return (
            <div className="space-y-6 p-4 text-center">
                <h1 className="text-2xl font-bold text-white">Lección no encontrada</h1>
                <p className="text-gray-400">La lección que buscas no existe o fue eliminada.</p>
                <Link className="btn btn-primary no-underline" href={`/course/${courseId}`}>
                    Volver al curso
                </Link>
            </div>
        )
    }

    const embed = toEmbed(lesson.video_url || course?.video_url || null)

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <div className="container mx-auto px-4 py-6 max-w-6xl">
                {/* Header */}
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-8">
                    <div className="flex-1 space-y-3">
                        {/* Breadcrumb */}
                        <div className="flex items-center gap-2 text-sm text-gray-400 flex-wrap">
                            <Link
                                href={`/course/${courseId}`}
                                className="hover:text-blue-400 transition-colors truncate"
                            >
                                {course?.title}
                            </Link>
                            <span className="text-gray-600">•</span>
                            <span className="text-blue-400">
                                Lección {idx + 1} de {lessons.length}
                            </span>
                            {!isEnrolled && userRole === 'student' && (
                                <>
                                    <span className="text-gray-600">•</span>
                                    <span className="text-yellow-400">Vista previa</span>
                                </>
                            )}
                        </div>

                        {/* Título */}
                        <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">
                            {lesson.title}
                        </h1>
                    </div>

                    {/* Estado y acciones */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        {/* Indicadores de estado */}
                        <div className="flex flex-wrap gap-2">
                            {userRole === 'student' && !isEnrolled && (
                                <div className="px-3 py-1 bg-yellow-500/20 text-yellow-300 rounded-full text-xs font-medium border border-yellow-500/30">
                                    Vista previa
                                </div>
                            )}

                            {isCourseOwner && (
                                <div className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-medium border border-blue-500/30">
                                    Tutor
                                </div>
                            )}
                        </div>

                        {canEditLesson && (
                            <Link
                                href={`/dashboard/tutor/course/${courseId}/lesson/${lessonId}`}
                                className="btn btn-outline btn-sm flex items-center gap-2 no-underline whitespace-nowrap"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Editar
                            </Link>
                        )}
                    </div>
                </div>

                {/* Contenido principal */}
                <div className="space-y-6">
                    {/* Video embed */}
                    {embed && (
                        <div className="bg-black rounded-xl overflow-hidden shadow-2xl">
                            <div className="aspect-video">
                                {String(embed).includes('<iframe')
                                    ? (
                                        <div
                                            className="w-full h-full [&>*]:w-full [&>*]:h-full"
                                            dangerouslySetInnerHTML={{ __html: embed! }}
                                        />
                                    )
                                    : (
                                        <iframe
                                            className="w-full h-full"
                                            src={embed!}
                                            title={lesson.title}
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                            allowFullScreen
                                        />
                                    )
                                }
                            </div>
                        </div>
                    )}

                    {/* Contenido Markdown */}
                    {lesson.body_md && (
                        <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
                            <div className="prose prose-invert prose-lg max-w-none">
                                <ReactMarkdown
                                    components={{
                                        h1: ({ node, ...props }) => <h1 className="text-2xl font-bold text-white mb-4 mt-6" {...props} />,
                                        h2: ({ node, ...props }) => <h2 className="text-xl font-bold text-white mb-3 mt-5" {...props} />,
                                        h3: ({ node, ...props }) => <h3 className="text-lg font-bold text-white mb-2 mt-4" {...props} />,
                                        p: ({ node, ...props }) => <p className="text-gray-300 mb-4 leading-relaxed" {...props} />,
                                        ul: ({ node, ...props }) => <ul className="text-gray-300 mb-4 space-y-2" {...props} />,
                                        ol: ({ node, ...props }) => <ol className="text-gray-300 mb-4 space-y-2" {...props} />,
                                        li: ({ node, ...props }) => <li className="ml-4" {...props} />,
                                        strong: ({ node, ...props }) => <strong className="font-bold text-white" {...props} />,
                                        a: ({ node, ...props }) => <a className="text-blue-400 hover:text-blue-300 underline" {...props} />,
                                        code: ({ node, ...props }) => <code className="bg-gray-700 px-2 py-1 rounded text-sm" {...props} />,
                                    }}
                                >
                                    {lesson.body_md}
                                </ReactMarkdown>
                            </div>
                        </div>
                    )}

                    {/* Material adicional */}
                    {lesson.material_url && (
                        <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
                            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Material de apoyo
                            </h3>
                            <OpenMaterialButton path={lesson.material_url} />
                        </div>
                    )}

                    {/* Acciones y navegación */}
                    <div className="border-t border-gray-700 pt-6">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                            {/* Botón de progreso */}
                            <div className="flex-1">
                                {canMarkCompleted ? (
                                    <button
                                        className={`w-full lg:w-auto btn ${completed
                                                ? 'bg-green-600/20 text-green-300 border-green-500/30 hover:bg-green-600/30'
                                                : 'btn-primary'
                                            } flex items-center justify-center gap-2`}
                                        disabled={completed}
                                        onClick={markCompleted}
                                    >
                                        {completed ? (
                                            <>
                                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                                Lección completada
                                            </>
                                        ) : (
                                            'Marcar como vista'
                                        )}
                                    </button>
                                ) : (
                                    <div className="text-center lg:text-left">
                                        <p className="text-sm text-gray-400">
                                            {userRole === 'student' && !isEnrolled && 'Inscríbete en el curso para guardar tu progreso'}
                                            {userRole === 'tutor' && 'Los tutores no pueden marcar lecciones como vistas'}
                                            {!userRole && 'Inicia sesión para guardar tu progreso'}
                                        </p>
                                        {userRole === 'student' && !isEnrolled && (
                                            <Link
                                                href={`/course/${courseId}`}
                                                className="btn btn-primary btn-sm mt-2 no-underline"
                                            >
                                                Inscribirse en el curso
                                            </Link>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Navegación entre lecciones */}
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="flex gap-3">
                                    {prev && (
                                        <Link
                                            className="btn btn-outline no-underline flex items-center gap-2 flex-1 sm:flex-none"
                                            href={`/course/${courseId}/lesson/${prev.id}`}
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                            </svg>
                                            <span className="hidden sm:inline">Anterior</span>
                                        </Link>
                                    )}

                                    {next && canAccess && (
                                        <Link
                                            className="btn btn-primary no-underline flex items-center gap-2 flex-1 sm:flex-none"
                                            href={`/course/${courseId}/lesson/${next.id}`}
                                        >
                                            <span>Siguiente</span>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </Link>
                                    )}
                                </div>

                                {(!next || !canAccess) && (
                                    <Link
                                        className="btn btn-outline no-underline text-center"
                                        href={`/course/${courseId}`}
                                    >
                                        Volver al curso
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Chat flotante para estudiantes inscritos o en vista previa */}
                <CourseChat
                    courseId={courseId}
                    lessonId={lessonId}
                    courseTitle={course?.title || ''}
                    lessonTitle={lesson?.title || ''}
                    lessonContent={lesson?.body_md || null}
                    materialUrl={lesson?.material_url || null}
                    videoUrl={lesson?.video_url || course?.video_url || null}
                    isEnrolled={isEnrolled}
                />
            </div>
        </div>
    )
}