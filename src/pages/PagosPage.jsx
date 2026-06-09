import { useState, useMemo } from 'react'
import { usePagos } from '../hooks/usePagos'
import { useInscripciones } from '../hooks/useInscripciones'
import { useAlumnos } from '../hooks/useAlumnos'
import { useCursos } from '../hooks/useCursos'
import { CreditCard, CheckCircle, Clock, DollarSign, X } from 'lucide-react'

const MESES = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export default function PagosPage() {
  const { pagosPendientes, pagosPagados, loading, marcarPagado, createPago } = usePagos()
  const { inscripciones, loading: inscLoading, createInscripcion, fetchInscripciones } = useInscripciones()
  const { alumnos, loading: alumnosLoading, createAlumno } = useAlumnos()
  const { secciones, loading: cursosLoading } = useCursos()

  const [tab, setTab] = useState('pendientes')
  
  const [payModal, setPayModal] = useState(null)
  const [payForm, setPayForm] = useState({ metodo_pago: 'efectivo', referencia: '', concepto: 'cuota_mensual' })

  const [manualPayModal, setManualPayModal] = useState(false)
  const [manualTab, setManualTab] = useState('existente') // 'existente' or 'nuevo'
  const [manualForm, setManualForm] = useState({ alumno_id: '', seccion_id: '', concepto: 'inscripcion', monto: '', metodo_pago: 'efectivo', referencia: '' })
  const [newAlumnoForm, setNewAlumnoForm] = useState({ cedula: '', nombre: '', apellido: '', telefono: '', email: '' })

  const handlePay = async () => {
    if (payModal) {
      await marcarPagado(payModal.id, payForm)
      setPayModal(null)
      setPayForm({ metodo_pago: 'efectivo', referencia: '', concepto: 'cuota_mensual' })
    }
  }

  const handleManualPay = async () => {
    let currentAlumnoId = manualForm.alumno_id

    if (manualTab === 'nuevo') {
      if (!newAlumnoForm.nombre || !newAlumnoForm.apellido || !newAlumnoForm.cedula) {
        alert("Faltan datos requeridos del alumno (Nombre, Apellido, Cédula)")
        return
      }
      const { data: newAlumno, error: errAlumno } = await createAlumno(newAlumnoForm)
      if (errAlumno || !newAlumno || newAlumno.length === 0) {
        alert(errAlumno?.message || 'Error al crear el alumno')
        return
      }
      currentAlumnoId = newAlumno[0].id
    }

    if (currentAlumnoId && manualForm.seccion_id && manualForm.monto) {
      let inscripcionId = ''
      // Try to find existing inscripcion
      const existing = inscripciones.find(i => i.alumno_id === currentAlumnoId && i.seccion_id === manualForm.seccion_id)
      
      if (existing) {
        inscripcionId = existing.id
      } else {
        // Create new inscripcion (it will start as pendiente)
        const { data, error } = await createInscripcion({
          alumno_id: currentAlumnoId,
          seccion_id: manualForm.seccion_id,
          estado: 'pendiente'
        })
        if (error || !data || data.length === 0) {
          alert(error?.message || 'Error al inscribir al alumno')
          return
        }
        inscripcionId = data[0].id
      }

      const now = new Date()
      await createPago({
        inscripcion_id: inscripcionId,
        mes: now.getMonth() + 1,
        anio: now.getFullYear(),
        monto: parseFloat(manualForm.monto),
        concepto: manualForm.concepto,
        metodo_pago: manualForm.metodo_pago,
        referencia: manualForm.referencia,
        pagado: true,
        fecha_pago: now.toISOString(),
      })
      
      setManualPayModal(false)
      setManualTab('existente')
      setNewAlumnoForm({ cedula: '', nombre: '', apellido: '', telefono: '', email: '' })
      setManualForm({ alumno_id: '', seccion_id: '', concepto: 'inscripcion', monto: '', metodo_pago: 'efectivo', referencia: '' })
    }
  }

  const totalPendiente = pagosPendientes.reduce((s, p) => s + p.monto, 0)
  const totalRecaudado = pagosPagados.reduce((s, p) => s + p.monto, 0)

  if (loading || inscLoading) return (
    <div className="space-y-4">
      {[1,2,3].map(i => <div key={i} className="skeleton h-16 w-full" />)}
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-on-surface">Gestión de Pagos</h1>
        <button onClick={() => setManualPayModal(true)} className="btn-primary flex items-center gap-2">
          <CreditCard className="w-4 h-4" />
          Registrar Pago Manual
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-tertiary-fixed">
            <Clock className="w-5 h-5 text-tertiary" />
          </div>
          <div>
            <p className="text-sm text-on-surface-variant">Total Pendiente</p>
            <p className="text-2xl font-bold text-tertiary">${totalPendiente.toFixed(2)}</p>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-secondary-fixed">
            <DollarSign className="w-5 h-5 text-secondary" />
          </div>
          <div>
            <p className="text-sm text-on-surface-variant">Total Recaudado</p>
            <p className="text-2xl font-bold text-secondary">${totalRecaudado.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('pendientes')}
          className={`px-4 py-2 rounded-xl text-sm font-label font-bold transition-all ${
            tab === 'pendientes'
              ? 'bg-primary text-on-primary'
              : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
          }`}
        >
          Pendientes ({pagosPendientes.length})
        </button>
        <button
          onClick={() => setTab('historial')}
          className={`px-4 py-2 rounded-xl text-sm font-label font-bold transition-all ${
            tab === 'historial'
              ? 'bg-primary text-on-primary'
              : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
          }`}
        >
          Historial ({pagosPagados.length})
        </button>
      </div>

      {/* Content */}
      {tab === 'pendientes' ? (
        pagosPendientes.length === 0 ? (
          <div className="card p-12 text-center">
            <CheckCircle className="w-12 h-12 mx-auto text-secondary mb-4" />
            <p className="text-on-surface-variant">¡No hay pagos pendientes!</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-surface-container-low">
                    <th className="table-header">Alumno</th>
                    <th className="table-header">Curso</th>
                    <th className="table-header">Periodo</th>
                    <th className="table-header">Monto</th>
                    <th className="table-header">Vencimiento</th>
                    <th className="table-header text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pagosPendientes.map((p, i) => (
                    <tr key={p.id} className="table-row opacity-0 animate-fade-in" style={{ animationDelay: `${i * 0.03}s`, animationFillMode: 'forwards' }}>
                      <td className="table-cell font-semibold">{p.inscripcion?.alumno?.nombre} {p.inscripcion?.alumno?.apellido}</td>
                      <td className="table-cell">{p.inscripcion?.seccion?.curso_sede?.curso?.nombre || 'N/A'}</td>
                      <td className="table-cell">{p.concepto === 'inscripcion' ? 'Inscripción' : `${MESES[p.mes]} ${p.anio}`}</td>
                      <td className="table-cell font-bold">${p.monto.toFixed(2)}</td>
                      <td className="table-cell"><span className="badge-warning">{p.fecha_vencimiento}</span></td>
                      <td className="table-cell text-right">
                        <button onClick={() => { setPayModal(p); setPayForm({ metodo_pago: 'efectivo', referencia: '', concepto: p.concepto || 'cuota_mensual' }); }} className="btn-secondary text-xs px-3 py-1.5">
                          Marcar Pagado
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-surface-container-low">
                  <th className="table-header">Alumno</th>
                  <th className="table-header">Concepto</th>
                  <th className="table-header">Monto</th>
                  <th className="table-header">Método</th>
                  <th className="table-header">Referencia</th>
                  <th className="table-header">Fecha Pago</th>
                </tr>
              </thead>
              <tbody>
                {pagosPagados.map((p, i) => (
                  <tr key={p.id} className="table-row opacity-0 animate-fade-in" style={{ animationDelay: `${i * 0.03}s`, animationFillMode: 'forwards' }}>
                    <td className="table-cell font-semibold">{p.inscripcion?.alumno?.nombre} {p.inscripcion?.alumno?.apellido}</td>
                    <td className="table-cell">{p.concepto === 'inscripcion' ? 'Inscripción' : `${MESES[p.mes]} ${p.anio}`}</td>
                    <td className="table-cell font-bold text-secondary">${p.monto.toFixed(2)}</td>
                    <td className="table-cell"><span className="badge-info capitalize">{p.metodo_pago}</span></td>
                    <td className="table-cell font-mono text-xs">{p.referencia || '—'}</td>
                    <td className="table-cell">{p.fecha_pago?.slice(0,10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manual Pay Modal */}
      {manualPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setManualPayModal(false)} />
          <div className="relative bg-surface-container-lowest rounded-2xl shadow-modal w-full max-w-xl animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-surface-variant/20 sticky top-0 bg-surface-container-lowest z-10">
              <h2 className="text-xl font-bold">Registrar Pago Manual</h2>
              <button onClick={() => setManualPayModal(false)} className="p-2 rounded-lg hover:bg-surface-container-high">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Tabs for Alumno Type */}
              <div className="flex gap-2 border-b border-outline/10 pb-4">
                <button
                  onClick={() => setManualTab('existente')}
                  className={`px-4 py-2 rounded-xl text-sm font-label font-bold transition-all ${
                    manualTab === 'existente'
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                  }`}
                >
                  Alumno Existente
                </button>
                <button
                  onClick={() => setManualTab('nuevo')}
                  className={`px-4 py-2 rounded-xl text-sm font-label font-bold transition-all ${
                    manualTab === 'nuevo'
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                  }`}
                >
                  Nuevo Alumno
                </button>
              </div>

              {manualTab === 'existente' ? (
                <div>
                  <label className="block text-sm font-label font-bold text-on-surface-variant mb-1">Alumno</label>
                  <select className="input-field" value={manualForm.alumno_id || ''} onChange={e => setManualForm({...manualForm, alumno_id: e.target.value})}>
                    <option value="">Seleccionar alumno...</option>
                    {alumnos.map(a => (
                      <option key={a.id} value={a.id}>{a.nombre} {a.apellido} ({a.cedula})</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-4 bg-surface-container-low p-4 rounded-xl">
                  <h3 className="font-bold text-sm text-primary mb-2">Datos del Nuevo Alumno</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-label font-bold text-on-surface-variant mb-1">Cédula *</label>
                      <input className="input-field py-2 text-sm" value={newAlumnoForm.cedula} onChange={e => setNewAlumnoForm({...newAlumnoForm, cedula: e.target.value})} placeholder="V-12345678" />
                    </div>
                    <div>
                      <label className="block text-xs font-label font-bold text-on-surface-variant mb-1">Teléfono</label>
                      <input className="input-field py-2 text-sm" value={newAlumnoForm.telefono} onChange={e => setNewAlumnoForm({...newAlumnoForm, telefono: e.target.value})} placeholder="+58 412..." />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-label font-bold text-on-surface-variant mb-1">Nombre *</label>
                      <input className="input-field py-2 text-sm" value={newAlumnoForm.nombre} onChange={e => setNewAlumnoForm({...newAlumnoForm, nombre: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-label font-bold text-on-surface-variant mb-1">Apellido *</label>
                      <input className="input-field py-2 text-sm" value={newAlumnoForm.apellido} onChange={e => setNewAlumnoForm({...newAlumnoForm, apellido: e.target.value})} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-label font-bold text-on-surface-variant mb-1">Correo Electrónico</label>
                    <input type="email" className="input-field py-2 text-sm" value={newAlumnoForm.email} onChange={e => setNewAlumnoForm({...newAlumnoForm, email: e.target.value})} placeholder="estudiante@correo.com" />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-label font-bold text-on-surface-variant mb-1">Curso y Sección</label>
                <select className="input-field" value={manualForm.seccion_id || ''} onChange={e => setManualForm({...manualForm, seccion_id: e.target.value})}>
                  <option value="">Seleccionar curso...</option>
                  {secciones.filter(s => s.activa !== false).map(s => (
                    <option key={s.id} value={s.id}>{s.curso_sede?.curso?.nombre} - Sec. {s.codigo} ({s.curso_sede?.sede?.nombre})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-label font-bold text-on-surface-variant mb-1">Concepto</label>
                  <select className="input-field" value={manualForm.concepto} onChange={e => setManualForm({...manualForm, concepto: e.target.value})}>
                    <option value="inscripcion">Inscripción</option>
                    <option value="cuota_mensual">Cuota Mensual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-label font-bold text-on-surface-variant mb-1">Monto ($)</label>
                  <input type="number" step="0.01" className="input-field" value={manualForm.monto} onChange={e => setManualForm({...manualForm, monto: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-label font-bold text-on-surface-variant mb-1">Método de Pago</label>
                <select className="input-field" value={manualForm.metodo_pago} onChange={e => setManualForm({...manualForm, metodo_pago: e.target.value})}>
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="zelle">Zelle</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-label font-bold text-on-surface-variant mb-1">Referencia (opcional)</label>
                <input className="input-field" value={manualForm.referencia} onChange={e => setManualForm({...manualForm, referencia: e.target.value})} placeholder="REF-123456" />
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setManualPayModal(false)} className="btn-ghost flex-1">Cancelar</button>
                <button 
                  onClick={handleManualPay} 
                  disabled={
                    (manualTab === 'existente' && !manualForm.alumno_id) || 
                    (manualTab === 'nuevo' && (!newAlumnoForm.cedula || !newAlumnoForm.nombre || !newAlumnoForm.apellido)) || 
                    !manualForm.seccion_id || 
                    !manualForm.monto
                  } 
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  Confirmar Pago
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pay Modal (From Pending List) */}
      {payModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setPayModal(null)} />
          <div className="relative bg-surface-container-lowest rounded-2xl shadow-modal w-full max-w-md animate-scale-in">
            <div className="flex items-center justify-between p-6 border-b border-surface-variant/20">
              <h2 className="text-xl font-bold">Completar Pago Pendiente</h2>
              <button onClick={() => setPayModal(null)} className="p-2 rounded-lg hover:bg-surface-container-high">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-surface-container-low rounded-xl p-4">
                <p className="text-sm text-on-surface-variant">
                  Alumno: <strong>{payModal.inscripcion?.alumno?.nombre} {payModal.inscripcion?.alumno?.apellido}</strong>
                </p>
                <p className="text-sm text-on-surface-variant">
                  Periodo: <strong>{payModal.concepto === 'inscripcion' ? 'Inscripción' : `${MESES[payModal.mes]} ${payModal.anio}`}</strong>
                </p>
                <p className="text-sm text-on-surface-variant">
                  Monto: <strong className="text-secondary">${payModal.monto.toFixed(2)}</strong>
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-label font-bold text-on-surface-variant mb-1">Concepto</label>
                <select className="input-field" value={payForm.concepto} onChange={e => setPayForm({...payForm, concepto: e.target.value})}>
                  <option value="inscripcion">Inscripción</option>
                  <option value="cuota_mensual">Cuota Mensual</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-label font-bold text-on-surface-variant mb-1">Método de Pago</label>
                <select className="input-field" value={payForm.metodo_pago} onChange={e => setPayForm({...payForm, metodo_pago: e.target.value})}>
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="zelle">Zelle</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-label font-bold text-on-surface-variant mb-1">Referencia (opcional)</label>
                <input className="input-field" value={payForm.referencia} onChange={e => setPayForm({...payForm, referencia: e.target.value})} placeholder="REF-123456" />
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setPayModal(null)} className="btn-ghost flex-1">Cancelar</button>
                <button onClick={handlePay} className="btn-primary flex-1">Confirmar Pago</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>

  )
}
