import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { mockAsistencia as initialMockAsistencia } from '../lib/mockData'

const useMockData = import.meta.env.VITE_USE_MOCK_DATA === 'true'

export function useAsistencia() {
  const [asistencia, setAsistencia] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchAsistencia = async () => {
    setLoading(true)
    if (useMockData) {
      await new Promise(r => setTimeout(r, 400))
      setAsistencia(initialMockAsistencia)
      setLoading(false)
      return
    }
    const { data, error } = await supabase
      .from('asistencia')
      .select(`
        *,
        inscripcion:inscripcion_id(
          alumno:alumno_id(nombre, apellido, cedula),
          seccion:seccion_id(
            codigo,
            curso_sede:curso_sede_id(
              curso:cursos(nombre, id),
              sede:sedes(nombre)
            )
          )
        )
      `)
      .order('fecha', { ascending: false })
    
    if (!error && data) {
      setAsistencia(data)
    }
    setLoading(false)
  }

  const registrarAsistencia = async (registro) => {
    if (useMockData) {
      const newRegistro = { ...registro, id: crypto.randomUUID(), created_at: new Date().toISOString() }
      setAsistencia(prev => [newRegistro, ...prev])
      return { data: [newRegistro], error: null }
    }
    
    const { data, error } = await supabase
      .from('asistencia')
      .upsert([registro], { onConflict: 'inscripcion_id, fecha' })
      .select()
      
    if (!error) fetchAsistencia()
    return { data, error }
  }

  useEffect(() => { fetchAsistencia() }, [])

  return { asistencia, loading, fetchAsistencia, registrarAsistencia }
}
