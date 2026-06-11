import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { mockPagos as initialMockPagos } from '../../../lib/mockData'

const useMockData = import.meta.env.VITE_USE_MOCK_DATA === 'true'

export function usePagos() {
  const queryClient = useQueryClient()

  const { data: pagos = [], isLoading: loading } = useQuery({
    queryKey: ['pagos'],
    queryFn: async () => {
      if (useMockData) {
        await new Promise(r => setTimeout(r, 400))
        return initialMockPagos
      }
      const { data, error } = await supabase
        .from('pagos')
        .select(`
          *,
          inscripcion:inscripcion_id(
            alumno:alumno_id(nombre, apellido, cedula),
            seccion:seccion_id(
              codigo,
              curso_sede:curso_sede_id(
                curso:cursos(nombre),
                sede:sedes(nombre)
              )
            )
          )
        `)
        .order('anio', { ascending: false })
        .order('mes', { ascending: false })
      if (error) throw error
      return data || []
    }
  })

  const pagosPendientes = pagos.filter(p => !p.pagado)
  const pagosPagados = pagos.filter(p => p.pagado)

  const createMutation = useMutation({
    mutationFn: async (pago) => {
      if (useMockData) {
        const newPago = { ...pago, id: crypto.randomUUID() }
        
        if (pago.concepto === 'inscripcion') {
          const { mockInscripciones } = await import('../../../lib/mockData')
          const inscIndex = mockInscripciones.findIndex(i => i.id === pago.inscripcion_id)
          if (inscIndex >= 0 && mockInscripciones[inscIndex].estado === 'pendiente') {
            mockInscripciones[inscIndex].estado = 'activa'
          }
        }
        return newPago
      }
      
      const { data, error } = await supabase.from('pagos').insert([pago]).select()
      if (error) throw error
      
      if (pago.concepto === 'inscripcion' && data && data.length > 0) {
        await supabase.from('inscripciones').update({ estado: 'activa' }).eq('id', pago.inscripcion_id)
      }
      
      return data[0]
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pagos'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    }
  })

  const marcarPagadoMutation = useMutation({
    mutationFn: async ({ id, detalles }) => {
      const updates = {
        pagado: true,
        fecha_pago: new Date().toISOString(),
        metodo_pago: detalles.metodo_pago,
        referencia: detalles.referencia || null,
        concepto: detalles.concepto || 'cuota_mensual',
      }
      
      if (useMockData) {
        if (updates.concepto === 'inscripcion') {
          const { mockInscripciones } = await import('../../../lib/mockData')
          const pago = pagos.find(p => p.id === id)
          if (pago) {
            const inscIndex = mockInscripciones.findIndex(i => i.id === pago.inscripcion_id)
            if (inscIndex >= 0 && mockInscripciones[inscIndex].estado === 'pendiente') {
              mockInscripciones[inscIndex].estado = 'activa'
            }
          }
        }
        return { id, ...updates }
      }
      
      const { data, error } = await supabase.from('pagos').update(updates).eq('id', id).select()
      if (error) throw error
      
      if (updates.concepto === 'inscripcion' && data && data.length > 0) {
        await supabase.from('inscripciones').update({ estado: 'activa' }).eq('id', data[0].inscripcion_id)
      }
      
      return data[0]
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pagos'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    }
  })

  return { 
    pagos, 
    pagosPendientes, 
    pagosPagados, 
    loading, 
    createPago: createMutation.mutateAsync, 
    marcarPagado: (id, detalles) => marcarPagadoMutation.mutateAsync({ id, detalles }) 
  }
}
