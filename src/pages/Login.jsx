import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { GraduationCap, Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { user, login } = useAuth()
  const navigate = useNavigate()

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/', { replace: true })
    }
  }, [user, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión. Verifica tus credenciales.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side — Gradient Hero (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 gradient-hero relative overflow-hidden items-center justify-center">
        {/* Decorative floating shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -left-20 w-72 h-72 bg-white/5 rounded-full blur-xl animate-pulse" />
          <div className="absolute top-1/4 right-10 w-48 h-48 bg-white/5 rounded-full blur-lg" style={{ animation: 'pulse 4s ease-in-out infinite' }} />
          <div className="absolute bottom-20 left-16 w-56 h-56 bg-white/[0.03] rounded-full blur-xl" style={{ animation: 'pulse 5s ease-in-out infinite 1s' }} />
          <div className="absolute top-10 right-1/3 w-32 h-32 bg-white/[0.04] rounded-full blur-md" style={{ animation: 'pulse 3.5s ease-in-out infinite 0.5s' }} />
          <div className="absolute bottom-1/3 right-1/4 w-40 h-40 border border-white/10 rounded-full" style={{ animation: 'pulse 6s ease-in-out infinite 2s' }} />
          <div className="absolute top-1/2 left-1/4 w-24 h-24 border border-white/[0.07] rounded-full" style={{ animation: 'pulse 4.5s ease-in-out infinite 1.5s' }} />
        </div>

        {/* Branding content */}
        <div className="relative z-10 text-center px-12 max-w-lg animate-fade-in">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl">
              <GraduationCap className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold text-white tracking-tight mb-3">
            EDUCA
          </h1>
          <div className="h-1 w-16 bg-tertiary rounded-full mx-auto mb-6" />
          <p className="text-xl font-semibold text-white/90 mb-3">
            Panel de Administración
          </p>
          <p className="text-white/60 text-base leading-relaxed">
            Gestiona tu academia de forma inteligente
          </p>

          {/* Bottom decorative dots */}
          <div className="flex items-center justify-center gap-2 mt-12">
            <div className="w-2 h-2 bg-white/30 rounded-full" />
            <div className="w-2 h-2 bg-white/50 rounded-full" />
            <div className="w-8 h-2 bg-tertiary rounded-full" />
            <div className="w-2 h-2 bg-white/50 rounded-full" />
            <div className="w-2 h-2 bg-white/30 rounded-full" />
          </div>
        </div>
      </div>

      {/* Right Side — Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center bg-background px-6 py-12">
        {/* Mobile branded header (visible only on small screens) */}
        <div className="lg:hidden flex items-center gap-2.5 mb-10 animate-fade-in">
          <div className="gradient-hero p-2.5 rounded-xl">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <span className="text-2xl font-bold text-on-surface tracking-tight">EDUCA</span>
        </div>

        {/* Form Card */}
        <div className="w-full max-w-md animate-scale-in">
          <div className="bg-surface/80 backdrop-blur-lg border border-outline/10 rounded-2xl shadow-card p-8 md:p-10">
            {/* Form header */}
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-on-surface mb-2">
                Iniciar Sesión
              </h2>
              <p className="text-on-surface-variant text-sm">
                Ingresa tus credenciales para continuar
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div className="animate-fade-in mb-6 bg-error/10 border border-error/20 text-error rounded-xl px-4 py-3 text-sm flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-error rounded-full mt-1.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email field */}
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-sm font-medium text-on-surface-variant font-label">
                  Cédula o Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant/50" />
                  <input
                    id="email"
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="V12345678 o correo@educa.com"
                    required
                    disabled={loading}
                    className="w-full pl-11 pr-4 py-3 bg-surface-container-low border border-outline/20 rounded-xl text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-200 disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-on-surface-variant font-label">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant/50" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={loading}
                    className="w-full pl-11 pr-12 py-3 bg-surface-container-low border border-outline/20 rounded-xl text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-200 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/50 hover:text-on-surface-variant transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3 text-base font-semibold flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Iniciando sesión...</span>
                  </>
                ) : (
                  'Iniciar Sesión'
                )}
              </button>
            </form>
          </div>

          {/* Footer */}
          <p className="text-center text-on-surface-variant/50 text-xs mt-6">
            © {new Date().getFullYear()} EDUCA · Panel de Administración
          </p>
        </div>
      </div>
    </div>
  )
}
