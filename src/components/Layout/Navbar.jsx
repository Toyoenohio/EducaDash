import { useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useSede } from '../../contexts/SedeContext'
import { useSedes } from '../../features/sedes/hooks/useSedes'
import { Menu, Bell } from 'lucide-react'

const routeTitles = {
  '/': 'Dashboard',
  '/sedes': 'Sedes',
  '/cursos': 'Cursos',
  '/alumnos': 'Alumnos',
  '/inscripciones': 'Inscripciones',
  '/pagos': 'Pagos',
  '/asistencia': 'Asistencia',
}

function getFormattedDate() {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const formatted = formatter.format(now)
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

export default function Navbar({ onMenuClick, sidebarCollapsed }) {
  const { pathname } = useLocation()
  const { user, isSuperAdmin } = useAuth()
  const { selectedSede, setSelectedSede } = useSede()
  const { sedes } = useSedes()

  const pageTitle = routeTitles[pathname] || 'Dashboard'
  const displayName = user?.user_metadata?.nombre || user?.email?.split('@')[0] || 'Usuario'
  const userInitial = displayName.charAt(0).toUpperCase()
  const roleBadge = isSuperAdmin ? 'Super Admin' : user?.role === 'admin_sede' ? 'Admin Sede' : 'Estudiante'
  const formattedDate = getFormattedDate()

  return (
    <header
      className={`
        sticky top-0 z-30
        bg-surface-container-lowest/80 backdrop-blur-lg
        border-b border-surface-variant/20
        transition-all duration-300
      `}
    >
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        {/* Left section */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="p-2 -ml-2 rounded-xl text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors lg:hidden"
            aria-label="Abrir menú"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div>
            <h1 className="text-lg sm:text-xl font-bold text-on-surface font-sans tracking-tight">
              {pageTitle}
            </h1>
            <p className="text-xs text-on-surface-variant font-label hidden sm:block">
              {formattedDate}
            </p>
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-3">
          {/* Sede Selector for Super Admin */}
          {isSuperAdmin && (
            <div className="hidden md:block mr-2">
              <select 
                className="input-field py-1.5 text-sm w-48 font-label bg-surface-container"
                value={selectedSede}
                onChange={(e) => setSelectedSede(e.target.value)}
              >
                <option value="todas">Todas las Sedes</option>
                {sedes.map(s => (
                  <option key={s.id} value={s.id}>{s.nombre.replace('EDUCA Sede ', '')}</option>
                ))}
              </select>
            </div>
          )}

          <span className="text-xs text-on-surface-variant font-label sm:hidden">
            {formattedDate}
          </span>

          <button
            className="relative p-2 rounded-xl text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
            aria-label="Notificaciones"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full ring-2 ring-surface-container-lowest" />
          </button>

          <div className="hidden sm:block w-px h-8 bg-surface-variant/40" />

          <div className="hidden sm:flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold text-on-surface font-label leading-tight">
                {displayName}
              </p>
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary font-label">
                {roleBadge}
              </span>
            </div>

            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center ring-2 ring-primary/20 shadow-sm">
              <span className="text-sm font-bold text-on-primary font-label">
                {userInitial}
              </span>
            </div>
          </div>

          <div className="sm:hidden w-8 h-8 rounded-full bg-primary flex items-center justify-center ring-2 ring-primary/20">
            <span className="text-xs font-bold text-on-primary font-label">
              {userInitial}
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
