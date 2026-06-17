import { useQuery } from '@tanstack/react-query'

/**
 * useQuery con caché en localStorage.
 * Misma API que useQuery — acepta un objeto de opciones.
 *
 * - Muestra datos cacheados INMEDIATAMENTE (sin skeleton loaders)
 * - Refresca en background cuando la red responde
 * - Si la red falla, el usuario ve los datos de la última sesión exitosa
 */
export function useCachedQuery(options) {
  const { queryKey, queryFn, ...rest } = options
  const cacheKey = `rq:${queryKey.join(':')}`

  function getCached() {
    try {
      const raw = localStorage.getItem(cacheKey)
      if (!raw) return undefined
      const parsed = JSON.parse(raw)
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
    queryKey,
    queryFn: async () => {
      const data = await queryFn()
      try { localStorage.setItem(cacheKey, JSON.stringify({ _data: data, _ts: Date.now() })) } catch {}
      return data
    },
    placeholderData: getCached,
    staleTime: 2 * 60 * 1000,
    ...rest,
  })
}
