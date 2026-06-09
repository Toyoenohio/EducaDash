import { useState, useEffect, useCallback } from 'react'
import { supabase, supabaseAdmin } from '../lib/supabase'
import { mockAlumnos as initialMockAlumnos } from '../lib/mockData'

const useMockData = import.meta.env.VITE_USE_MOCK_DATA === 'true'

export function useAlumnos() {
  const [alumnos, setAlumnos] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const fetchAlumnos = async () => {
    setLoading(true)
    if (useMockData) {
      await new Promise(r => setTimeout(r, 400))
      setAlumnos(initialMockAlumnos)
      setLoading(false)
      return
    }
    const { data, error } = await supabase.from('alumnos').select('*').order('created_at', { ascending: false })
    if (!error) setAlumnos(data)
    setLoading(false)
  }

  const searchAlumnos = useCallback((term) => {
    setSearchTerm(term)
  }, [])

  const filteredAlumnos = alumnos.filter(a => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      a.nombre.toLowerCase().includes(term) ||
      a.apellido.toLowerCase().includes(term) ||
      a.cedula.toLowerCase().includes(term) ||
      a.email.toLowerCase().includes(term)
    )
  })

  const createAlumno = async (alumnoData) => {
    if (useMockData) {
      const newAlumno = { ...alumnoData, id: crypto.randomUUID(), created_at: new Date().toISOString() }
      setAlumnos(prev => [...prev, newAlumno])
      return { data: [newAlumno], error: null }
    }
    
    // Clean data
    const cleanData = { ...alumnoData }
    if (cleanData.fecha_nacimiento === '') cleanData.fecha_nacimiento = null

    // Attempt to create Auth User if supabaseAdmin is available and email exists
    if (supabaseAdmin && cleanData.email) {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: cleanData.email,
        password: 'Educa2026*',
        email_confirm: true,
        user_metadata: {
          nombre: cleanData.nombre,
          apellido: cleanData.apellido,
          cedula: cleanData.cedula
        }
      })
      
      // If error is not "User already registered", throw error
      if (authError && authError.message !== 'User already registered') {
        console.error("Error creating auth user:", authError)
        return { data: null, error: authError }
      }

      // Sync the ID from auth to keep it consistent
      if (authData?.user) {
        cleanData.id = authData.user.id
      }
    } else if (!supabaseAdmin) {
      console.warn("supabaseAdmin no está configurado. No se creó el usuario en Auth. Falta VITE_SUPABASE_SERVICE_ROLE_KEY en .env")
    }

    const { data, error } = await supabase.from('alumnos').insert([cleanData]).select()
    if (!error) setAlumnos(prev => [...prev, data[0]])
    return { data, error }
  }

  const updateAlumno = async (id, updates) => {
    if (useMockData) {
      setAlumnos(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a))
      return { data: [{ id, ...updates }], error: null }
    }
    
    // Clean up empty strings for date fields and optionals
    const cleanUpdates = { ...updates }
    if (cleanUpdates.fecha_nacimiento === '') cleanUpdates.fecha_nacimiento = null
    
    const { data, error } = await supabase.from('alumnos').update(cleanUpdates).eq('id', id).select()
    if (!error) setAlumnos(prev => prev.map(a => a.id === id ? data[0] : a))
    return { data, error }
  }

  const deleteAlumno = async (id) => {
    if (useMockData) {
      setAlumnos(prev => prev.filter(a => a.id !== id))
      return { error: null }
    }
    const { error } = await supabase.from('alumnos').delete().eq('id', id)
    if (!error) setAlumnos(prev => prev.filter(a => a.id !== id))
    return { error }
  }

  useEffect(() => { fetchAlumnos() }, [])

  return { alumnos: filteredAlumnos, allAlumnos: alumnos, loading, searchTerm, searchAlumnos, fetchAlumnos, createAlumno, updateAlumno, deleteAlumno }
}
