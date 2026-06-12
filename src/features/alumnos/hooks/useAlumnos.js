import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { mockAlumnos as initialMockAlumnos } from '../../../lib/mockData'

const useMockData = import.meta.env.VITE_USE_MOCK_DATA === 'true'

export function useAlumnos(pagina = 1, limit = 10, busqueda = '') {
  const queryClient = useQueryClient()
  const from = (pagina - 1) * limit
  const to = from + limit - 1

  const { data, isLoading: loading } = useQuery({
    queryKey: ['alumnos', pagina, busqueda],
    queryFn: async () => {
      if (useMockData) {
        await new Promise(r => setTimeout(r, 400))
        let result = initialMockAlumnos
        if (busqueda) {
          const term = busqueda.toLowerCase()
          result = result.filter(a => 
            a.nombre.toLowerCase().includes(term) ||
            a.apellido.toLowerCase().includes(term) ||
            a.cedula.toLowerCase().includes(term) ||
            (a.email && a.email.toLowerCase().includes(term))
          )
        }
        return { data: result.slice(from, to + 1), total: result.length }
      }

      let query = supabase
        .from('alumnos')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        
      if (busqueda) {
        query = query.or(`nombre.ilike.%${busqueda}%,apellido.ilike.%${busqueda}%,cedula.ilike.%${busqueda}%,email.ilike.%${busqueda}%`)
      }

      const { data, count, error } = await query.range(from, to)
      if (error) throw error
      return { data, total: count || 0 }
    },
    keepPreviousData: true,
  })

  const createMutation = useMutation({
    mutationFn: async (alumnoData) => {
      const cleanData = { ...alumnoData }
      if (cleanData.fecha_nacimiento === '') cleanData.fecha_nacimiento = null

      if (useMockData) {
         const generateId = () => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2);
         return { ...cleanData, id: generateId(), created_at: new Date().toISOString() }
      }

      const authEmailToUse = cleanData.email || `${cleanData.cedula.replace(/\s+/g, '')}@educadash.local`
      const { data: authData, error: authError } = await supabase.functions.invoke('create-student', {
        body: { 
          email: authEmailToUse, 
          password: 'Educa2026*', 
          metadata: {
            nombre: cleanData.nombre,
            apellido: cleanData.apellido,
            cedula: cleanData.cedula
          }
        }
      });

      if (authError || !authData?.user) {
         console.error("Error creating auth user via Edge Function:", authError);
         throw new Error(authError?.message || 'Error al crear la cuenta de usuario');
      }
      
      cleanData.id = authData.user.id;

      const { data, error } = await supabase.from('alumnos').insert([cleanData]).select()
      if (error) throw error
      return data[0]
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alumnos'] })
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }) => {
      const cleanUpdates = { ...updates }
      if (cleanUpdates.fecha_nacimiento === '') cleanUpdates.fecha_nacimiento = null

      if (useMockData) return { id, ...cleanUpdates }
      
      const { data, error } = await supabase.from('alumnos').update(cleanUpdates).eq('id', id).select()
      if (error) throw error
      return data[0]
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alumnos'] })
  })

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      if (useMockData) return id
      const { error } = await supabase.from('alumnos').delete().eq('id', id)
      if (error) throw error
      return id
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alumnos'] })
  })

  return { 
    alumnos: data?.data || [], 
    total: data?.total || 0,
    loading, 
    createAlumno: createMutation.mutateAsync, 
    updateAlumno: async (id, updates) => updateMutation.mutateAsync({ id, updates }), 
    deleteAlumno: deleteMutation.mutateAsync 
  }
}
