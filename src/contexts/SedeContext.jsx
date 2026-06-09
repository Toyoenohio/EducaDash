import { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'

const SedeContext = createContext()

export function SedeProvider({ children }) {
  const { user, isSuperAdmin } = useAuth()
  const [selectedSede, setSelectedSede] = useState('todas')

  // Set default sede based on user role
  useEffect(() => {
    if (user) {
      if (isSuperAdmin) {
        setSelectedSede('todas')
      } else if (user.sede_id) {
        setSelectedSede(user.sede_id)
      }
    }
  }, [user, isSuperAdmin])

  return (
    <SedeContext.Provider value={{ selectedSede, setSelectedSede }}>
      {children}
    </SedeContext.Provider>
  )
}

export const useSede = () => useContext(SedeContext)
