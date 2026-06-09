import { useState, useMemo } from 'react'
import { useAsistencia } from '../hooks/useAsistencia'
import { useCursos } from '../hooks/useCursos'
import { CalendarCheck, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

export default function AsistenciaPage() {
  const { cursos } = useCursos()
  const { asistencia, loading } = useAsistencia()
  
  const fechas = [...new Set(asistencia.map(a => a.fecha))].sort()
  const [selectedDate, setSelectedDate] = useState(fechas[0] || new Date().toISOString().split('T')[0])
  const [selectedCurso, setSelectedCurso] = useState('')

  const registros = useMemo(
    () => asistencia.filter(a => {
      const matchFecha = a.fecha === selectedDate
      const matchCurso = selectedCurso ? a.inscripcion?.seccion?.curso_sede?.curso?.id === selectedCurso : true
      return matchFecha && matchCurso
    }),
    [asistencia, selectedDate, selectedCurso]
  )

  const presentes = registros.filter(r => r.estado === 'presente').length
  const ausentes = registros.filter(r => r.estado === 'ausente').length
  const tardanzas = registros.filter(r => r.estado === 'tardanza').length

  const estadoIcon = {
    presente: <CheckCircle className="w-4 h-4 text-secondary" />,
    ausente: <XCircle className="w-4 h-4 text-error" />,
    tardanza: <AlertTriangle className="w-4 h-4 text-tertiary" />,
  }

  const estadoBadge = {
    presente: 'badge-success',
    ausente: 'badge-error',
    tardanza: 'badge-warning',
  }

  if (loading) return (
    <div className="space-y-4">
      {[1, 2, 3].map(i => <div key={i} className="skeleton h-16 w-full" />)}
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-on-surface">Control de Asistencia</h1>
        <p className="text-on-surface-variant text-sm mt-1">Registro diario de asistencia por curso</p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div>
          <label className="block text-sm font-label font-bold text-on-surface-variant mb-1">
            Curso
          </label>
          <select
            className="input-field w-auto min-w-[200px]"
            value={selectedCurso}
            onChange={e => setSelectedCurso(e.target.value)}
          >
            <option value="">Todos los Cursos</option>
            {cursos.map(c => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-label font-bold text-on-surface-variant mb-1">
            Fecha
          </label>
          <input
            type="date"
            className="input-field w-auto"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
          />
        </div>
        <div className="flex gap-3 flex-wrap mt-6">
          <div className="flex items-center gap-2 badge-success">
            <CheckCircle className="w-3 h-3" />
            {presentes} Presentes
          </div>
          <div className="flex items-center gap-2 badge-error">
            <XCircle className="w-3 h-3" />
            {ausentes} Ausentes
          </div>
          <div className="flex items-center gap-2 badge-warning">
            <AlertTriangle className="w-3 h-3" />
            {tardanzas} Tardanzas
          </div>
        </div>
      </div>

      {/* Table */}
      {registros.length === 0 ? (
        <div className="card p-12 text-center">
          <CalendarCheck className="w-12 h-12 mx-auto text-outline mb-4" />
          <p className="text-on-surface-variant">No hay registros para esta fecha</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-surface-container-low">
                  <th className="table-header">Alumno</th>
                  <th className="table-header">Curso</th>
                  <th className="table-header">Estado</th>
                  <th className="table-header">Entrada</th>
                  <th className="table-header">Salida</th>
                  <th className="table-header">Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {registros.map((r, i) => (
                  <tr
                    key={r.id}
                    className="table-row opacity-0 animate-fade-in"
                    style={{ animationDelay: `${i * 0.03}s`, animationFillMode: 'forwards' }}
                  >
                    <td className="table-cell font-semibold">
                      {r.inscripcion?.alumno?.nombre} {r.inscripcion?.alumno?.apellido}
                    </td>
                    <td className="table-cell">
                      {r.inscripcion?.seccion?.curso_sede?.curso?.nombre || 'N/A'}
                    </td>
                    <td className="table-cell">
                      <span className={`${estadoBadge[r.estado]} flex items-center gap-1 w-fit`}>
                        {estadoIcon[r.estado]}
                        {r.estado}
                      </span>
                    </td>
                    <td className="table-cell">{r.hora_entrada?.slice(0, 5)}</td>
                    <td className="table-cell">{r.hora_salida?.slice(0, 5)}</td>
                    <td className="table-cell text-on-surface-variant text-sm">
                      {r.observaciones || '—'}
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
