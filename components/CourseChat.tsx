// components/CourseChat.tsx
'use client'
import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import toast from 'react-hot-toast'

type Message = {
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
}

type CourseChatProps = {
    courseId: string
    lessonId: string
    courseTitle: string
    lessonTitle: string
    lessonContent: string | null
    materialUrl: string | null
    videoUrl: string | null
    isEnrolled: boolean
}

export default function CourseChat({
    courseId,
    lessonId,
    courseTitle,
    lessonTitle,
    lessonContent,
    materialUrl,
    videoUrl,
    isEnrolled
}: CourseChatProps) {
    const [messages, setMessages] = useState<Message[]>([])
    const [inputMessage, setInputMessage] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    // Cargar historial del chat
    useEffect(() => {
        if (isEnrolled && isOpen) {
            loadChatHistory()
        }
    }, [courseId, lessonId, isEnrolled, isOpen])

    const loadChatHistory = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data, error } = await supabase
                .from('course_chats')
                .select('*')
                .eq('course_id', courseId)
                .eq('lesson_id', lessonId)
                .eq('user_id', user.id)
                .order('created_at', { ascending: true })

            if (error) throw error

            const chatMessages: Message[] = (data || []).map(msg => ({
                id: msg.id,
                role: msg.role as 'user' | 'assistant',
                content: msg.content,
                timestamp: new Date(msg.created_at)
            }))

            setMessages(chatMessages)
        } catch (error) {
            console.error('Error loading chat history:', error)
        }
    }

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!inputMessage.trim() || isLoading || !isEnrolled) return

        const userMessage = inputMessage.trim()
        setInputMessage('')
        setIsLoading(true)

        // Agregar mensaje del usuario
        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: userMessage,
            timestamp: new Date()
        }

        setMessages(prev => [...prev, userMsg])

        // En el handleSubmit del CourseChat.tsx, reemplaza todo el try-catch con:
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Usuario no autenticado')

            // Guardar mensaje del usuario en la base de datos (opcional, puedes comentar esto temporalmente)
            /*
            const { error: userMsgError } = await supabase
              .from('course_chats')
              .insert({
                course_id: courseId,
                lesson_id: lessonId,
                user_id: user.id,
                role: 'user',
                content: userMessage
              })
          
            if (userMsgError) {
              console.error('Error guardando mensaje:', userMsgError)
              // Continuar aunque falle el guardado
            }
            */

            // Llamar a la API
            const response = await fetch('/api/chat/course-assistant', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    courseId,
                    lessonId,
                    courseTitle,
                    lessonTitle,
                    lessonContent,
                    materialUrl,
                    videoUrl,
                    message: userMessage,
                    chatHistory: messages.slice(-6)
                })
            })

            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`)
            }

            const data = await response.json()

            if (!data.response) {
                throw new Error('Respuesta vacía del servidor')
            }

            // Agregar respuesta de la IA
            const assistantMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.response,
                timestamp: new Date()
            }

            setMessages(prev => [...prev, assistantMsg])

            // Guardar respuesta en la base de datos (opcional)
            /*
            const { error: assistantMsgError } = await supabase
              .from('course_chats')
              .insert({
                course_id: courseId,
                lesson_id: lessonId,
                user_id: user.id,
                role: 'assistant',
                content: data.response
              })
          
            if (assistantMsgError) {
              console.error('Error guardando respuesta:', assistantMsgError)
            }
            */

        } catch (error: any) {
            console.error('Error in chat:', error)

            let errorMessage = '¡Hola! Soy tu tutor IA. '
            errorMessage += 'Actualmente estoy en modo de demostración y puedo ayudarte con:\n\n'
            errorMessage += '• Explicaciones de conceptos\n'
            errorMessage += '• Guías paso a paso\n'
            errorMessage += '• Ejemplos prácticos\n'
            errorMessage += '• Resolución de dudas\n\n'
            errorMessage += '¿En qué puedo asistirte con la lección actual?'

            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: errorMessage,
                timestamp: new Date()
            }
            setMessages(prev => [...prev, errorMsg])
        } finally {
            setIsLoading(false)
        }
    }

    const autoResizeTextarea = () => {
        const textarea = textareaRef.current
        if (textarea) {
            textarea.style.height = 'auto'
            textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
        }
    }

    // Asegúrate de que el componente retorne JSX válido
    if (!isEnrolled) {
        return null // Esto está bien - retorna null explícitamente
    }

    // El return principal debe estar aquí
    return (
        <>
            {/* Botón flotante */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
                    title="Chat con Tutor IA"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                </button>
            )}

            {/* Modal del chat */}
            {isOpen && (
                <div className="fixed bottom-6 right-6 z-50 w-96 h-[600px] bg-gray-800 rounded-xl shadow-2xl border border-gray-700 flex flex-col">
                    {/* Header */}
                    <div className="p-4 border-b border-gray-700 bg-gray-900 rounded-t-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="font-semibold text-white text-sm">Tutor IA</h3>
                                <p className="text-gray-400 text-xs">{lessonTitle}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-gray-400 hover:text-white transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Mensajes */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.length === 0 ? (
                            <div className="text-center text-gray-400 mt-8">
                                <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                </svg>
                                <p className="text-sm">Haz una pregunta sobre esta lección</p>
                                <p className="text-xs mt-1">El tutor IA puede ayudarte con el contenido del curso</p>
                            </div>
                        ) : (
                            messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[80%] rounded-2xl px-4 py-2 ${message.role === 'user'
                                                ? 'bg-blue-600 text-white rounded-br-none'
                                                : 'bg-gray-700 text-gray-100 rounded-bl-none'
                                            }`}
                                    >
                                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                        <p className={`text-xs mt-1 ${message.role === 'user' ? 'text-blue-200' : 'text-gray-400'}`}>
                                            {message.timestamp.toLocaleTimeString('es-ES', {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-gray-700 text-gray-100 rounded-2xl rounded-bl-none px-4 py-2 max-w-[80%]">
                                    <div className="flex space-x-2">
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <form onSubmit={handleSubmit} className="p-4 border-t border-gray-700">
                        <div className="flex gap-2">
                            <textarea
                                ref={textareaRef}
                                value={inputMessage}
                                onChange={(e) => {
                                    setInputMessage(e.target.value)
                                    autoResizeTextarea()
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault()
                                        handleSubmit(e)
                                    }
                                }}
                                placeholder="Escribe tu pregunta..."
                                className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                rows={1}
                                disabled={isLoading}
                            />
                            <button
                                type="submit"
                                disabled={!inputMessage.trim() || isLoading}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </>
    )
}