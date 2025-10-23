'use client'
import { useEffect } from 'react'

export default function ConfirmModal({
  open, title, message, confirmText = 'Confirmar', cancelText = 'Cancelar',
  onConfirm, onCancel
}: {
  open: boolean
  title: string
  message?: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])

  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[#121826] rounded-2xl p-6 w-[90%] max-w-md space-y-4">
        <div className="text-xl font-semibold">{title}</div>
        {message && <div className="text-sm text-gray-300">{message}</div>}
        <div className="flex gap-2 justify-end">
          <button className="btn" onClick={onConfirm}>{confirmText}</button>
          <button className="btn" onClick={onCancel}>{cancelText}</button>
        </div>
      </div>
    </div>
  )
}