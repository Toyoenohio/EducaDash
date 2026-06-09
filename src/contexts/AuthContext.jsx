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

    getUserWithRole().then(setUser).finally(() => setLoading(false))

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const userWithRole = await getUserWithRole()
          setUser(userWithRole)
        } else {
          setUser(null)
        }
      }
    )
    return () => listener.subscription.unsubscribe()
  }, [])

  const login = async (email, password) => {
    if (useMockData) {
      setUser(mockUser)
      return { user: mockUser }
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
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
