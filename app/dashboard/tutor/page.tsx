'use client'
import RoleGate from '@/components/RoleGate'
import { supabase } from '@/lib/supabaseClient'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import TotpModal from 'components/TotpModal'

export default function TutorPanel(){
  return (
    <RoleGate allow={['tutor','admin']}>
      <TutorBody />
    </RoleGate>
  )
}

function TutorBody(){
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [courses, setCourses] = useState<any[]>([])
  const [hasTotp, setHasTotp] = useState(false)
  const [factorId, setFactorId] = useState<string | null>(null)
  const [showTotpModal, setShowTotpModal] = useState(false)
  const [loadingTotpCheck, setLoadingTotpCheck] = useState(true)

  useEffect(()=>{ 
    load()
    checkTotpStatus()
  },[])

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if(!user) return
    const { data } = await supabase.from('courses').select('*').eq('tutor_id', user.id).order('created_at', { ascending:false })
    setCourses(data||[])
  }

  const checkTotpStatus = async () => {
    setLoadingTotpCheck(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if(!user) return

      // Verificar factores TOTP
      const { data: factors } = await supabase.auth.mfa.listFactors()
      const verifiedTotp = factors?.totp?.find((f: any) => f?.status?.toLowerCase() === 'verified')
      
      // También verificar en la BD por si acaso
      const { data: profile } = await supabase
        .from('profiles')
        .select('mfa_enabled')
        .eq('id', user.id)
        .single()

      const totpActive = !!verifiedTotp || !!profile?.mfa_enabled
      setHasTotp(totpActive)
      setFactorId(verifiedTotp?.id || null)
    } catch (error) {
      console.error('Error verificando TOTP:', error)
    } finally {
      setLoadingTotpCheck(false)
    }
  }

  const createCourse = async () => {
    // Verificar TOTP antes de crear el curso
    if (!hasTotp) {
      setShowTotpModal(true)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if(!user) return

    const { error } = await supabase.from('courses').insert({ 
      title, 
      description, 
      video_url: '', 
      is_published: false, 
      tutor_id: user.id 
    })
    
    if(error) { 
      alert(error.message); 
      return 
    }
    
    setTitle(''); 
    setDescription(''); 
    await load()
  }

  const publish = async (id:string, is_published:boolean) => {
    // Verificar TOTP antes de publicar/ocultar
    if (!hasTotp) {
      setShowTotpModal(true)
      return
    }

    const { error } = await supabase.from('courses').update({ is_published: !is_published }).eq('id', id)
    if(error) alert(error.message); else load()
  }

  const handleTotpStateChange = (state: { hasTotp: boolean; factorId: string | null }) => {
    setHasTotp(state.hasTotp)
    setFactorId(state.factorId)
  }

  if (loadingTotpCheck) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="text-lg">Verificando seguridad...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Panel de Tutor</h1>
        <div className="flex items-center gap-4">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            hasTotp 
              ? 'bg-green-100 text-green-800 border border-green-200' 
              : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
          }`}>
            {hasTotp ? '🔒 TOTP Activado' : '⚠️ TOTP Requerido'}
          </div>
          <button 
            className={`btn btn-sm ${hasTotp ? 'btn-outline' : 'btn-primary'}`}
            onClick={() => setShowTotpModal(true)}
          >
            {hasTotp ? 'Gestionar TOTP' : 'Activar TOTP'}
          </button>
        </div>
      </div>

      {/* Alerta informativa */}
      {!hasTotp && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Autenticación de dos factores requerida
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  Para crear y gestionar cursos, debes activar la autenticación de dos factores (TOTP). 
                  Esto protege tanto tu cuenta como el contenido educativo.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card space-y-2">
        <input 
          className="input" 
          placeholder="Título del curso" 
          value={title} 
          onChange={e=>setTitle(e.target.value)} 
          disabled={!hasTotp}
        />
        <textarea 
          className="input h-28" 
          placeholder="Descripción" 
          value={description} 
          onChange={e=>setDescription(e.target.value)}
          disabled={!hasTotp}
        />
        <button 
          className={`btn ${!hasTotp ? 'btn-disabled' : ''}`} 
          onClick={createCourse}
          disabled={!hasTotp || !title.trim()}
        >
          {!hasTotp ? 'Activa TOTP para crear cursos' : 'Crear curso'}
        </button>
        
        {!hasTotp && (
          <p className="text-sm text-gray-500 text-center">
            Haz clic en "Activar TOTP" arriba para habilitar la creación de cursos
          </p>
        )}
      </div>

      <div className="space-y-2">
        {courses.map(c => (
          <div key={c.id} className="card flex items-center justify-between gap-2">
            <div>
              <div className="font-semibold">{c.title}</div>
              <div className="text-sm text-gray-400">{c.is_published ? 'Publicado' : 'Borrador'}</div>
            </div>
            <div className="flex gap-2">
              <button 
                className={`btn ${!hasTotp ? 'btn-disabled' : ''}`} 
                onClick={()=>publish(c.id, c.is_published)}
                disabled={!hasTotp}
              >
                {c.is_published ? 'Ocultar' : 'Publicar'}
              </button>
              <Link 
                className="btn no-underline" 
                href={`/dashboard/tutor/course/${c.id}`}
              >
                Editar
              </Link>
            </div>
          </div>
        ))}
      </div>

      <TotpModal
        open={showTotpModal}
        onClose={() => setShowTotpModal(false)}
        hasTotp={hasTotp}
        factorId={factorId}
        onTotpStateChange={handleTotpStateChange}
      />
    </div>
  )
}