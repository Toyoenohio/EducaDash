import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { mockPagos as initialMockPagos } from '../lib/mockData'

const useMockData = import.meta.env.VITE_USE_MOCK_DATA === 'true'

export function usePagos() {
  const [pagos, setPagos] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchPagos = async () => {
    setLoading(true)
    if (useMockData) {
      await new Promise(r => setTimeout(r, 400))
      setPagos(initialMockPagos)
      setLoading(false)
      return
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
    if (!error) setPagos(data)
    setLoading(false)
  }

  const pagosPendientes = pagos.filter(p => !p.pagado)
  const pagosPagados = pagos.filter(p => p.pagado)

  const createPago = async (pago) => {
    if (useMockData) {
      const newPago = { ...pago, id: crypto.randomUUID() }
      setPagos(prev => [newPago, ...prev])
      
      // Update mockInscripciones if it's an inscripcion payment
      if (pago.concepto === 'inscripcion') {
        const { mockInscripciones } = await import('../lib/mockData')
        const inscIndex = mockInscripciones.findIndex(i => i.id === pago.inscripcion_id)
        if (inscIndex >= 0 && mockInscripciones[inscIndex].estado === 'pendiente') {
          mockInscripciones[inscIndex].estado = 'activa'
        }
      }
      
      return { data: [newPago], error: null }
    }
    const { data, error } = await supabase.from('pagos').insert([pago]).select()
    if (!error) {
      if (pago.concepto === 'inscripcion') {
        await supabase.from('inscripciones').update({ estado: 'activa' }).eq('id', pago.inscripcion_id)
      }
      fetchPagos()
    }
    return { data, error }
  }

  const marcarPagado = async (id, detalles) => {
    const updates = {
      pagado: true,
      fecha_pago: new Date().toISOString(),
      metodo_pago: detalles.metodo_pago,
      referencia: detalles.referencia || null,
      concepto: detalles.concepto || 'cuota_mensual',
    }
    if (useMockData) {
      setPagos(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
      
      if (updates.concepto === 'inscripcion') {
        const { mockInscripciones } = await import('../lib/mockData')
        const pago = pagos.find(p => p.id === id)
        if (pago) {
          const inscIndex = mockInscripciones.findIndex(i => i.id === pago.inscripcion_id)
          if (inscIndex >= 0 && mockInscripciones[inscIndex].estado === 'pendiente') {
            mockInscripciones[inscIndex].estado = 'activa'
          }
        }
      }
      
      return { data: [{ id, ...updates }], error: null }
    }
    const { data, error } = await supabase.from('pagos').update(updates).eq('id', id).select()
    if (!error) {
      setPagos(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
      if (updates.concepto === 'inscripcion' && data && data.length > 0) {
        await supabase.from('inscripciones').update({ estado: 'activa' }).eq('id', data[0].inscripcion_id)
      }
    }
    return { data, error }
  }

  useEffect(() => { fetchPagos() }, [])

  return { pagos, pagosPendientes, pagosPagados, loading, fetchPagos, createPago, marcarPagado }
}
