import { Users, ClipboardList, CreditCard, DollarSign, TrendingUp } from 'lucide-react'
import { useSede } from '../../contexts/SedeContext'
import { useDashboard } from '../../hooks/useDashboard'
import { useMemo } from 'react'

export default function StatsCards() {
  const { selectedSede } = useSede()
  const { inscripciones, pagos, loading } = useDashboard()

  const stats = useMemo(() => {
    // Filter data based on selected sede
    const filteredInscripciones = inscripciones.filter(i => 
      selectedSede === 'todas' || i.seccion?.curso_sede?.sede?.id === selectedSede
    )
    const filteredPagos = pagos.filter(p => 
      selectedSede === 'todas' || p.inscripcion?.seccion?.curso_sede?.sede?.id === selectedSede
    )

    // Calculate unique students from filtered enrollments
    const uniqueStudents = new Set(filteredInscripciones.map(i => i.alumno_id)).size
    
    const activeInsc = filteredInscripciones.filter(i => i.estado === 'activa').length
    const pendingPagos = filteredPagos.filter(p => !p.pagado).length
    const ingresos = filteredPagos.filter(p => p.pagado).reduce((sum, p) => sum + p.monto, 0)

    return [
      {
        label: 'Total Alumnos',
        value: uniqueStudents,
        icon: Users,
        color: 'bg-primary-fixed/20 text-primary',
        iconBg: 'bg-primary-fixed',
        change: '+12%',
        positive: true,
      },
      {
        label: 'Inscripciones Activas',
        value: activeInsc,
        icon: ClipboardList,
        color: 'bg-secondary-fixed/20 text-secondary',
        iconBg: 'bg-secondary-fixed',
        change: '+8%',
        positive: true,
      },
      {
        label: 'Pagos Pendientes',
        value: pendingPagos,
        icon: CreditCard,
        color: 'bg-tertiary-fixed/20 text-tertiary',
        iconBg: 'bg-tertiary-fixed',
        change: '-5%',
        positive: false,
      },
      {
        label: 'Ingresos Totales',
        value: `$${ingresos.toFixed(2)}`,
        icon: DollarSign,
        color: 'bg-secondary-fixed/20 text-secondary',
        iconBg: 'bg-secondary-fixed',
        change: '+15%',
        positive: true,
      },
    ]
  }, [inscripciones, pagos, selectedSede])

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-32 w-full" />)}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
      {stats.map((stat, index) => (
        <div
          key={stat.label}
          className="card p-6 hover:scale-[1.02] cursor-default opacity-0 animate-fade-in"
          style={{ animationDelay: `${index * 0.1}s`, animationFillMode: 'forwards' }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-xl ${stat.iconBg}`}>
              <stat.icon className="w-5 h-5 text-on-surface" />
            </div>
            <div className={`flex items-center gap-1 text-xs font-label font-bold ${
              stat.positive ? 'text-secondary' : 'text-error'
            }`}>
              <TrendingUp className={`w-3 h-3 ${!stat.positive ? 'rotate-180' : ''}`} />
              {stat.change}
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-on-surface mb-1 animate-count-up">
            {stat.value}
          </p>
          <p className="text-sm text-on-surface-variant">{stat.label}</p>
        </div>
      ))}
    </div>
  )
}
