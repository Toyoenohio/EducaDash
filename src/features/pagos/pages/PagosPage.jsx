import { useState, useMemo } from 'react'
import toast from 'react-hot-toast'
import { useObligaciones } from '../hooks/useObligaciones'
import { useInscripciones } from '../../inscripciones/hooks/useInscripciones'
import { useAlumnos } from '../../alumnos/hooks/useAlumnos'
import { useCursos } from '../../cursos/hooks/useCursos'
import { CreditCard, CheckCircle, Clock, DollarSign, X, AlertTriangle, ChevronRight, UserCircle, Award } from 'lucide-react'

const CONCEPTO_LABELS = {
  inscripcion: 'Inscripción',
  cuota_semanal: 'Cuota Semanal',
  carnet: 'Carnet',
  certificado: 'Certificado',
}

export default function PagosPage() {
  const { obligaciones, pendientes, vencidas, pagadas, loading, totalPendiente, totalVencido, totalRecaudado, registrarPago, agregarCertificado } = useObligaciones()
  const { inscripciones, loading: inscLoading } = useInscripciones()
  const { alumnos, loading: alumnosLoading } = useAlumnos()
  const { secciones, loading: cursosLoading } = useCursos()

  const [tab, setTab] = useState('pendientes')
  const [view, setView] = useState('list') // 'list' | 'registrarPago' | 'detalleAlumno'
  const [selectedInscripcionId, setSelectedInscripcionId] = useState(null)
  const [selectedObligaciones, setSelectedObligaciones] = useState([])
  const [payForm, setPayForm] = useState({ monto: '', metodo_pago: 'efectivo', referencia: '' })
  const [submitting, setSubmitting] = useState(false)

  // Group obligations by alumno for the list view
  const obligacionesPorAlumno = useMemo(() => {
    const impagas = [...pendientes, ...vencidas]
    const grouped = {}
    for (const o of impagas) {
      const alumnoId = o.inscripcion?.alumno?.id || o.inscripcion?.alumno_id || 'unknown'
      if (!grouped[alumnoId]) {
        grouped[alumnoId] = {
          alumno: o.inscripcion?.alumno,
          seccion: o.inscripcion?.seccion,
          inscripcion_id: o.inscripcion_id,
          obligaciones: [],
          totalDeuda: 0,
          vencidas: 0,
        }
      }
      grouped[alumnoId].obligaciones.push(o)
      grouped[alumnoId].totalDeuda += Number(o.saldo_pendiente)
      if (o.estado === 'vencido') grouped[alumnoId].vencidas++
    }
    return Object.values(grouped).sort((a, b) => b.vencidas - a.vencidas)
  }, [pendientes, vencidas])

  // When selecting an alumno to pay
  const openRegistrarPago = (inscripcionId = null) => {
    setSelectedInscripcionId(inscripcionId)
    setSelectedObligaciones([])
    setPayForm({ monto: '', metodo_pago: 'efectivo', referencia: '' })
    setView('registrarPago')
  }

  const openDetalleAlumno = (inscripcionId) => {
    setSelectedInscripcionId(inscripcionId)
    setView('detalleAlumno')
  }

  // Toggle obligation selection
  const toggleObligacion = (obligId) => {
    setSelectedObligaciones(prev => {
      const next = prev.includes(obligId)
        ? prev.filter(id => id !== obligId)
        : [...prev, obligId]
      // Auto-calculate monto
      const total = next.reduce((sum, id) => {
        const o = alumnoObligaciones.find(ob => ob.id === id)
        return sum + (o ? Number(o.saldo_pendiente) : 0)
      }, 0)
      setPayForm(f => ({ ...f, monto: total.toFixed(2) }))
      return next
    })
  }

  const selectAll = () => {
    const allIds = alumnoObligaciones.filter(o => o.estado !== 'pagado').map(o => o.id)
    setSelectedObligaciones(allIds)
    const total = alumnoObligaciones
      .filter(o => o.estado !== 'pagado')
      .reduce((sum, o) => sum + Number(o.saldo_pendiente), 0)
    setPayForm(f => ({ ...f, monto: total.toFixed(2) }))
  }

  // Get obligaciones for selected inscription
  const alumnoObligaciones = useMemo(() => {
    if (!selectedInscripcionId) return []
    return obligaciones
      .filter(o => o.inscripcion_id === selectedInscripcionId)
      .sort((a, b) => {
        if (a.concepto === 'inscripcion') return -1
        if (b.concepto === 'inscripcion') return 1
        if (a.concepto === 'certificado' || a.concepto === 'carnet') return 1
        if (b.concepto === 'certificado' || b.concepto === 'carnet') return -1
        return (a.numero_semana || 0) - (b.numero_semana || 0)
      })
  }, [obligaciones, selectedInscripcionId])

  const handlePago = async () => {
    if (!selectedInscripcionId || !payForm.monto || selectedObligaciones.length === 0) return
    setSubmitting(true)
    try {
      await registrarPago({
        inscripcion_id: selectedInscripcionId,
        monto: parseFloat(payForm.monto),
        metodo_pago: payForm.metodo_pago,
        referencia: payForm.referencia || null,
        obligacion_ids: selectedObligaciones,
      })
      toast.success('Pago registrado y distribuido correctamente')
      setView('list')
    } catch (err) {
      toast.error(err?.message || 'Error al registrar el pago')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAgregarCertificado = async (inscripcionId, concepto = 'carnet') => {
    try {
      await agregarCertificado({ inscripcionId, concepto })
      toast.success(`${concepto === 'carnet' ? 'Carnet' : 'Certificado'} agregado como obligación`)
    } catch (err) {
      toast.error(err?.message || 'Error al agregar obligación')
    }
  }

  if (loading || inscLoading) return (
    <div className="space-y-4">
      {[1,2,3].map(i => <div key={i} className="skeleton h-16 w-full" />)}
    </div>
  )

  // ──────────────────────── VIEW: Registrar Pago ────────────────────────
  if (view === 'registrarPago') {
    const firstOblig = alumnoObligaciones[0]
    const currentInscripcion = inscripciones.find(i => i.id === selectedInscripcionId)
    const alumnoInfo = firstOblig?.inscripcion?.alumno || currentInscripcion?.alumno
    const seccionInfo = firstOblig?.inscripcion?.seccion || currentInscripcion?.seccion

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <button onClick={() => setView('list')} className="p-2 rounded-lg hover:bg-surface-container-high text-on-surface-variant"><X className="w-5 h-5" /></button>
          <div>
            <h1 className="text-2xl font-bold text-on-surface">Registrar Pago</h1>
            {selectedInscripcionId ? (
              <p className="text-sm text-on-surface-variant">{alumnoInfo?.nombre} {alumnoInfo?.apellido} — {seccionInfo?.curso_sede?.curso?.nombre}</p>
            ) : (
              <p className="text-sm text-on-surface-variant">Selecciona un alumno inscrito para continuar</p>
            )}
          </div>
        </div>

        {!selectedInscripcionId ? (
          <div className="card p-6">
            <h2 className="font-bold text-on-surface mb-4">Seleccionar Alumno</h2>
            <select 
              className="input-field w-full max-w-2xl"
              value=""
              onChange={(e) => setSelectedInscripcionId(e.target.value)}
            >
              <option value="" disabled>Seleccione una inscripción...</option>
              {inscripciones.map(i => (
                <option key={i.id} value={i.id}>
                  {i.alumno?.cedula} - {i.alumno?.nombre} {i.alumno?.apellido} ({i.seccion?.curso_sede?.curso?.nombre} - Sec {i.seccion?.codigo})
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Obligaciones Selection */}
          <div className="lg:col-span-2 card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-on-surface">Seleccionar Obligaciones a Pagar</h2>
              <button onClick={selectAll} className="text-xs font-label font-bold text-primary hover:underline">Seleccionar Todas</button>
            </div>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {alumnoObligaciones.map(o => {
                const isSelected = selectedObligaciones.includes(o.id)
                const isPagado = o.estado === 'pagado'
                return (
                  <label
                    key={o.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                      isPagado ? 'opacity-50 cursor-not-allowed border-surface-variant/20 bg-surface-container-lowest' :
                      isSelected ? 'border-primary/50 bg-primary-fixed/30' : 'border-surface-variant/20 hover:bg-surface-container-low'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={isPagado}
                      onChange={() => !isPagado && toggleObligacion(o.id)}
                      className="w-4 h-4 rounded border-outline accent-primary"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-on-surface">{CONCEPTO_LABELS[o.concepto]}</span>
                        {o.numero_semana && <span className="text-xs text-on-surface-variant">Sem. {o.numero_semana}</span>}
                      </div>
                      <p className="text-xs text-on-surface-variant">Vence: {o.fecha_vencimiento}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-on-surface">${Number(o.monto).toFixed(2)}</p>
                      {Number(o.total_abonado) > 0 && Number(o.saldo_pendiente) > 0 && (
                        <p className="text-[10px] text-tertiary">Abonado: ${Number(o.total_abonado).toFixed(2)}</p>
                      )}
                      {Number(o.saldo_pendiente) > 0 && Number(o.saldo_pendiente) < Number(o.monto) && (
                        <p className="text-[10px] font-bold text-secondary">Saldo: ${Number(o.saldo_pendiente).toFixed(2)}</p>
                      )}
                    </div>
                    <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      o.estado === 'pagado' ? 'bg-success/20 text-success' :
                      o.estado === 'vencido' ? 'bg-error/20 text-error' :
                      'bg-tertiary-fixed text-tertiary'
                    }`}>{o.estado}</span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Payment Form */}
          <div className="card p-6 h-fit sticky top-4">
            <h2 className="font-bold text-on-surface mb-4">Detalles del Pago</h2>
            <div className="space-y-4">
              <div className="bg-surface-container-lowest rounded-xl p-4 border border-surface-variant/20">
                <p className="text-xs text-on-surface-variant">Obligaciones seleccionadas</p>
                <p className="text-2xl font-bold text-primary">{selectedObligaciones.length}</p>
              </div>
              <div>
                <label className="block text-sm font-label font-bold text-on-surface-variant mb-1">Monto a Pagar ($)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  className="input-field text-lg font-bold" 
                  value={payForm.monto} 
                  onChange={e => setPayForm({...payForm, monto: e.target.value})} 
                  placeholder="0.00"
                />
                <p className="text-[10px] text-on-surface-variant mt-1">Puedes ajustar para pagos parciales</p>
              </div>
              <div>
                <label className="block text-sm font-label font-bold text-on-surface-variant mb-1">Método de Pago</label>
                <select className="input-field" value={payForm.metodo_pago} onChange={e => setPayForm({...payForm, metodo_pago: e.target.value})}>
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="zelle">Zelle</option>
                  <option value="pago_movil">Pago Móvil</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-label font-bold text-on-surface-variant mb-1">Referencia (opcional)</label>
                <input className="input-field" value={payForm.referencia} onChange={e => setPayForm({...payForm, referencia: e.target.value})} placeholder="REF-123456" />
              </div>
              <div className="flex gap-3 pt-4 border-t border-surface-variant/20">
                <button onClick={() => setView('list')} className="btn-ghost flex-1">Cancelar</button>
                <button 
                  onClick={handlePago} 
                  disabled={submitting || selectedObligaciones.length === 0 || !payForm.monto || parseFloat(payForm.monto) <= 0}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {submitting ? 'Procesando...' : 'Confirmar Pago'}
                </button>
              </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ──────────────────────── VIEW: Detalle Alumno ────────────────────────
  if (view === 'detalleAlumno' && selectedInscripcionId) {
    const firstOblig = alumnoObligaciones[0]
    const alumnoInfo = firstOblig?.inscripcion?.alumno
    const seccionInfo = firstOblig?.inscripcion?.seccion
    const tieneCarnet = alumnoObligaciones.some(o => o.concepto === 'carnet')
    const tieneCertificado = alumnoObligaciones.some(o => o.concepto === 'certificado')

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setView('list')} className="p-2 rounded-lg hover:bg-surface-container-high text-on-surface-variant"><X className="w-5 h-5" /></button>
            <div>
              <h1 className="text-2xl font-bold text-on-surface">{alumnoInfo?.nombre} {alumnoInfo?.apellido}</h1>
              <p className="text-sm text-on-surface-variant">{seccionInfo?.curso_sede?.curso?.nombre} — Sec. {seccionInfo?.codigo}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {!tieneCarnet && (
              <button onClick={() => handleAgregarCertificado(selectedInscripcionId, 'carnet')} className="btn-ghost text-sm flex items-center gap-1.5">
                <Award className="w-4 h-4" /> Carnet ($15)
              </button>
            )}
            {!tieneCertificado && (
              <button onClick={() => handleAgregarCertificado(selectedInscripcionId, 'certificado')} className="btn-ghost text-sm flex items-center gap-1.5">
                <Award className="w-4 h-4" /> Certificado ($10)
              </button>
            )}
            <button onClick={() => openRegistrarPago(selectedInscripcionId)} className="btn-primary text-sm flex items-center gap-1.5">
              <CreditCard className="w-4 h-4" /> Registrar Pago
            </button>
          </div>
        </div>

        {/* Timeline Visual */}
        <div className="card p-6">
          <h2 className="font-bold text-on-surface mb-4">Estado de Obligaciones</h2>
          
          {/* Legend */}
          <div className="flex gap-4 items-center text-xs text-on-surface-variant mb-6 bg-surface-container-lowest p-3 rounded-lg border border-surface-variant/20">
            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-success"></div> Pagado</span>
            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-error"></div> Vencido</span>
            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-tertiary"></div> Pendiente</span>
            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-surface-variant/40"></div> Sin generar</span>
          </div>

          <div className="space-y-3">
            {alumnoObligaciones.map(o => (
              <div key={o.id} className={`flex items-center gap-4 p-3 rounded-xl border transition-all ${
                o.estado === 'pagado' ? 'border-success/30 bg-success/5' :
                o.estado === 'vencido' ? 'border-error/30 bg-error/5' :
                'border-surface-variant/20'
              }`}>
                <div className={`w-4 h-4 rounded-full shrink-0 ${
                  o.estado === 'pagado' ? 'bg-success' :
                  o.estado === 'vencido' ? 'bg-error' :
                  'bg-tertiary'
                }`} />
                <div className="flex-1">
                  <p className="text-sm font-bold text-on-surface">
                    {CONCEPTO_LABELS[o.concepto]}
                    {o.numero_semana && ` — Semana ${o.numero_semana}`}
                  </p>
                  <p className="text-xs text-on-surface-variant">Vence: {o.fecha_vencimiento}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">${Number(o.monto).toFixed(2)}</p>
                  {Number(o.total_abonado) > 0 && (
                    <p className="text-[10px] text-success">Abonado: ${Number(o.total_abonado).toFixed(2)}</p>
                  )}
                  {Number(o.saldo_pendiente) > 0 && o.estado !== 'pagado' && (
                    <p className="text-[10px] font-bold text-error">Saldo: ${Number(o.saldo_pendiente).toFixed(2)}</p>
                  )}
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                  o.estado === 'pagado' ? 'bg-success/20 text-success' :
                  o.estado === 'vencido' ? 'bg-error/20 text-error' :
                  'bg-tertiary-fixed text-tertiary'
                }`}>{o.estado}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ──────────────────────── VIEW: List (Principal) ────────────────────────
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-on-surface">Gestión de Pagos</h1>
        <button onClick={() => openRegistrarPago(null)} className="btn-primary flex items-center gap-2">
          <CreditCard className="w-5 h-5" /> Registrar Pago
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-tertiary-fixed"><Clock className="w-5 h-5 text-tertiary" /></div>
          <div><p className="text-sm text-on-surface-variant">Pendiente</p><p className="text-2xl font-bold text-tertiary">${totalPendiente.toFixed(2)}</p></div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-error-container"><AlertTriangle className="w-5 h-5 text-error" /></div>
          <div><p className="text-sm text-on-surface-variant">Vencido</p><p className="text-2xl font-bold text-error">${totalVencido.toFixed(2)}</p></div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-secondary-fixed"><DollarSign className="w-5 h-5 text-secondary" /></div>
          <div><p className="text-sm text-on-surface-variant">Recaudado</p><p className="text-2xl font-bold text-secondary">${totalRecaudado.toFixed(2)}</p></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setTab('pendientes')} className={`px-4 py-2 rounded-xl text-sm font-label font-bold transition-all ${tab === 'pendientes' ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'}`}>
          Deudas por Alumno ({obligacionesPorAlumno.length})
        </button>
        <button onClick={() => setTab('historial')} className={`px-4 py-2 rounded-xl text-sm font-label font-bold transition-all ${tab === 'historial' ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'}`}>
          Pagadas ({pagadas.length})
        </button>
      </div>

      {/* Content */}
      {tab === 'pendientes' ? (
        obligacionesPorAlumno.length === 0 ? (
          <div className="card p-12 text-center"><CheckCircle className="w-12 h-12 mx-auto text-secondary mb-4" /><p className="text-on-surface-variant">¡No hay deudas pendientes!</p></div>
        ) : (
          <div className="space-y-3">
            {obligacionesPorAlumno.map((grupo, i) => (
              <div key={grupo.inscripcion_id} className="card p-4 opacity-0 animate-fade-in" style={{ animationDelay: `${i * 0.03}s`, animationFillMode: 'forwards' }}>
                <div className="flex items-center gap-4">
                  <UserCircle className="w-10 h-10 text-outline shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-on-surface">{grupo.alumno?.nombre} {grupo.alumno?.apellido}</p>
                    <p className="text-xs text-on-surface-variant">{grupo.seccion?.curso_sede?.curso?.nombre} — Sec. {grupo.seccion?.codigo}</p>
                  </div>
                  <div className="text-right shrink-0 mr-2">
                    <p className="text-lg font-bold text-error">${grupo.totalDeuda.toFixed(2)}</p>
                    <p className="text-[10px] text-on-surface-variant">
                      {grupo.vencidas > 0 && <span className="text-error font-bold">{grupo.vencidas} vencida{grupo.vencidas > 1 ? 's' : ''}</span>}
                      {grupo.vencidas > 0 && grupo.obligaciones.length - grupo.vencidas > 0 && ' • '}
                      {grupo.obligaciones.length - grupo.vencidas > 0 && `${grupo.obligaciones.length - grupo.vencidas} pendiente${grupo.obligaciones.length - grupo.vencidas > 1 ? 's' : ''}`}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openDetalleAlumno(grupo.inscripcion_id)} className="p-2 rounded-lg hover:bg-surface-container-high text-on-surface-variant" title="Ver detalle">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button onClick={() => openRegistrarPago(grupo.inscripcion_id)} className="btn-secondary text-xs px-3 py-1.5">
                      Pagar
                    </button>
                  </div>
                </div>
                {/* Mini timeline */}
                <div className="flex gap-1 mt-3 pt-3 border-t border-surface-variant/10">
                  {(() => {
                    const allForInsc = obligaciones.filter(o => o.inscripcion_id === grupo.inscripcion_id)
                      .sort((a, b) => {
                        if (a.concepto === 'inscripcion') return -1
                        if (b.concepto === 'inscripcion') return 1
                        if (a.concepto === 'certificado' || a.concepto === 'carnet') return 1
                        if (b.concepto === 'certificado' || b.concepto === 'carnet') return -1
                        return (a.numero_semana || 99) - (b.numero_semana || 99)
                      })
                    return allForInsc.map(o => (
                      <div
                        key={o.id}
                        className={`w-3 h-3 rounded-full ${
                          o.estado === 'pagado' ? 'bg-success' :
                          o.estado === 'vencido' ? 'bg-error' :
                          'bg-tertiary/40'
                        }`}
                        title={`${CONCEPTO_LABELS[o.concepto]}${o.numero_semana ? ` S${o.numero_semana}` : ''} — ${o.estado} — $${Number(o.saldo_pendiente).toFixed(2)}`}
                      />
                    ))
                  })()}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-surface-container-low">
                <th className="table-header">Alumno</th>
                <th className="table-header">Concepto</th>
                <th className="table-header">Monto</th>
                <th className="table-header">Abonado</th>
                <th className="table-header">Vencimiento</th>
              </tr></thead>
              <tbody>
                {pagadas.slice(0, 50).map((o, i) => (
                  <tr key={o.id} className="table-row opacity-0 animate-fade-in" style={{ animationDelay: `${i * 0.02}s`, animationFillMode: 'forwards' }}>
                    <td className="table-cell font-semibold">{o.inscripcion?.alumno?.nombre} {o.inscripcion?.alumno?.apellido}</td>
                    <td className="table-cell">{CONCEPTO_LABELS[o.concepto]}{o.numero_semana ? ` S${o.numero_semana}` : ''}</td>
                    <td className="table-cell font-bold text-secondary">${Number(o.monto).toFixed(2)}</td>
                    <td className="table-cell text-success">${Number(o.total_abonado).toFixed(2)}</td>
                    <td className="table-cell text-on-surface-variant">{o.fecha_vencimiento}</td>
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
