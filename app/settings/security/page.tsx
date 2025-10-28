"use client"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import toast from "react-hot-toast"

export default function SecuritySettings() {
  const [secret, setSecret] = useState<string | null>(null)
  const [qr, setQr] = useState<string | null>(null)
  const [token, setToken] = useState("")
  const [factorId, setFactorId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [hasTotp, setHasTotp] = useState(false)

  useEffect(() => { checkTotpStatus() }, [])

  const checkTotpStatus = async () => {
    const { data, error } = await supabase.auth.mfa.listFactors()
    if (error) {
      console.error("Error checking TOTP status:", error)
      return
    }
    const totpActive = !!data?.all?.some(f => f.factor_type === "totp" && f.status === "verified")
    setHasTotp(totpActive)
  }

  const setupTotp = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" })
      if (error) { 
        toast.error(error.message); 
        return 
      }

      // ✅ Solo guardamos localmente, NO se envía a la DB hasta verificación
      if (data && data.type === "totp" && data.totp) {
        setSecret(data.totp.secret ?? null)
        setQr(data.totp.qr_code ?? null)  // Usamos qr_code que es el estándar
        setFactorId(data.id ?? null)
        toast.success("Código QR generado. Escanéalo y verifica con el código de 6 dígitos.")
      } else {
        toast.error("No se pudo inicializar TOTP")
      }
    } catch (error) {
      toast.error("Error al configurar TOTP")
    } finally {
      setLoading(false)
    }
  }

  const verifyTotp = async () => {
    if (!factorId) { 
      toast.error("Error en la configuración"); 
      return 
    }
    
    if (token.length !== 6) {
      toast.error("El código debe tener 6 dígitos")
      return
    }

    setLoading(true)

    try {
      // ✅ Primero creamos un desafío
      const { data: challenge, error: chErr } = await supabase.auth.mfa.challenge({ factorId })
      if (chErr || !challenge?.id) { 
        toast.error(chErr?.message ?? "No se pudo iniciar el desafío"); 
        return 
      }

      // ✅ Verificamos el código (aquí es cuando realmente se activa en Supabase)
      const { error: verErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: token
      })
      
      if (verErr) {
        toast.error(verErr.message)
      } else {
        toast.success("✅ Autenticación en dos pasos activada correctamente")
        setSecret(null)
        setQr(null)
        setToken("")
        setFactorId(null)
        await checkTotpStatus()
      }
    } catch (error) {
      toast.error("Error al verificar el código")
    } finally {
      setLoading(false)
    }
  }

  const removeTotp = async () => {
    if (!confirm("¿Estás seguro de que quieres desactivar la autenticación en dos pasos? Esto reduce la seguridad de tu cuenta.")) {
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.auth.mfa.listFactors()
      if (error) { 
        toast.error(error.message); 
        return 
      }

      const verified = data?.all?.find(f => f.factor_type === "totp" && f.status === "verified")
      if (!verified) { 
        toast.error("No hay TOTP activo"); 
        return 
      }

      const { error: unErr } = await supabase.auth.mfa.unenroll({ factorId: verified.id })
      if (unErr) {
        toast.error(unErr.message)
      } else {
        toast.success("🔓 Autenticación en dos pasos desactivada")
        setHasTotp(false)
      }
    } catch (error) {
      toast.error("Error al desactivar TOTP")
    } finally {
      setLoading(false)
    }
  }

  const cancelSetup = () => {
    setSecret(null)
    setQr(null)
    setToken("")
    setFactorId(null)
    toast("Configuración de TOTP cancelada")
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center sm:text-left">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          Seguridad
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Gestiona la seguridad de tu cuenta
        </p>
      </div>

      {/* Estado del TOTP */}
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg sm:rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-full ${hasTotp ? 'bg-green-100 dark:bg-green-900/20' : 'bg-yellow-100 dark:bg-yellow-900/20'}`}>
              {hasTotp ? (
                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Autenticación en dos pasos (TOTP)
              </h2>
              <p className={`text-sm ${hasTotp ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                {hasTotp ? "🟢 Activada - Tu cuenta está protegida" : "🟡 No activada - Recomendado activar"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      {hasTotp ? (
        // TOTP ya activado
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg sm:rounded-xl p-6 space-y-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">Ya tienes activada la autenticación TOTP.</span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Cada vez que inicies sesión, necesitarás ingresar un código de verificación de tu aplicación autenticadora.
          </p>
          <button 
            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white py-2.5 px-6 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            onClick={removeTotp} 
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Desactivando...
              </div>
            ) : (
              "Desactivar autenticación en dos pasos"
            )}
          </button>
        </div>
      ) : !qr ? (
        // Configuración inicial
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg sm:rounded-xl p-6 space-y-4 border border-gray-200 dark:border-gray-700">
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Protege tu cuenta</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              La autenticación en dos pasos añade una capa adicional de seguridad a tu cuenta. 
              Necesitarás una aplicación autenticadora como Google Authenticator o Authy.
            </p>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <li className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Protege tu cuenta contra accesos no autorizados</span>
              </li>
              <li className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Requiere verificación adicional al iniciar sesión</span>
              </li>
              <li className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Compatible con la mayoría de aplicaciones autenticadoras</span>
              </li>
            </ul>
          </div>
          <button 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            onClick={setupTotp} 
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Generando código QR...
              </div>
            ) : (
              "Configurar autenticación en dos pasos"
            )}
          </button>
        </div>
      ) : (
        // Verificación del TOTP
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg sm:rounded-xl p-6 space-y-6 border border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Verificar autenticación</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Escanea el código QR con tu aplicación autenticadora e ingresa el código de 6 dígitos
            </p>
          </div>

          {/* Código QR */}
          <div className="flex flex-col items-center space-y-4">
            {qr && (
              <div className="bg-white p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                <img src={qr} alt="QR Code para autenticación" className="w-48 h-48 sm:w-56 sm:h-56" />
              </div>
            )}
            
            {secret && (
              <div className="text-center space-y-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">O ingresa este código manualmente:</p>
                <code className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-3 py-2 rounded-lg text-sm font-mono border border-gray-200 dark:border-gray-600">
                  {secret}
                </code>
              </div>
            )}
          </div>

          {/* Input de verificación */}
          <div className="space-y-3">
            <label htmlFor="token" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Código de verificación de 6 dígitos
            </label>
            <input
              id="token"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors text-center text-lg font-mono"
              placeholder="123456"
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
            />
          </div>

          {/* Botones de acción */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button 
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
              onClick={verifyTotp} 
              disabled={loading || token.length !== 6}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Verificando...
                </div>
              ) : (
                "Verificar y activar"
              )}
            </button>
            
            <button 
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 py-2.5 px-4 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
              onClick={cancelSetup}
              disabled={loading}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}