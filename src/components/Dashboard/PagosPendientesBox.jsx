import { CheckCircle, AlertTriangle, Clock } from 'lucide-react'
import { useSede } from '../../contexts/SedeContext'
import { useDashboard } from '../../hooks/useDashboard'
import { usePagos } from '../../hooks/usePagos'
import { useState, useMemo } from 'react'

export default function PagosPendientesBox() {
  const { selectedSede } = useSede()
  const { pagos, fetchDashboardData } = useDashboard()
  const { marcarPagado } = usePagos()
  const [processingId, setProcessingId] = useState(null)

  const pendientes = useMemo(() => {
    return pagos.filter(p => {
      const matchSede = selectedSede === 'todas' || p.inscripcion?.seccion?.curso_sede?.sede?.id === selectedSede
      // Is pending, and it's an inscripcion payment (or we could show all pending payments)
      const isPending = !p.pagado && p.concepto === 'inscripcion'
      return matchSede && isPending
    })
  }, [pagos, selectedSede])

  const handleApprove = async (pago) => {
    setProcessingId(pago.id)
    try {
      await marcarPagado(pago.id, {
        metodo_pago: pago.metodo_pago,
        referencia: pago.referencia,
        concepto: pago.concepto
      })
      // Refresh dashboard data to remove it from the list
      await fetchDashboardData()
    } catch (error) {
      console.error('Error al aprobar pago:', error)
    } finally {
      setProcessingId(null)
    }
  }

  if (pendientes.length === 0) {
    return (
      <div className="card p-6 opacity-0 animate-fade-in" style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}>
        <h3 className="text-lg font-bold text-on-surface mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-warning" />
          Pagos de Inscripción Pendientes
        </h3>
        <div className="flex flex-col items-center justify-center text-center py-8">
          <CheckCircle className="w-12 h-12 text-secondary/50 mb-3" />
          <p className="text-on-surface-variant font-medium">No hay pagos pendientes por aprobar.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-0 overflow-hidden opacity-0 animate-fade-in" style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}>
      <div className="p-6 border-b border-outline/10">
        <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
          <Clock className="w-5 h-5 text-warning" />
          Pagos de Inscripción Pendientes ({pendientes.length})
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-low text-on-surface-variant text-sm font-label uppercase tracking-wider">
              <th className="p-4 font-semibold">Alumno</th>
              <th className="p-4 font-semibold">Detalles de Pago</th>
              <th className="p-4 font-semibold text-right">Monto</th>
              <th className="p-4 font-semibold text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline/10">
            {pendientes.map((pago) => {
              const isProcessing = processingId === pago.id
              const alumno = pago.inscripcion?.alumno || {}
              return (
                <tr key={pago.id} className="hover:bg-surface-container-low/50 transition-colors">
                  <td className="p-4">
                    <p className="font-bold text-on-surface">
                      {alumno.nombre} {alumno.apellido}
                    </p>
                    <p className="text-sm text-on-surface-variant">
                      {alumno.email || 'Sin correo'}
                    </p>
                  </td>
                  <td className="p-4">
                    <p className="text-sm font-medium text-on-surface capitalize">
                      {pago.metodo_pago || 'Por definir'}
                    </p>
                    <p className="text-sm text-on-surface-variant font-mono">
                      {pago.referencia ? `Ref: ${pago.referencia}` : 'Sin referencia'}
                    </p>
                  </td>
                  <td className="p-4 text-right">
                    <span className="font-bold text-primary">
                      ${Number(pago.monto).toFixed(2)}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => handleApprove(pago)}
                      disabled={isProcessing}
                      className="btn-primary py-1.5 px-3 text-sm font-semibold rounded-lg disabled:opacity-50"
                    >
                      {isProcessing ? 'Aprobando...' : 'Aprobar Pago'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
