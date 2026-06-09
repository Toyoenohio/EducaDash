import { useState } from 'react'
import { useInscripciones } from '../hooks/useInscripciones'
import { ClipboardList, UserMinus } from 'lucide-react'

export default function InscripcionesPage() {
  const { inscripciones, loading, retirarInscripcion } = useInscripciones()
  const [filter, setFilter] = useState('todas')

  const filtered = inscripciones.filter(i => {
    if (filter === 'activas') return i.estado === 'activa'
    if (filter === 'pendientes') return i.estado === 'pendiente'
    if (filter === 'retiradas') return i.estado === 'retirada'
    return true
  })

  if (loading) return (<div className="space-y-4">{[1,2,3].map(i => <div key={i} className="skeleton h-16 w-full" />)}</div>)

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-on-surface">Gestión de Inscripciones</h1><p className="text-on-surface-variant text-sm mt-1">{inscripciones.length} inscripciones totales</p></div>

      <div className="flex gap-2">
        {['todas', 'activas', 'pendientes', 'retiradas'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-xl text-sm font-label font-bold transition-all ${filter === f ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'}`}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card p-12 text-center"><ClipboardList className="w-12 h-12 mx-auto text-outline mb-4" /><p className="text-on-surface-variant">No hay inscripciones</p></div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-surface-container-low"><th className="table-header">Alumno</th><th className="table-header">Curso</th><th className="table-header">Sección</th><th className="table-header">Estado</th><th className="table-header">Fecha</th><th className="table-header text-right">Acciones</th></tr></thead>
              <tbody>
                {filtered.map((insc, i) => (
                  <tr key={insc.id} className="table-row opacity-0 animate-fade-in" style={{ animationDelay: `${i * 0.03}s`, animationFillMode: 'forwards' }}>
                    <td className="table-cell font-semibold">{insc.alumno?.nombre} {insc.alumno?.apellido}</td>
                    <td className="table-cell">{insc.seccion?.curso_sede?.curso?.nombre || 'N/A'}</td>
                    <td className="table-cell">Sección {insc.seccion?.codigo || 'N/A'}</td>
                    <td className="table-cell"><span className={insc.estado === 'activa' ? 'badge-success' : insc.estado === 'pendiente' ? 'badge-warning' : 'badge-error'}>{insc.estado}</span></td>
                    <td className="table-cell text-on-surface-variant">{insc.created_at?.slice(0, 10)}</td>
                    <td className="table-cell text-right">{(insc.estado === 'activa' || insc.estado === 'pendiente') && <button onClick={() => retirarInscripcion(insc.id)} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-label font-bold text-error hover:bg-error-container rounded-lg transition-colors"><UserMinus className="w-3 h-3" />Retirar</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
