'use client'
import { supabase } from '@/lib/supabaseClient'

export function OpenMaterialButton({ path }: { path: string }) {
  const openIt = async () => {
    const { data, error } = await supabase.storage.from('materials').createSignedUrl(path, 60*10)
    if (error) { alert(error.message); return }
    window.open(data.signedUrl, '_blank')
  }
  return <button className="btn" onClick={openIt}>Ver material</button>
}