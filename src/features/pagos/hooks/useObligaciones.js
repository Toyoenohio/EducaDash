import { useCachedQuery } from '../../../lib/useCachedQuery'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { mockObligaciones, mockPagoObligaciones, mockInscripciones } from '../../../lib/mockData'

const useMockData = import.meta.env.VITE_USE_MOCK_DATA === 'true'

/**
 * Calcula el estado de una obligación mock basándose en sus abonos
 */
function calcularEstadoMock(obligacion) {
  const abonos = mockPagoObligaciones.filter(po => po.obligacion_id === obligacion.id)
  const totalAbonado = abonos.reduce((sum, po) => sum + po.monto_abonado, 0)
  const saldoPendiente = obligacion.monto - totalAbonado
  
  let estado = 'pendiente'
  if (totalAbonado >= obligacion.monto) {
    estado = 'pagado'
  } else if (new Date(obligacion.fecha_vencimiento) < new Date()) {
    estado = 'vencido'
  }

  return { ...obligacion, total_abonado: totalAbonado, saldo_pendiente: saldoPendiente, estado }
}

export function useObligaciones(inscripcionId = null) {
  const queryClient = useQueryClient()

  const { data: obligaciones = [], isLoading: loading } = useCachedQuery({
    queryKey: ['obligaciones', inscripcionId],
    queryFn: async () => {
      if (useMockData) {
        await new Promise(r => setTimeout(r, 300))
        let obligs = [...mockObligaciones]
        if (inscripcionId) {
          obligs = obligs.filter(o => o.inscripcion_id === inscripcionId)
        }
        // Enrich with inscripcion data
        return obligs.map(o => {
          const enriched = calcularEstadoMock(o)
          const insc = mockInscripciones.find(i => i.id === o.inscripcion_id)
          return { ...enriched, inscripcion: insc }
        })
      }

      let query = supabase
        .from('obligaciones_con_estado')
        .select(`
          *,
          inscripcion:inscripcion_id(
            id,
            estado,
            alumno:alumno_id(id, nombre, apellido, cedula, telefono),
            seccion:seccion_id(
              id, codigo,
              curso_sede:curso_sede_id(
                curso:cursos(id, nombre),
                sede:sedes(nombre)
              )
            )
          )
        `)
        .order('fecha_vencimiento', { ascending: true })

      if (inscripcionId) {
        query = query.eq('inscripcion_id', inscripcionId)
      }

      const { data, error } = await query
      if (error) throw error
      return data || []
    }
  })

  const pendientes = obligaciones.filter(o => o.estado === 'pendiente')
  const vencidas = obligaciones.filter(o => o.estado === 'vencido')
  const pagadas = obligaciones.filter(o => o.estado === 'pagado')

  const totalPendiente = pendientes.reduce((s, o) => s + Number(o.saldo_pendiente), 0)
  const totalVencido = vencidas.reduce((s, o) => s + Number(o.saldo_pendiente), 0)
  const totalRecaudado = pagadas.reduce((s, o) => s + Number(o.monto), 0)

  // Registrar pago via Edge Function
  const { mutateAsync: registrarPago } = useMutation({
    mutationFn: async ({ inscripcion_id, monto, metodo_pago, referencia, obligacion_ids }) => {
      if (useMockData) {
        // Simulate payment distribution in mock mode
        const sortedObligs = (obligacion_ids || [])
          .map(id => mockObligaciones.find(o => o.id === id))
          .filter(Boolean)
          .sort((a, b) => {
            if (a.concepto === 'inscripcion') return -1
            if (b.concepto === 'inscripcion') return 1
            return (a.numero_semana || 0) - (b.numero_semana || 0)
          })

        let remaining = monto
        const distribuciones = []
        for (const oblig of sortedObligs) {
          if (remaining <= 0) break
          const abonos = mockPagoObligaciones.filter(po => po.obligacion_id === oblig.id)
          const yaAbonado = abonos.reduce((s, po) => s + po.monto_abonado, 0)
          const saldo = oblig.monto - yaAbonado
          const abono = Math.min(saldo, remaining)

          const pagoObligacion = {
            id: crypto.randomUUID(),
            pago_id: crypto.randomUUID(),
            obligacion_id: oblig.id,
            monto_abonado: abono,
            created_at: new Date().toISOString(),
          }
          mockPagoObligaciones.push(pagoObligacion)
          distribuciones.push(pagoObligacion)
          remaining -= abono
        }

        return { pago: { id: crypto.randomUUID() }, distribuciones, nuevo_estado: 'activa' }
      }

      // Call Edge Function
      const { data, error } = await supabase.functions.invoke('registrar-pago', {
        body: { inscripcion_id, monto, metodo_pago, referencia, obligacion_ids }
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['obligaciones'] })
      queryClient.invalidateQueries({ queryKey: ['pagos'] })
      queryClient.invalidateQueries({ queryKey: ['inscripciones'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    }
  })

  // Agregar certificado/carnet manualmente
  const { mutateAsync: agregarCertificado } = useMutation({
    mutationFn: async (inscripcionId) => {
      if (useMockData) {
        const newOblig = {
          id: crypto.randomUUID(),
          inscripcion_id: inscripcionId,
          concepto: 'certificado_carnet',
          numero_semana: null,
          monto: 15.00,
          fecha_vencimiento: '2026-06-30',
          created_at: new Date().toISOString(),
        }
        mockObligaciones.push(newOblig)
        return newOblig
      }

      const { data, error } = await supabase.functions.invoke('agregar-obligacion', {
        body: { inscripcion_id: inscripcionId, concepto: 'certificado_carnet' }
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['obligaciones'] })
    }
  })

  return {
    obligaciones,
    pendientes,
    vencidas,
    pagadas,
    loading,
    totalPendiente,
    totalVencido,
    totalRecaudado,
    registrarPago,
    agregarCertificado,
  }
}
