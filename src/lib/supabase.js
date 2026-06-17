import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const DB_TIMEOUT_MS = 15000 // 15 segundos máximo para cualquier query

/**
 * fetch con AbortController — si la query tarda >15s, se cancela
 * y React Query muestra error en vez de skeleton loaders infinitos
 */
function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), DB_TIMEOUT_MS)

  return fetch(url, {
    ...options,
    signal: controller.signal,
  }).finally(() => clearTimeout(timeoutId))
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,       // Guarda sesión en localStorage → sobrevive refresh
    autoRefreshToken: true,     // Refresca JWT automáticamente antes de expirar
    detectSessionInUrl: false,  // No buscar token en URL (usamos email/password)
    storageKey: 'educa-auth',   // Key explícita para la sesión
  },
  global: {
    fetch: fetchWithTimeout,
  },
})

export const getUserWithRole = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) return null
  return {
    ...user,
    role: user.user_metadata?.role || 'estudiante',
    sede_id: user.user_metadata?.sede_id || null,
    alumno_id: user.user_metadata?.alumno_id || null,
  }
}
