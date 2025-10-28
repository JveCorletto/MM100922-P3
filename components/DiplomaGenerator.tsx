'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import toast from 'react-hot-toast'

type DiplomaGeneratorProps = {
  courseId: string
  courseTitle: string
  studentId: string
  isOpen: boolean
  onClose: () => void
  onDiplomaGenerated: (diplomaUrl: string) => void
}

export default function DiplomaGenerator({
  courseId,
  courseTitle,
  studentId,
  isOpen,
  onClose,
  onDiplomaGenerated
}: DiplomaGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [studentName, setStudentName] = useState('')

  const generateDiploma = async () => {
    if (!studentName.trim()) {
      toast.error('Por favor ingresa tu nombre para el diploma')
      return
    }

    setIsGenerating(true)
    try {
      // Aquí generamos el diploma (por ahora simulamos la generación)
      // En producción, usarías una librería como pdf-lib o un servicio externo
      const diplomaData = {
        courseTitle,
        studentName: studentName.trim(),
        completionDate: new Date().toLocaleDateString('es-ES'),
        diplomaId: `DIP-${Date.now()}`
      }

      // Simular generación de PDF/Imagen
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Guardar referencia del diploma en la base de datos
      const { data, error } = await supabase
        .from('course_diplomas')
        .insert({
          course_id: courseId,
          student_id: studentId,
          diploma_url: JSON.stringify(diplomaData) // En producción sería la URL del archivo
        })
        .select()
        .single()

      if (error) throw error

      toast.success('¡Diploma generado exitosamente!')
      onDiplomaGenerated(JSON.stringify(diplomaData))
      onClose()
      setStudentName('')
      
    } catch (error: any) {
      console.error('Error generating diploma:', error)
      toast.error('Error al generar el diploma: ' + error.message)
    } finally {
      setIsGenerating(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 space-y-4">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
          Generar Diploma
        </h3>
        
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          Felicitaciones por completar el curso <strong>{courseTitle}</strong>. 
          Ingresa tu nombre para generar tu diploma de finalización.
        </p>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Nombre para el diploma
          </label>
          <input
            type="text"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            placeholder="Ingresa tu nombre completo"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={generateDiploma}
            disabled={isGenerating || !studentName.trim()}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? 'Generando...' : 'Generar Diploma'}
          </button>
        </div>
      </div>
    </div>
  )
}