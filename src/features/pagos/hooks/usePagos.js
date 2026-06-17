import { useCachedQuery } from '../../../lib/useCachedQuery'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { mockPagos as initialMockPagos } from '../../../lib/mockData'

const useMockData = import.meta.env.VITE_USE_MOCK_DATA === 'true'

export function usePagos() {
  const queryClient = useQueryClient()

  const { data: pagos = [], isLoading: loading } = useCachedQuery({
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
            id,
            estado,
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
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    }
  })

  const pagosPendientes = pagos.filter(p => !p.pagado)
  const pagosPagados = pagos.filter(p => p.pagado)

  // Legacy createPago - now redirects to registrar-pago Edge Function
  const createMutation = useMutation({
    mutationFn: async (pago) => {
      if (useMockData) {
        const newPago = { ...pago, id: crypto.randomUUID(), pagado: true, fecha_pago: new Date().toISOString() }
        return newPago
      }

      // Use Edge Function for proper obligation distribution
      const { data, error } = await supabase.functions.invoke('registrar-pago', {
        body: {
          inscripcion_id: pago.inscripcion_id,
          monto: pago.monto,
          metodo_pago: pago.metodo_pago,
          referencia: pago.referencia,
          obligacion_ids: pago.obligacion_ids || [],
        }
      })
      if (error) throw error
      return data?.pago || data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pagos'] })
      queryClient.invalidateQueries({ queryKey: ['obligaciones'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['inscripciones'] })
    }
  })

  // Legacy marcarPagado - kept for backward compatibility
  const marcarPagadoMutation = useMutation({
    mutationFn: async ({ id, detalles }) => {
      if (useMockData) {
        return { id, ...detalles, pagado: true, fecha_pago: new Date().toISOString() }
      }
      
      const { data, error } = await supabase.from('pagos').update({
        pagado: true,
        fecha_pago: new Date().toISOString(),
        metodo_pago: detalles.metodo_pago,
        referencia: detalles.referencia || null,
      }).eq('id', id).select()
      if (error) throw error
      return data[0]
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pagos'] })
      queryClient.invalidateQueries({ queryKey: ['obligaciones'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['inscripciones'] })
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
