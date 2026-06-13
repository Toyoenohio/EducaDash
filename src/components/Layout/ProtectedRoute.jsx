import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-fixed border-t-primary rounded-full animate-spin" />
          <p className="text-on-surface-variant font-label text-label-bold">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If the user doesn't have permission for this route, don't redirect to root if root is also protected!
    // Instead, log them out or show an unauthorized message, or redirect to a safe page.
    // Since we don't have a dedicated unauthorized page, redirecting to /login is safer.
    // Let's actually render a clean unauthorized message so they know what happened.
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <div className="card max-w-md w-full p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-error/10 text-error rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-3xl">lock</span>
          </div>
          <h1 className="text-2xl font-bold text-on-surface">Acceso Denegado</h1>
          <p className="text-on-surface-variant">
            Tu cuenta ({user.role}) no tiene los permisos necesarios para acceder a este panel de administración.
          </p>
          <a href="/login" onClick={() => {
            // Force clear local storage and reload just in case
            localStorage.clear();
            sessionStorage.clear();
          }} className="btn-primary w-full mt-4 inline-flex justify-center">
            Volver al inicio de sesión
          </a>
        </div>
      </div>
    )
  }

  return children
}
