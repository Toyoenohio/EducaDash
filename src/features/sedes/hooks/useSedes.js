import { useCachedQuery } from '../../../lib/useCachedQuery'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { mockSedes as initialMockSedes } from '../../../lib/mockData'

const useMockData = import.meta.env.VITE_USE_MOCK_DATA === 'true'

// Global mock state for Sedes when VITE_USE_MOCK_DATA is true
let mockSedesState = [...initialMockSedes]

export function useSedes() {
  const queryClient = useQueryClient()

  const { data: sedes = [], isLoading: loading, refetch: fetchSedes } = useCachedQuery({
    queryKey: ['sedes'],
    queryFn: async () => {
      if (useMockData) {
        await new Promise(r => setTimeout(r, 400))
        return [...mockSedesState]
      }
      const { data, error } = await supabase.from('sedes').select('*, sede_costos(*)').order('created_at')
      if (error) throw error
      return data || []
    }
  })

  const { mutateAsync: createSede } = useMutation({
    mutationFn: async (sede) => {
      if (useMockData) {
        const newSede = { ...sede, id: crypto.randomUUID(), created_at: new Date().toISOString() }
        mockSedesState.push(newSede)
        return newSede
      }
      const { data, error } = await supabase.from('sedes').insert([sede]).select()
      if (error) throw error
      return data[0]
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sedes'] })
  })

  const { mutateAsync: updateSede } = useMutation({
    mutationFn: async ({ id, updates, costos }) => {
      if (useMockData) {
        mockSedesState = mockSedesState.map(s => s.id === id ? { ...s, ...updates } : s)
        return { id, ...updates }
      }
      const { data, error } = await supabase.from('sedes').update(updates).eq('id', id).select()
      if (error) throw error

      if (costos && costos.length > 0) {
        // Delete existing costs for this sede
        await supabase.from('sede_costos').delete().eq('sede_id', id)
        
        // Insert new costs
        const insertPayload = costos.map(c => ({
          sede_id: id,
          concepto: c.concepto,
          monto: parseFloat(c.monto || 0),
          duracion_semanas: c.duracion_semanas ? parseInt(c.duracion_semanas) : null,
          moneda: '$'
        }))
        
        const { error: costosError } = await supabase.from('sede_costos').insert(insertPayload)
        if (costosError) throw costosError
      }

      return data[0]
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sedes'] })
  })

  const { mutateAsync: deleteSede } = useMutation({
    mutationFn: async (id) => {
      if (useMockData) {
        mockSedesState = mockSedesState.filter(s => s.id !== id)
        return null
      }
      const { error } = await supabase.from('sedes').delete().eq('id', id)
      if (error) throw error
      return null
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sedes'] })
  })

  return { 
    sedes, 
    loading, 
    fetchSedes, 
    createSede, 
    updateSede, 
    deleteSede 
  }
}
