import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { mockCursos as initialMockCursos, mockSecciones as initialMockSecciones, mockCursoSede as initialMockCursoSede, mockSedes } from '../../../lib/mockData'

const useMockData = import.meta.env.VITE_USE_MOCK_DATA === 'true'

let mockCursosState = [...initialMockCursos]
let mockSeccionesState = [...initialMockSecciones]

export function useCursos() {
  const queryClient = useQueryClient()

  const { data = { cursos: [], secciones: [] }, isLoading: loading, refetch: fetchCursos } = useQuery({
    queryKey: ['cursos_y_secciones'],
    queryFn: async () => {
      if (useMockData) {
        await new Promise(r => setTimeout(r, 400))
        const enrichedSecciones = mockSeccionesState.map(sec => {
          const cs = initialMockCursoSede.find(cs => cs.id === sec.curso_sede_id)
          const curso = cs ? mockCursosState.find(c => c.id === cs.curso_id) : null
          const sede = cs ? mockSedes.find(s => s.id === cs.sede_id) : null
          return { ...sec, curso_sede: { curso, sede } }
        })
        return { cursos: [...mockCursosState], secciones: enrichedSecciones }
      }
      
      const { data: cursosData, error: cursosError } = await supabase.from('cursos').select('*').order('nombre')
      if (cursosError) throw cursosError

      const { data: seccionesData, error: seccionesError } = await supabase.from('secciones').select(`
        *,
        curso_sede:curso_sede_id (
          sede:sedes(id, nombre),
          curso:cursos(id, nombre)
        )
      `)
      if (seccionesError) throw seccionesError

      return { cursos: cursosData || [], secciones: seccionesData || [] }
    }
  })

  const { mutateAsync: createCurso } = useMutation({
    mutationFn: async (cursoData) => {
      const { nombre, descripcion, secciones = [] } = cursoData
      const curso = { nombre, descripcion }

      if (useMockData) {
        const generateId = () => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2);
        const newCurso = { ...curso, id: generateId(), activo: true, created_at: new Date().toISOString() }
        mockCursosState.push(newCurso)

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
            mockSeccionesState.push(newSeccion)
          }
        })

        return newCurso
      }
      
      const { data, error } = await supabase.from('cursos').insert([curso]).select()
      if (error) throw error

      const newCurso = data[0]

      for (let i = 0; i < secciones.length; i++) {
        const sec = secciones[i]
        if (sec.sede_id && sec.fecha_inicio && sec.cupos) {
          let csId = null;
          const { data: existingCs } = await supabase.from('curso_sede').select('id').eq('curso_id', newCurso.id).eq('sede_id', sec.sede_id).limit(1)
          
          if (existingCs && existingCs.length > 0) {
            csId = existingCs[0].id;
          } else {
            const { data: csData, error: csError } = await supabase.from('curso_sede').insert([{
              curso_id: newCurso.id,
              sede_id: sec.sede_id
            }]).select()
            if (!csError && csData && csData.length > 0) {
              csId = csData[0].id;
            }
          }

          if (csId) {
            await supabase.from('secciones').insert([{
              curso_sede_id: csId,
              codigo: String.fromCharCode(65 + i),
              dias: sec.dias && sec.dias.length > 0 ? sec.dias : ['Por definir'],
              horario_inicio: sec.horario_inicio || '08:00:00',
              horario_fin: sec.horario_fin || '10:00:00',
              fecha_inicio: sec.fecha_inicio || null,
              cupo_maximo: parseInt(sec.cupos, 10),
              cupo_disponible: parseInt(sec.cupos, 10),
              profesor: 'Por asignar'
            }])
          }
        }
      }

      return newCurso
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cursos_y_secciones'] })
  })

  const { mutateAsync: updateCurso } = useMutation({
    mutationFn: async ({ id, updates }) => {
      const { nombre, descripcion, activo, secciones = [] } = updates
      const cursoUpdates = {}
      if (nombre !== undefined) cursoUpdates.nombre = nombre
      if (descripcion !== undefined) cursoUpdates.descripcion = descripcion
      if (activo !== undefined) cursoUpdates.activo = activo

      if (useMockData) {
        mockCursosState = mockCursosState.map(c => c.id === id ? { ...c, ...cursoUpdates } : c)
        return { id, ...cursoUpdates }
      }

      const { data, error } = await supabase.from('cursos').update(cursoUpdates).eq('id', id).select()
      if (error) throw error
      
      if (secciones && secciones.length > 0) {
        for (let i = 0; i < secciones.length; i++) {
          const sec = secciones[i]
          
          const secUpdates = {}
          if (sec.dias && sec.dias.length > 0) secUpdates.dias = sec.dias
          if (sec.horario_inicio) secUpdates.horario_inicio = sec.horario_inicio.length === 5 ? sec.horario_inicio + ':00' : sec.horario_inicio
          if (sec.horario_fin) secUpdates.horario_fin = sec.horario_fin.length === 5 ? sec.horario_fin + ':00' : sec.horario_fin
          if (sec.fecha_inicio !== undefined) secUpdates.fecha_inicio = sec.fecha_inicio || null
          if (sec.cupos) {
            secUpdates.cupo_maximo = parseInt(sec.cupos, 10)
            secUpdates.cupo_disponible = parseInt(sec.cupos, 10) 
          }

          if (sec.isExisting && sec.id) {
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
                codigo: String.fromCharCode(65 + i),
                dias: sec.dias && sec.dias.length > 0 ? sec.dias : ['Por definir'],
                horario_inicio: sec.horario_inicio ? (sec.horario_inicio.length === 5 ? sec.horario_inicio + ':00' : sec.horario_inicio) : '08:00:00',
                horario_fin: sec.horario_fin ? (sec.horario_fin.length === 5 ? sec.horario_fin + ':00' : sec.horario_fin) : '10:00:00',
                fecha_inicio: sec.fecha_inicio || null,
                cupo_maximo: parseInt(sec.cupos, 10),
                cupo_disponible: parseInt(sec.cupos, 10),
                profesor: 'Por asignar'
              }])
            }
          }
        }
      }

      return data[0]
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cursos_y_secciones'] })
  })

  const { mutateAsync: deleteCurso } = useMutation({
    mutationFn: async (id) => {
      if (useMockData) {
        mockCursosState = mockCursosState.filter(c => c.id !== id)
        return null
      }
      const { error } = await supabase.from('cursos').delete().eq('id', id)
      if (error) throw error
      return null
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cursos_y_secciones'] })
  })

  return { 
    cursos: data.cursos, 
    secciones: data.secciones, 
    loading, 
    fetchCursos, 
    createCurso: async (cursoData) => {
      try {
        const d = await createCurso(cursoData)
        return { data: [d], error: null }
      } catch (error) {
        return { data: null, error }
      }
    }, 
    updateCurso: async (id, updates) => {
      try {
        const d = await updateCurso({ id, updates })
        return { data: [d], error: null }
      } catch (error) {
        return { data: null, error }
      }
    }, 
    deleteCurso: async (id) => {
      try {
        await deleteCurso(id)
        return { error: null }
      } catch (error) {
        return { error }
      }
    } 
  }
}
