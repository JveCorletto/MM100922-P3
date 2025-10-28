// components/TutorProfileManagerModal.tsx
'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import toast from 'react-hot-toast'

type TutorProfile = {
  id?: string
  course_id: string
  specialty: string
  tone: string
  expertise_level: string
  teaching_style: string
  custom_instructions?: string
}

type TutorProfileManagerModalProps = {
  courseId: string
  courseTitle: string
  isOpen: boolean
  onClose: () => void
}

export default function TutorProfileManagerModal({
  courseId,
  courseTitle,
  isOpen,
  onClose
}: TutorProfileManagerModalProps) {
  const [profile, setProfile] = useState<TutorProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadProfile()
    }
  }, [courseId, isOpen])

  const loadProfile = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('tutor_profiles')
        .select('*')
        .eq('course_id', courseId)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
        throw error
      }

      setProfile(data)
    } catch (error) {
      console.error('Error loading tutor profile:', error)
      toast.error('Error cargando perfil del tutor')
    } finally {
      setLoading(false)
    }
  }

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const profileData = {
        course_id: courseId,
        specialty: profile?.specialty || `Tutor de ${courseTitle}`,
        tone: profile?.tone || 'educativo',
        expertise_level: profile?.expertise_level || 'intermedio',
        teaching_style: profile?.teaching_style || 'practico',
        custom_instructions: profile?.custom_instructions
      }

      if (profile?.id) {
        // Actualizar
        const { error } = await supabase
          .from('tutor_profiles')
          .update(profileData)
          .eq('id', profile.id)

        if (error) throw error
        toast.success('Perfil actualizado correctamente')
      } else {
        // Crear
        const { error } = await supabase
          .from('tutor_profiles')
          .insert([profileData])

        if (error) throw error
        toast.success('Perfil creado correctamente')
      }
      
      onClose()
    } catch (error) {
      console.error('Error saving tutor profile:', error)
      toast.error('Error guardando perfil')
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    setProfile(null)
    setLoading(true)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-white">
              Configuración del Tutor IA
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              Personaliza cómo se comporta el asistente para este curso
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="text-gray-400">Cargando perfil del tutor...</div>
            </div>
          ) : (
            <form onSubmit={saveProfile} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Especialidad
                </label>
                <input
                  type="text"
                  value={profile?.specialty || `Tutor de ${courseTitle}`}
                  onChange={(e) => setProfile(prev => ({ 
                    ...prev!, 
                    specialty: e.target.value,
                    course_id: courseId
                  }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={`Ej: Programación en C#, Manualidades Creativas, Matemáticas Avanzadas`}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Define el área de especialización del tutor
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Tono
                  </label>
                  <select
                    value={profile?.tone || 'educativo'}
                    onChange={(e) => setProfile(prev => ({ ...prev!, tone: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="educativo">Educativo</option>
                    <option value="tecnico">Técnico</option>
                    <option value="creativo">Creativo</option>
                    <option value="academico">Académico</option>
                    <option value="coloquial">Coloquial</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nivel
                  </label>
                  <select
                    value={profile?.expertise_level || 'intermedio'}
                    onChange={(e) => setProfile(prev => ({ ...prev!, expertise_level: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="principiante">Principiante</option>
                    <option value="intermedio">Intermedio</option>
                    <option value="avanzado">Avanzado</option>
                    <option value="experto">Experto</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Estilo
                  </label>
                  <select
                    value={profile?.teaching_style || 'practico'}
                    onChange={(e) => setProfile(prev => ({ ...prev!, teaching_style: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="practico">Práctico</option>
                    <option value="teorico">Teórico</option>
                    <option value="mixto">Mixto</option>
                    <option value="socratico">Socrático</option>
                    <option value="demonstrativo">Demostrativo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Instrucciones Personalizadas
                </label>
                <textarea
                  value={profile?.custom_instructions || ''}
                  onChange={(e) => setProfile(prev => ({ ...prev!, custom_instructions: e.target.value }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Ej: Siempre incluye ejemplos de código, Usa analogías con la naturaleza, Enfócate en la aplicación práctica..."
                  rows={4}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Instrucciones específicas para personalizar el comportamiento del tutor
                </p>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-700">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Guardando...' : 'Guardar Perfil'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}