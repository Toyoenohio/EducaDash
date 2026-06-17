import { useCachedQuery } from '../../../lib/useCachedQuery'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { mockInscripciones, mockPagos, mockSedes } from '../../../lib/mockData'

const useMockData = import.meta.env.VITE_USE_MOCK_DATA === 'true'

export function useDashboard() {
  const { data, isLoading: loading, refetch: fetchDashboardData } = useCachedQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      if (useMockData) {
        await new Promise(r => setTimeout(r, 400))
        return { inscripciones: mockInscripciones, pagos: mockPagos, sedes: mockSedes }
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

      return {
        inscripciones: inscReq.data || [],
        pagos: pagosReq.data || [],
        sedes: sedesReq.data || []
      }
    },
    staleTime: 5 * 60 * 1000 // Cache for 5 minutes to avoid redundant dashboard fetches
  })

  return { 
    inscripciones: data?.inscripciones || [], 
    pagos: data?.pagos || [], 
    sedes: data?.sedes || [], 
    loading, 
    fetchDashboardData 
  }
}
