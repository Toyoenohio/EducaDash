import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { mockUser } from '../lib/mockData'

const AuthContext = createContext()

const useMockData = import.meta.env.VITE_USE_MOCK_DATA === 'true'
const STORAGE_KEY = 'educa-auth'

// ── helpers locales (cero dependencia de Supabase) ──

function readLocalSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed.access_token || !parsed.user) return null
    if (parsed.expires_at < Math.floor(Date.now() / 1000)) return null
    return parsed
  } catch { return null }
}

function buildUserFromLocalSession(session) {
  if (!session?.user) return null
  const u = session.user
  return {
    id: u.id,
    email: u.email,
    role: u.user_metadata?.role || 'estudiante',
    sede_id: u.user_metadata?.sede_id || null,
    alumno_id: u.user_metadata?.alumno_id || null,
    ...u,
  }
}

// ── proveedor ──

export function AuthProvider({ children }) {
  // 1) Si hay sesión local → arrancar con usuario YA (sin esperar red)
  const localSession = useMockData ? null : readLocalSession()
  const [user, setUser] = useState(
    useMockData ? mockUser : buildUserFromLocalSession(localSession)
  )
  // loading solo es true si NO hay sesión local Y no es mock
  const [loading, setLoading] = useState(!useMockData && !localSession)
  const [authError, setAuthError] = useState(null)

  useEffect(() => {
    if (useMockData) return
    let isMounted = true

    // Verificar en background (no bloquea la UI)
    async function verifySession() {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (!isMounted) return

        if (session?.user) {
          // Si el SDK devuelve usuario, actualizar con metadata fresca
          const fresh = {
            ...session.user,
            role: session.user.user_metadata?.role || 'estudiante',
            sede_id: session.user.user_metadata?.sede_id || null,
            alumno_id: session.user.user_metadata?.alumno_id || null,
          }
          setUser(fresh)
        } else if (localSession) {
          // El SDK dice que no hay sesión pero localStorage sí → token expirado/inválido
          setUser(null)
        }
      } catch {
        // Error de red: mantener el usuario local si existe
        if (isMounted && !localSession) setUser(null)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    verifySession()

    // Listener para cambios de auth
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return

      if (event === 'SIGNED_OUT') {
        setUser(null)
        setAuthError(null)
      } else if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        const fresh = {
          ...session.user,
          role: session.user.user_metadata?.role || 'estudiante',
          sede_id: session.user.user_metadata?.sede_id || null,
          alumno_id: session.user.user_metadata?.alumno_id || null,
        }
        setUser(fresh)
        setAuthError(null)
      }
    })

    return () => {
      isMounted = false
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
      if (!rpcError && rpcEmail) finalEmail = rpcEmail
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email: finalEmail, password })
    if (error) throw error
    setAuthError(null)
    setLoading(false)
    return data
  }

  const logout = async () => {
    if (!useMockData) await supabase.auth.signOut()
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
