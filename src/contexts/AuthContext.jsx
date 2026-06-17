import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, getUserWithRole } from '../lib/supabase'
import { mockUser } from '../lib/mockData'

const AuthContext = createContext()

const useMockData = import.meta.env.VITE_USE_MOCK_DATA === 'true'

// Verifica sincrónicamente si hay sesión en localStorage — no depende de Supabase
function hasLocalSession() {
  try {
    const raw = localStorage.getItem('educa-auth')
    if (!raw) return false
    const parsed = JSON.parse(raw)
    return !!(parsed.access_token && parsed.expires_at > Math.floor(Date.now() / 1000))
  } catch {
    return false
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(useMockData ? mockUser : null)
  const [loading, setLoading] = useState(!useMockData)
  const [authError, setAuthError] = useState(null) // Error recuperable

  useEffect(() => {
    if (useMockData) return

    let isMounted = true
    let timeoutId = null

    async function restoreSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (!isMounted) return

        if (session?.user) {
          const userWithRole = await getUserWithRole()
          if (isMounted) {
            setUser(userWithRole)
            setAuthError(null)
          }
        } else if (hasLocalSession()) {
          // Caso borde: localStorage tiene sesión pero getSession() devolvió null
          // Posible token corrupto — limpiar y reintentar
          console.warn('AuthContext: localStorage session invalid, clearing')
          localStorage.removeItem('educa-auth')
        }
      } catch (err) {
        console.error('AuthContext: getSession() failed:', err)
        if (isMounted && hasLocalSession()) {
          // Sesión local existe pero Supabase falló → error de red, no borrar sesión
          setAuthError('No se pudo verificar la sesión. Verificá tu conexión.')
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    // Si hay sesión en localStorage, restaurarla sin timeout agresivo
    // Si NO hay sesión, dar 8 segundos máximo (evita spinner infinito)
    const hasSession = hasLocalSession()

    if (hasSession) {
      // Hay datos locales → confiar en que getSession() resolverá
      restoreSession()
    } else {
      // Sin datos locales → timeout de 8s como safety net
      timeoutId = setTimeout(() => {
        if (isMounted) {
          console.warn('AuthContext: no local session, giving up after 8s')
          setLoading(false)
        }
      }, 8000)
      restoreSession().finally(() => clearTimeout(timeoutId))
    }

    // Auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        try {
          const userWithRole = await getUserWithRole()
          if (isMounted) {
            setUser(userWithRole)
            setAuthError(null)
          }
        } catch (err) {
          console.error('AuthContext: error updating role:', err)
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setAuthError(null)
      }
    })

    return () => {
      isMounted = false
      clearTimeout(timeoutId)
      listener?.subscription.unsubscribe()
    }
  }, [])

  const login = async (identifier, password) => {
    if (useMockData) {
      setUser(mockUser)
      return { user: mockUser }
    }

    let finalEmail = identifier
    if (!identifier.includes('@')) {
      const { data: rpcEmail, error: rpcError } = await supabase.rpc('get_login_email', { identifier })
      if (!rpcError && rpcEmail) {
        finalEmail = rpcEmail
      }
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email: finalEmail, password })
    if (error) throw error
    setAuthError(null)
    return data
  }

  const logout = async () => {
    if (!useMockData) {
      await supabase.auth.signOut()
    }
    setUser(null)
    setAuthError(null)
  }

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      loading,
      authError,
      isSuperAdmin: user?.role === 'super_admin',
      isAdminSede: user?.role === 'admin_sede',
      isEstudiante: user?.role === 'estudiante',
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
