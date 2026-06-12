import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { mockSedes as initialMockSedes } from '../../../lib/mockData'

const useMockData = import.meta.env.VITE_USE_MOCK_DATA === 'true'

export function useSedes() {
  const [sedes, setSedes] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchSedes = async () => {
    setLoading(true)
    if (useMockData) {
      await new Promise(r => setTimeout(r, 500)) // Simulate network delay
      setSedes(initialMockSedes)
      setLoading(false)
      return
    }
    try {
      const { data, error } = await supabase.from('sedes').select('*').order('created_at')
      if (!error) setSedes(data)
    } finally {
      setLoading(false)
    }
  }

  const createSede = async (sede) => {
    if (useMockData) {
      const newSede = { ...sede, id: crypto.randomUUID(), created_at: new Date().toISOString() }
      setSedes(prev => [...prev, newSede])
      return { data: [newSede], error: null }
    }
    const { data, error } = await supabase.from('sedes').insert([sede]).select()
    if (!error) setSedes(prev => [...prev, data[0]])
    return { data, error }
  }

  const updateSede = async (id, updates) => {
    if (useMockData) {
      setSedes(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))
      return { data: [{ id, ...updates }], error: null }
    }
    const { data, error } = await supabase.from('sedes').update(updates).eq('id', id).select()
    if (!error) setSedes(prev => prev.map(s => s.id === id ? data[0] : s))
    return { data, error }
  }

  const deleteSede = async (id) => {
    if (useMockData) {
      setSedes(prev => prev.filter(s => s.id !== id))
      return { error: null }
    }
    const { error } = await supabase.from('sedes').delete().eq('id', id)
    if (!error) setSedes(prev => prev.filter(s => s.id !== id))
    return { error }
  }

  useEffect(() => { fetchSedes() }, [])

  return { sedes, loading, fetchSedes, createSede, updateSede, deleteSede }
}
