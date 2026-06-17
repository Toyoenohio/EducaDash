import { useQuery } from '@tanstack/react-query'

/**
 * useQuery con caché en localStorage.
 * - Muestra datos cacheados INMEDIATAMENTE (sin skeleton loaders)
 * - Refresca en background cuando la red responde
 * - Si la red falla, el usuario ve los datos de la última sesión exitosa
 */
export function useCachedQuery(key, queryFn, options = {}) {
  const cacheKey = `rq:${key.join(':')}`

  // Recuperar datos cacheados (síncrono, instantáneo)
  function getCached() {
    try {
      const raw = localStorage.getItem(cacheKey)
      if (!raw) return undefined
      const parsed = JSON.parse(raw)
      // Expirar caché después de 30 minutos
      if (Date.now() - parsed._ts > 30 * 60 * 1000) {
        localStorage.removeItem(cacheKey)
        return undefined
      }
      return parsed._data
    } catch {
      return undefined
    }
  }

  return useQuery({
    queryKey: key,
    queryFn: async () => {
      const data = await queryFn()
      // Guardar en localStorage al éxito
      try {
        localStorage.setItem(cacheKey, JSON.stringify({ _data: data, _ts: Date.now() }))
      } catch { /* localStorage lleno, ignorar */ }
      return data
    },
    placeholderData: getCached,  // ← muestra datos viejos mientras carga los nuevos
    staleTime: 2 * 60 * 1000,    // 2 min sin refetch
    ...options,
  })
}
