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

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Only fetch role if we don't already have it
        const userWithRole = await getUserWithRole()
        setUser(userWithRole)
      } else {
        setUser(null)
      }
      setLoading(false)
    })
    
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      try {
        if (session?.user && !user) {
          const userWithRole = await getUserWithRole()
          setUser(userWithRole)
        }
      } catch (err) {
        console.error('Error fetching initial role:', err)
      } finally {
        setLoading(false)
      }
    });

    return () => listener?.subscription.unsubscribe()
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
