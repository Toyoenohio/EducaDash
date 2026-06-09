import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { mockCursos as initialMockCursos, mockSecciones as initialMockSecciones, mockCursoSede as initialMockCursoSede, mockSedes } from '../lib/mockData'

const useMockData = import.meta.env.VITE_USE_MOCK_DATA === 'true'

export function useCursos() {
  const [cursos, setCursos] = useState([])
  const [secciones, setSecciones] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchCursos = async () => {
    setLoading(true)
    if (useMockData) {
      await new Promise(r => setTimeout(r, 400))
      setCursos(initialMockCursos)
      // Enrich secciones with curso and sede names
      const enrichedSecciones = initialMockSecciones.map(sec => {
        const cs = initialMockCursoSede.find(cs => cs.id === sec.curso_sede_id)
        const curso = cs ? initialMockCursos.find(c => c.id === cs.curso_id) : null
        const sede = cs ? mockSedes.find(s => s.id === cs.sede_id) : null
        return { ...sec, curso_sede: { curso, sede } }
      })
      setSecciones(enrichedSecciones)
      setLoading(false)
      return
    }
    const { data: cursosData } = await supabase.from('cursos').select('*').order('nombre')
    if (cursosData) setCursos(cursosData)

    const { data: seccionesData } = await supabase.from('secciones').select(`
      *,
      curso_sede:curso_sede_id (
        sede:sedes(id, nombre),
        curso:cursos(id, nombre)
      )
    `)
    if (seccionesData) setSecciones(seccionesData)
    setLoading(false)
  }

  const createCurso = async (cursoData) => {
    const { nombre, descripcion, secciones = [] } = cursoData
    const curso = { nombre, descripcion }

    if (useMockData) {
      const generateId = () => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2);
      const newCurso = { ...curso, id: generateId(), activo: true, created_at: new Date().toISOString() }
      setCursos(prev => [...prev, newCurso])

      secciones.forEach((sec, index) => {
        if (sec.sede_id && sec.fecha_inicio && sec.cupos) {
          const sede = mockSedes.find(s => s.id === sec.sede_id)
          const newSeccion = {
            id: generateId(),
            curso_sede_id: generateId(),
            codigo: String.fromCharCode(65 + index),
            tipo: 'presencial',
            dias: sec.dias && sec.dias.length > 0 ? sec.dias : ['Por definir'],
            horario_inicio: sec.horario_inicio || '08:00:00',
            horario_fin: sec.horario_fin || '10:00:00',
            cupo_maximo: parseInt(sec.cupos, 10),
            cupo_disponible: parseInt(sec.cupos, 10),
            fecha_inicio: sec.fecha_inicio,
            profesor: 'Por asignar',
            created_at: new Date().toISOString(),
            curso_sede: {
              curso: newCurso,
              sede: sede
            }
          }
          setSecciones(prev => [...prev, newSeccion])
        }
      })

      return { data: [newCurso], error: null }
    }
    
    // Real Supabase implementation
    const { data, error } = await supabase.from('cursos').insert([curso]).select()
    if (error) return { data: null, error }

    const newCurso = data[0]

    for (let i = 0; i < secciones.length; i++) {
      const sec = secciones[i]
      if (sec.sede_id && sec.fecha_inicio && sec.cupos) {
        let csId = null;
        // Check if curso_sede already exists for this curso and sede
        const { data: existingCs } = await supabase.from('curso_sede').select('id').eq('curso_id', newCurso.id).eq('sede_id', sec.sede_id).limit(1)
        
        if (existingCs && existingCs.length > 0) {
          csId = existingCs[0].id;
        } else {
          // Create curso_sede
          const { data: csData, error: csError } = await supabase.from('curso_sede').insert([{
            curso_id: newCurso.id,
            sede_id: sec.sede_id
          }]).select()
          if (!csError && csData && csData.length > 0) {
            csId = csData[0].id;
          }
        }

        if (csId) {
          // Create seccion
          await supabase.from('secciones').insert([{
            curso_sede_id: csId,
            codigo: String.fromCharCode(65 + i),
            dias: sec.dias && sec.dias.length > 0 ? sec.dias : ['Por definir'],
            horario_inicio: sec.horario_inicio || '08:00:00',
            horario_fin: sec.horario_fin || '10:00:00',
            cupo_maximo: parseInt(sec.cupos, 10),
            cupo_disponible: parseInt(sec.cupos, 10),
            profesor: 'Por asignar'
          }])
        }
      }
    }

    setCursos(prev => [...prev, newCurso])
    fetchCursos() // Refresh to get the new sections
    return { data: [newCurso], error: null }
  }

  const updateCurso = async (id, updates) => {
    // Separate course updates from section updates
    const { nombre, descripcion, activo, secciones = [] } = updates
    const cursoUpdates = {}
    if (nombre !== undefined) cursoUpdates.nombre = nombre
    if (descripcion !== undefined) cursoUpdates.descripcion = descripcion
    if (activo !== undefined) cursoUpdates.activo = activo

    if (useMockData) {
      setCursos(prev => prev.map(c => c.id === id ? { ...c, ...cursoUpdates } : c))
      // Mock section update skipped for simplicity
      return { data: [{ id, ...cursoUpdates }], error: null }
    }

    const { data, error } = await supabase.from('cursos').update(cursoUpdates).eq('id', id).select()
    
    // Update or insert sections
    if (!error && secciones && secciones.length > 0) {
      for (let i = 0; i < secciones.length; i++) {
        const sec = secciones[i]
        
        // Formatted updates for section
        const secUpdates = {}
        if (sec.dias && sec.dias.length > 0) secUpdates.dias = sec.dias
        if (sec.horario_inicio) secUpdates.horario_inicio = sec.horario_inicio.length === 5 ? sec.horario_inicio + ':00' : sec.horario_inicio
        if (sec.horario_fin) secUpdates.horario_fin = sec.horario_fin.length === 5 ? sec.horario_fin + ':00' : sec.horario_fin
        if (sec.cupos) {
          secUpdates.cupo_maximo = parseInt(sec.cupos, 10)
          secUpdates.cupo_disponible = parseInt(sec.cupos, 10) 
        }

        if (sec.isExisting && sec.id) {
          // It's an existing section, we need to update it.
          // First, get its curso_sede_id to update sede
          const { data: secData } = await supabase.from('secciones').select('curso_sede_id').eq('id', sec.id).limit(1)
          if (secData && secData.length > 0) {
            const csId = secData[0].curso_sede_id
            if (sec.sede_id) {
              await supabase.from('curso_sede').update({ sede_id: sec.sede_id }).eq('id', csId)
            }
            if (Object.keys(secUpdates).length > 0) {
              await supabase.from('secciones').update(secUpdates).eq('id', sec.id)
            }
          }
        } else if (sec.sede_id && sec.fecha_inicio && sec.cupos) {
          // It's a newly added section in edit mode, insert it
          let csId = null;
          const { data: existingCs } = await supabase.from('curso_sede').select('id').eq('curso_id', id).eq('sede_id', sec.sede_id).limit(1)
          
          if (existingCs && existingCs.length > 0) {
            csId = existingCs[0].id;
          } else {
            const { data: csData, error: csError } = await supabase.from('curso_sede').insert([{
              curso_id: id,
              sede_id: sec.sede_id
            }]).select()
            if (!csError && csData && csData.length > 0) {
              csId = csData[0].id;
            }
          }

          if (csId) {
            await supabase.from('secciones').insert([{
              curso_sede_id: csId,
              codigo: String.fromCharCode(65 + i), // A, B, C... depending on index
              dias: sec.dias && sec.dias.length > 0 ? sec.dias : ['Por definir'],
              horario_inicio: sec.horario_inicio ? (sec.horario_inicio.length === 5 ? sec.horario_inicio + ':00' : sec.horario_inicio) : '08:00:00',
              horario_fin: sec.horario_fin ? (sec.horario_fin.length === 5 ? sec.horario_fin + ':00' : sec.horario_fin) : '10:00:00',
              cupo_maximo: parseInt(sec.cupos, 10),
              cupo_disponible: parseInt(sec.cupos, 10),
              profesor: 'Por asignar'
            }])
          }
        }
      }
    }

    if (!error) {
      fetchCursos() // Refresh full state to get updated sections
      setCursos(prev => prev.map(c => c.id === id ? data[0] : c))
    }
    return { data, error }
  }

  const deleteCurso = async (id) => {
    if (useMockData) {
      setCursos(prev => prev.filter(c => c.id !== id))
      return { error: null }
    }
    const { error } = await supabase.from('cursos').delete().eq('id', id)
    if (!error) setCursos(prev => prev.filter(c => c.id !== id))
    return { error }
  }

  useEffect(() => { fetchCursos() }, [])

  return { cursos, secciones, loading, fetchCursos, createCurso, updateCurso, deleteCurso }
}
