import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { mockInscripciones as initialMockInscripciones } from '../../../lib/mockData'

const useMockData = import.meta.env.VITE_USE_MOCK_DATA === 'true'

export function useInscripciones() {
  const [inscripciones, setInscripciones] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchInscripciones = async () => {
    setLoading(true)
    if (useMockData) {
      await new Promise(r => setTimeout(r, 400))
      setInscripciones(initialMockInscripciones)
      setLoading(false)
      return
    }
    try {
      const { data, error } = await supabase
        .from('inscripciones')
        .select(`
          *,
          alumno:alumnos(id, nombre, apellido, cedula, telefono),
          seccion:secciones(id, codigo, dias, horario_inicio, horario_fin,
            curso_sede:curso_sede_id(
              curso:cursos(nombre),
              sede:sedes(nombre)
            )
          )
        `)
        .order('created_at', { ascending: false })
      if (!error) setInscripciones(data)
    } finally {
      setLoading(false)
    }
  }

  const createInscripcion = async (inscripcion) => {
    if (useMockData) {
      const newInscripcion = { ...inscripcion, id: crypto.randomUUID(), estado: 'pendiente', created_at: new Date().toISOString() }
      setInscripciones(prev => [newInscripcion, ...prev])
      return { data: [newInscripcion], error: null }
    }
    const { data, error } = await supabase.from('inscripciones').insert([{ ...inscripcion, estado: 'pendiente' }]).select()
    if (error?.code === 'P0001') {
      return { data: null, error: { ...error, message: 'No hay cupos disponibles en esta sección' } }
    }
    if (!error) {
      fetchInscripciones() // Refresh to get enriched data
    }
    return { data, error }
  }

  const retirarInscripcion = async (id) => {
    if (useMockData) {
      setInscripciones(prev => prev.map(i => i.id === id ? { ...i, estado: 'retirada' } : i))
      return { data: [{ id, estado: 'retirada' }], error: null }
    }
    const { data, error } = await supabase
      .from('inscripciones')
      .update({ estado: 'retirada' })
      .eq('id', id)
      .select()
    if (!error) setInscripciones(prev => prev.map(i => i.id === id ? { ...i, estado: 'retirada' } : i))
    return { data, error }
  }

  useEffect(() => { fetchInscripciones() }, [])

  return { inscripciones, loading, fetchInscripciones, createInscripcion, retirarInscripcion }
}
