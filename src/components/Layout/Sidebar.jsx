import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  LayoutDashboard, Building2, BookOpen, Users,
  ClipboardList, CreditCard, CalendarCheck,
  LogOut, ChevronLeft, ChevronRight, GraduationCap, X
} from 'lucide-react'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/sedes', label: 'Sedes', icon: Building2, superAdminOnly: true },
  { to: '/cursos', label: 'Cursos', icon: BookOpen },
  { to: '/alumnos', label: 'Alumnos', icon: Users },
  { to: '/inscripciones', label: 'Inscripciones', icon: ClipboardList },
  { to: '/pagos', label: 'Pagos', icon: CreditCard },
  { to: '/asistencia', label: 'Asistencia', icon: CalendarCheck },
]

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }) {
  const { user, logout, isSuperAdmin } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const displayName = user?.nombre || user?.email?.split('@')[0] || 'Usuario'
  const userInitial = displayName.charAt(0).toUpperCase()
  const roleBadge = isSuperAdmin ? 'Super Admin' : user?.role === 'admin_sede' ? 'Admin Sede' : 'Estudiante'

  const filteredItems = navItems.filter(
    (item) => !item.superAdminOnly || isSuperAdmin
  )

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-0 h-screen z-50
          bg-surface-container-lowest shadow-sidebar
          border-r border-surface-variant/30
          flex flex-col
          transition-all duration-300 ease-in-out
          ${collapsed ? 'w-20' : 'w-72'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        {/* Logo / Brand */}
        <div className={`
          flex items-center border-b border-surface-variant/20
          ${collapsed ? 'px-3 py-6 justify-center' : 'px-6 py-6'}
        `}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-md">
              <GraduationCap className="w-5 h-5 text-on-primary" strokeWidth={2.5} />
            </div>
            <div className={`
              overflow-hidden transition-all duration-300
              ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}
            `}>
              <h1 className="text-xl font-bold tracking-tight text-primary font-sans whitespace-nowrap">
                EDUCA
              </h1>
              <p className="text-[10px] font-label text-on-surface-variant tracking-widest uppercase whitespace-nowrap">
                Panel Admin
              </p>
            </div>
          </div>

          {/* Mobile close button */}
          <button
            onClick={onMobileClose}
            className="ml-auto p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors lg:hidden"
            aria-label="Cerrar menú"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-thin">
          {filteredItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={onMobileClose}
                className={({ isActive }) => `
                  group relative flex items-center gap-3 rounded-xl
                  transition-all duration-200 ease-out
                  ${collapsed ? 'justify-center px-3 py-3' : 'px-4 py-3'}
                  ${isActive
                    ? 'bg-primary-fixed text-primary font-semibold shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                  }
                `}
              >
                {({ isActive }) => (
                  <>
                    {/* Active indicator bar */}
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-7 bg-primary rounded-r-full animate-scale-in" />
                    )}

                    <Icon
                      className={`
                        w-5 h-5 flex-shrink-0 transition-transform duration-200
                        ${isActive ? 'text-primary' : 'text-on-surface-variant group-hover:text-on-surface'}
                        ${!isActive ? 'group-hover:scale-110' : ''}
                      `}
                      strokeWidth={isActive ? 2.5 : 2}
                    />

                    <span className={`
                      text-sm font-label whitespace-nowrap overflow-hidden
                      transition-all duration-300
                      ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}
                    `}>
                      {item.label}
                    </span>

                    {/* Tooltip on collapsed */}
                    {collapsed && (
                      <span className="
                        absolute left-full ml-3 px-3 py-1.5
                        bg-inverse-surface text-inverse-on-surface text-xs font-label
                        rounded-lg shadow-modal
                        opacity-0 pointer-events-none
                        group-hover:opacity-100 group-hover:pointer-events-auto
                        transition-opacity duration-200
                        whitespace-nowrap z-50
                      ">
                        {item.label}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Collapse toggle */}
        <div className={`px-3 pb-2 hidden lg:block ${collapsed ? 'flex justify-center' : ''}`}>
          <button
            onClick={onToggle}
            className={`
              w-full flex items-center gap-3 rounded-xl px-4 py-2.5
              text-on-surface-variant hover:bg-surface-container hover:text-on-surface
              transition-all duration-200
              ${collapsed ? 'justify-center px-3' : ''}
            `}
            aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          >
            {collapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <>
                <ChevronLeft className="w-5 h-5" />
                <span className="text-sm font-label">Colapsar</span>
              </>
            )}
          </button>
        </div>

        {/* User profile section */}
        <div className={`
          border-t border-surface-variant/20
          ${collapsed ? 'px-2 py-4' : 'px-4 py-4'}
        `}>
          <div className={`
            flex items-center gap-3
            ${collapsed ? 'flex-col' : ''}
          `}>
            {/* Avatar */}
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary flex items-center justify-center ring-2 ring-primary/20">
              <span className="text-sm font-bold text-on-primary font-label">
                {userInitial}
              </span>
            </div>

            {/* User info */}
            <div className={`
              flex-1 min-w-0 overflow-hidden
              transition-all duration-300
              ${collapsed ? 'w-0 h-0 opacity-0' : 'opacity-100'}
            `}>
              <p className="text-sm font-semibold text-on-surface truncate font-label">
                {displayName}
              </p>
              <span className="inline-block mt-0.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary bg-primary-fixed rounded-full font-label">
                {roleBadge}
              </span>
            </div>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className={`
                flex-shrink-0 p-2 rounded-lg
                text-on-surface-variant hover:bg-error/10 hover:text-error
                transition-all duration-200
                ${collapsed ? 'mt-2' : ''}
              `}
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
