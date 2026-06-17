import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, getUserWithRole } from '../lib/supabase'
import { mockUser } from '../lib/mockData'

const AuthContext = createContext()

const useMockData = import.meta.env.VITE_USE_MOCK_DATA === 'true'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(useMockData ? mockUser : null)
  const [loading, setLoading] = useState(!useMockData)

  useEffect(() => {
    if (useMockData) return

    let timeoutId
    let isMounted = true

    // Safety timeout: force loading=false after 8s if Supabase hangs
    timeoutId = setTimeout(() => {
      if (isMounted) {
        console.warn('AuthContext: getSession() timed out after 8s, forcing loading=false')
        setLoading(false)
      }
    }, 8000)

    // Handle initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      clearTimeout(timeoutId)
      if (!isMounted) return
      try {
        if (session?.user) {
          const userWithRole = await getUserWithRole()
          if (isMounted) setUser(userWithRole)
        }
      } catch (err) {
        console.error('Error fetching initial role:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }).catch((err) => {
      console.error('getSession() failed:', err)
      clearTimeout(timeoutId)
      if (isMounted) setLoading(false)
    });

    // Handle subsequent events
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        try {
          const userWithRole = await getUserWithRole()
          setUser(userWithRole)
        } catch (err) {
          console.error('Error updating role:', err)
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
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
    
    // Check if it's an email format, otherwise ask RPC
    let finalEmail = identifier;
    if (!identifier.includes('@')) {
      const { data: rpcEmail, error: rpcError } = await supabase.rpc('get_login_email', { identifier })
      if (!rpcError && rpcEmail) {
        finalEmail = rpcEmail
      }
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email: finalEmail, password })
    if (error) throw error
    return data
  }

  const logout = async () => {
    if (!useMockData) {
      await supabase.auth.signOut()
    }
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      loading,
      isSuperAdmin: user?.role === 'super_admin',
      isAdminSede: user?.role === 'admin_sede',
      isEstudiante: user?.role === 'estudiante',
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
