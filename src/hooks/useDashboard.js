import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { mockInscripciones, mockPagos, mockSedes } from '../lib/mockData'

const useMockData = import.meta.env.VITE_USE_MOCK_DATA === 'true'

export function useDashboard() {
  const [data, setData] = useState({ inscripciones: [], pagos: [], sedes: [] })
  const [loading, setLoading] = useState(true)

  const fetchDashboardData = async () => {
    setLoading(true)
    if (useMockData) {
      await new Promise(r => setTimeout(r, 400))
      setData({ inscripciones: mockInscripciones, pagos: mockPagos, sedes: mockSedes })
      setLoading(false)
      return
    }

    const [inscReq, pagosReq, sedesReq] = await Promise.all([
      supabase.from('inscripciones').select(`
        *,
        alumno:alumnos(id),
        seccion:secciones(id,
          curso_sede:curso_sede_id(
            sede:sedes(id, nombre)
          )
        )
      `),
      supabase.from('pagos').select(`
        *,
        inscripcion:inscripcion_id(
          alumno:alumno_id(nombre, apellido, email),
          seccion:seccion_id(
            curso_sede:curso_sede_id(
              sede:sedes(id, nombre)
            )
          )
        )
      `),
      supabase.from('sedes').select('*')
    ])

    setData({
      inscripciones: inscReq.data || [],
      pagos: pagosReq.data || [],
      sedes: sedesReq.data || []
    })
    setLoading(false)
  }

  useEffect(() => { fetchDashboardData() }, [])

  return { ...data, loading, fetchDashboardData }
}
