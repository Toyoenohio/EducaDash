import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { mockInscripciones } from '../../../lib/mockData'

const useMockData = import.meta.env.VITE_USE_MOCK_DATA === 'true'

export function useInscripciones() {
  const queryClient = useQueryClient()

  const { data: inscripciones = [], isLoading: loading, refetch: fetchInscripciones } = useQuery({
    queryKey: ['inscripciones'],
    queryFn: async () => {
      if (useMockData) {
        await new Promise(r => setTimeout(r, 400))
        return [...mockInscripciones]
      }
      const { data, error } = await supabase
        .from('inscripciones')
        .select(`
          *,
          alumno:alumnos(id, nombre, apellido, cedula, telefono),
          seccion:secciones(id, codigo, dias, horario_inicio, horario_fin,
            curso_sede:curso_sede_id(
              curso:cursos(id, nombre),
              sede:sedes(nombre)
            )
          )
        `)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    }
  })

  const { mutateAsync: createInscripcion } = useMutation({
    mutationFn: async (inscripcion) => {
      if (useMockData) {
        const newInscripcion = { ...inscripcion, id: crypto.randomUUID(), estado: 'pendiente', fecha_inscripcion: new Date().toISOString(), created_at: new Date().toISOString() }
        mockInscripciones.unshift(newInscripcion)
        // Generate mock obligaciones
        const { mockObligaciones, mockSedes, mockSecciones, mockCursoSede } = await import('../../../lib/mockData')
        return newInscripcion
      }
      const { data, error } = await supabase.from('inscripciones').insert([{ ...inscripcion, estado: 'pendiente' }]).select()
      if (error) {
        if (error.code === 'P0001') {
          throw new Error('No hay cupos disponibles en esta sección')
        }
        throw error
      }
      
      // Generate obligations via Edge Function
      const newInscripcion = data[0]
      console.log(`[DEBUG] createInscripcion - Inscripción exitosa. ID: ${newInscripcion.id}. Intentando generar obligaciones...`);
      try {
        const { data: genData, error: genError } = await supabase.functions.invoke('generar-obligaciones', {
          body: { inscripcion_id: newInscripcion.id }
        })
        if (genError) {
          console.error(`[DEBUG] createInscripcion - La Edge Function 'generar-obligaciones' devolvió un error:`, genError);
        } else {
          console.log(`[DEBUG] createInscripcion - Obligaciones generadas con éxito:`, genData);
        }
      } catch (genErr) {
        console.error(`[DEBUG] createInscripcion - Excepción atrapada al llamar a la Edge Function:`, genErr)
        // Don't fail the inscription if obligation generation fails
      }
      
      return newInscripcion
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inscripciones'] })
      queryClient.invalidateQueries({ queryKey: ['obligaciones'] })
    }
  })

  const { mutateAsync: retirarInscripcion } = useMutation({
    mutationFn: async (id) => {
      if (useMockData) {
        const index = mockInscripciones.findIndex(i => i.id === id)
        if (index >= 0) {
          mockInscripciones[index] = { ...mockInscripciones[index], estado: 'retirada' }
        }
        return { id, estado: 'retirada' }
      }
      const { data, error } = await supabase
        .from('inscripciones')
        .update({ estado: 'retirada' })
        .eq('id', id)
        .select()
      if (error) throw error
      return data[0]
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inscripciones'] })
  })

  return { 
    inscripciones, 
    loading, 
    fetchInscripciones, 
    createInscripcion: async (insc) => {
      try {
        const data = await createInscripcion(insc)
        return { data: [data], error: null }
      } catch (error) {
        return { data: null, error }
      }
    },
    retirarInscripcion: async (id) => {
      try {
        const data = await retirarInscripcion(id)
        return { data: [data], error: null }
      } catch (error) {
        return { data: null, error }
      }
    }
  }
}
