import { useAuth } from '../../../contexts/AuthContext'
import StatsCards from '../components/StatsCards'
import Graficos from '../components/Graficos'

export default function Dashboard() {
  const { user } = useAuth()
  const today = new Intl.DateTimeFormat('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date())

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="text-2xl md:text-3xl font-bold text-on-surface">
          Bienvenido, {user?.user_metadata?.nombre || user?.email?.split('@')[0] || 'Admin'}
        </h1>
        <p className="text-on-surface-variant mt-1 capitalize">{today}</p>
      </div>

      {/* Stats */}
      <StatsCards />

      {/* Charts */}
      <Graficos />
    </div>
  )
}
