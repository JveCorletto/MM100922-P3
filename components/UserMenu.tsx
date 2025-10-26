"use client"
import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"
import { useMobile } from "@/hooks/use-mobile"

export default function UserMenu() {
  const [user, setUser] = useState<any>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const isMobile = useMobile()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user || null))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user || null)
    })
    return () => {
      sub?.subscription?.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  const logout = async () => {
    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  if (!mounted) return null

  if (!user) {
    return (
      <div className="relative" ref={menuRef}>
        {/* Botón hamburguesa para móviles */}
        {isMobile && (
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 hover:bg-gray-100 rounded"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}

        {/* Menú desktop */}
        <nav className="hidden md:flex gap-4 text-sm">
          <Link href="/courses">Cursos</Link>
          <Link href="/login">Login</Link>
          <Link href="/register">Register</Link>
        </nav>

        {/* Menú móvil desplegable */}
        {isMobile && isOpen && (
          <nav className="absolute top-full right-0 bg-white border border-gray-200 rounded-md shadow-lg flex flex-col gap-2 p-3 text-sm z-50 mt-2 w-40 text-gray-900">
            <Link href="/courses" onClick={() => setIsOpen(false)} className="px-2 py-1 hover:bg-gray-100 rounded">
              Cursos
            </Link>
            <Link href="/login" onClick={() => setIsOpen(false)} className="px-2 py-1 hover:bg-gray-100 rounded">
              Login
            </Link>
            <Link href="/register" onClick={() => setIsOpen(false)} className="px-2 py-1 hover:bg-gray-100 rounded">
              Register
            </Link>
          </nav>
        )}
      </div>
    )
  }

  // Preferir nombre si existe en metadata; fallback al email
  const displayName =
    (user?.user_metadata && (user.user_metadata.name || user.user_metadata.full_name)) || user?.email

  return (
    <div className="relative" ref={menuRef}>
      {/* Botón hamburguesa para móviles */}
      {isMobile && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden p-2 hover:bg-gray-100 rounded"
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}

      {/* Menú desktop */}
      <div className="hidden md:flex items-center gap-3">
        {/* Ahora el correo/nombre es clickeable hacia /profile */}
        <Link href="/profile" className="text-sm opacity-80 hover:underline">
          {displayName}
        </Link>
        <Link className="text-sm underline" href="/dashboard">
          Dashboard
        </Link>
        <Link className="text-sm underline" href="/courses">
          Cursos
        </Link>
        <button className="btn" onClick={logout}>
          Cerrar sesión
        </button>
      </div>

      {/* Menú móvil desplegable */}
      {isMobile && isOpen && (
        <div className="absolute top-full right-0 bg-white border border-gray-200 rounded-md shadow-lg flex flex-col gap-2 p-3 text-sm z-50 mt-2 w-56 text-gray-900">
          {/* El encabezado ahora también te lleva a /profile */}
          <Link
            href="/profile"
            onClick={() => setIsOpen(false)}
            className="text-gray-700 px-2 py-1 text-xs font-semibold hover:bg-gray-100 rounded"
          >
            {displayName} — Mi perfil
          </Link>
          <Link
            className="text-blue-600 hover:text-blue-800 px-2 py-1 hover:bg-gray-100 rounded"
            href="/dashboard"
            onClick={() => setIsOpen(false)}
          >
            Dashboard
          </Link>
          <Link
            className="text-blue-600 hover:text-blue-800 px-2 py-1 hover:bg-gray-100 rounded"
            href="/courses"
            onClick={() => setIsOpen(false)}
          >
            Cursos
          </Link>
          <button
            className="btn w-full text-xs"
            onClick={() => {
              logout()
              setIsOpen(false)
            }}
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}