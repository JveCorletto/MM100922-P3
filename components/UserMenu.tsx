'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

export default function UserMenu() {
    const [user, setUser] = useState<any>(null)

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setUser(data.user || null))
        const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
            setUser(session?.user || null)
        })
        return () => { sub?.subscription?.unsubscribe() }
    }, [])

    const logout = async () => {
        await supabase.auth.signOut()
        window.location.href = '/login'
    }

    if (!user) {
        return (
            <nav className="flex gap-4 text-sm">
                <Link href="/courses">Cursos</Link>
                <Link href="/login">Login</Link>
                <Link href="/register">Register</Link>
            </nav>
        )
    }

    return (
        <div className="flex items-center gap-3">
            <span className="text-sm opacity-80">{user?.email}</span>
            <a className="text-sm underline" href="/dashboard">Dashboard</a>
            <a className="text-sm underline" href="/courses">Cursos</a>
            <button className="btn" onClick={logout}>Cerrar sesión</button>
        </div>
    )
}