import { AlertTriangle } from 'lucide-react'

export default function GlobalErrorBoundary({ error, resetErrorBoundary }) {
  return (
    <div className="min-h-screen bg-surface-container-lowest flex items-center justify-center p-4">
      <div className="card p-8 max-w-md w-full text-center space-y-4 shadow-modal">
        <div className="w-16 h-16 bg-error-container text-error rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-on-surface">Algo salió mal</h1>
        <p className="text-on-surface-variant text-sm">
          Ha ocurrido un error inesperado en la aplicación. Puedes intentar recargar la página o contactar a soporte si el problema persiste.
        </p>
        {error && (
          <div className="bg-surface-container-high p-4 rounded-lg text-left overflow-auto mt-4 max-h-32">
            <p className="text-error font-mono text-xs whitespace-pre-wrap">{error.message}</p>
          </div>
        )}
        <button 
          onClick={resetErrorBoundary}
          className="btn-primary w-full mt-6"
        >
          Intentar de Nuevo
        </button>
      </div>
    </div>
  )
}
