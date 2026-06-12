import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { mockSedes as initialMockSedes } from '../../../lib/mockData'

const useMockData = import.meta.env.VITE_USE_MOCK_DATA === 'true'

// Global mock state for Sedes when VITE_USE_MOCK_DATA is true
let mockSedesState = [...initialMockSedes]

export function useSedes() {
  const queryClient = useQueryClient()

  const { data: sedes = [], isLoading: loading, refetch: fetchSedes } = useQuery({
    queryKey: ['sedes'],
    queryFn: async () => {
      if (useMockData) {
        await new Promise(r => setTimeout(r, 400))
        return [...mockSedesState]
      }
      const { data, error } = await supabase.from('sedes').select('*').order('created_at')
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
    mutationFn: async ({ id, updates }) => {
      if (useMockData) {
        mockSedesState = mockSedesState.map(s => s.id === id ? { ...s, ...updates } : s)
        return { id, ...updates }
      }
      const { data, error } = await supabase.from('sedes').update(updates).eq('id', id).select()
      if (error) throw error
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
    updateSede: (id, updates) => updateSede({ id, updates }), 
    deleteSede 
  }
}
