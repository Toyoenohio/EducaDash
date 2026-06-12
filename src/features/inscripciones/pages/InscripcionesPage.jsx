import { useState } from 'react'
import toast from 'react-hot-toast'
import { useInscripciones } from '../hooks/useInscripciones'
import { useAlumnos } from '../../alumnos/hooks/useAlumnos'
import { useCursos } from '../../cursos/hooks/useCursos'
import { ClipboardList, UserMinus, Plus, X } from 'lucide-react'

export default function InscripcionesPage() {
  const { inscripciones, loading, createInscripcion, retirarInscripcion } = useInscripciones()
  const { alumnos, loading: alLoading } = useAlumnos()
  const { secciones, loading: curLoading } = useCursos()

  const [filter, setFilter] = useState('todas')
  const [view, setView] = useState('list') // 'list' | 'crear'
  const [formData, setFormData] = useState({ alumno_id: '', seccion_id: '' })
  const [submitting, setSubmitting] = useState(false)

  const filtered = inscripciones.filter(i => {
    if (filter === 'activas') return i.estado === 'activa'
    if (filter === 'pendientes') return i.estado === 'pendiente'
    if (filter === 'retiradas') return i.estado === 'retirada'
    return true
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.alumno_id || !formData.seccion_id) {
      toast.error('Selecciona un alumno y una sección')
      return
    }
    setSubmitting(true)
    try {
      await createInscripcion({
        alumno_id: formData.alumno_id,
        seccion_id: formData.seccion_id,
        fecha_inscripcion: new Date().toISOString()
      })
      toast.success('Inscripción creada. Obligaciones generadas exitosamente.')
      setView('list')
      setFormData({ alumno_id: '', seccion_id: '' })
    } catch (err) {
      toast.error(err.message || 'Error al crear la inscripción')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || alLoading || curLoading) return (
    <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="skeleton h-16 w-full" />)}</div>
  )

  if (view === 'crear') {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-on-surface">Nueva Inscripción</h1>
          <button onClick={() => setView('list')} className="p-2 rounded-lg hover:bg-surface-container-high text-on-surface-variant">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="card max-w-2xl mx-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-on-surface mb-2">Seleccionar Alumno</label>
              <select 
                className="input-field"
                value={formData.alumno_id}
                onChange={e => setFormData({...formData, alumno_id: e.target.value})}
                required
              >
                <option value="" disabled>Selecciona un alumno...</option>
                {alumnos.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.cedula} - {a.nombre} {a.apellido}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-on-surface mb-2">Seleccionar Curso y Sección</label>
              <select 
                className="input-field"
                value={formData.seccion_id}
                onChange={e => setFormData({...formData, seccion_id: e.target.value})}
                required
              >
                <option value="" disabled>Selecciona una sección...</option>
                {secciones.filter(s => s.activa !== false).map(s => (
                  <option key={s.id} value={s.id}>
                    {s.curso_sede?.curso?.nombre} — Sección {s.codigo} ({s.horario_inicio?.slice(0,5)} - {s.horario_fin?.slice(0,5)})
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <button type="button" onClick={() => setView('list')} className="btn-ghost">Cancelar</button>
              <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-50">
                {submitting ? 'Inscribiendo...' : 'Confirmar Inscripción'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Gestión de Inscripciones</h1>
          <p className="text-on-surface-variant text-sm mt-1">{inscripciones.length} inscripciones totales</p>
        </div>
        <button onClick={() => setView('crear')} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" /> Nueva Inscripción
        </button>
      </div>

      <div className="flex gap-2">
        {['todas', 'activas', 'pendientes', 'retiradas', 'suspendido'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-xl text-sm font-label font-bold transition-all ${filter === f ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'}`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <ClipboardList className="w-12 h-12 mx-auto text-outline mb-4" />
          <p className="text-on-surface-variant">No hay inscripciones para mostrar</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-surface-container-low">
                  <th className="table-header">Alumno</th>
                  <th className="table-header">Curso</th>
                  <th className="table-header">Sección</th>
                  <th className="table-header">Estado</th>
                  <th className="table-header">Fecha</th>
                  <th className="table-header text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((insc, i) => (
                  <tr key={insc.id} className="table-row opacity-0 animate-fade-in" style={{ animationDelay: `${i * 0.03}s`, animationFillMode: 'forwards' }}>
                    <td className="table-cell font-semibold">{insc.alumno?.nombre} {insc.alumno?.apellido}</td>
                    <td className="table-cell">{insc.seccion?.curso_sede?.curso?.nombre || 'N/A'}</td>
                    <td className="table-cell">Sección {insc.seccion?.codigo || 'N/A'}</td>
                    <td className="table-cell">
                      <span className={
                        insc.estado === 'activa' ? 'badge-success' : 
                        insc.estado === 'pendiente' ? 'badge-warning' : 
                        insc.estado === 'suspendido' ? 'badge-error' :
                        'bg-surface-variant/40 text-on-surface'
                      }>
                        {insc.estado}
                      </span>
                    </td>
                    <td className="table-cell text-on-surface-variant">{insc.created_at?.slice(0, 10)}</td>
                    <td className="table-cell text-right">
                      {(insc.estado === 'activa' || insc.estado === 'pendiente' || insc.estado === 'suspendido') && (
                        <button onClick={() => retirarInscripcion(insc.id)} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-label font-bold text-error hover:bg-error-container rounded-lg transition-colors">
                          <UserMinus className="w-3 h-3" />Retirar
                        </button>
                      )}
                    </td>
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
