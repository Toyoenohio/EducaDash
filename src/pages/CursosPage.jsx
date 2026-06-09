import { useState } from 'react'
import { useCursos } from '../hooks/useCursos'
import { useSedes } from '../hooks/useSedes'
import { mockInscripciones } from '../lib/mockData'
import { Plus, Pencil, Trash2, X, BookOpen, ChevronDown, ChevronUp, Clock, Users, UserCircle } from 'lucide-react'

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

export default function CursosPage() {
  const { cursos, secciones, loading, createCurso, updateCurso, deleteCurso } = useCursos()
  const { sedes } = useSedes()
  const [view, setView] = useState('list') // 'list' | 'form' | 'alumnos'
  const [alumnosModal, setAlumnosModal] = useState(null) // Keeps the course data for the alumnos view
  const [editing, setEditing] = useState(null)
  const [expanded, setExpanded] = useState(null)
  const [form, setForm] = useState({ nombre: '', descripcion: '', secciones: [] })

  const generateId = () => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2);
  const getEmptySeccion = () => ({ id: generateId(), sede_id: sedes[0]?.id || '', fecha_inicio: '', cupos: '', dias: [], horario_inicio: '', horario_fin: '' })

  const openCreate = () => { 
    setEditing(null); 
    setForm({ nombre: '', descripcion: '', secciones: [getEmptySeccion()] }); 
    setView('form') 
  }
  
  const openEdit = (curso) => { 
    const cursoSecciones = getCursoSecciones(curso.id)
    setEditing(curso)
    setForm({ 
      nombre: curso.nombre, 
      descripcion: curso.descripcion || '',
      secciones: cursoSecciones.length > 0 
        ? cursoSecciones.map(sec => ({
            id: sec.id,
            isExisting: true,
            sede_id: sec.curso_sede?.sede?.id || sedes[0]?.id || '',
            fecha_inicio: sec.fecha_inicio || '',
            cupos: sec.cupo_maximo || '',
            dias: sec.dias || [],
            horario_inicio: sec.horario_inicio ? sec.horario_inicio.slice(0,5) : '',
            horario_fin: sec.horario_fin ? sec.horario_fin.slice(0,5) : ''
          }))
        : [getEmptySeccion()]
    })
    setView('form') 
  }
  
  const openAlumnos = (curso) => { setAlumnosModal(curso); setView('alumnos') }
  const goBack = () => { setView('list'); setEditing(null); setAlumnosModal(null) }

  const handleSubmit = async (e) => { e.preventDefault(); if (editing) { await updateCurso(editing.id, form) } else { await createCurso(form) }; setView('list') }
  const toggleActivo = async (curso) => { await updateCurso(curso.id, { activo: !curso.activo }, true) }
  
  const getCursoSecciones = (cursoId) => secciones.filter(s => s.curso_sede?.curso?.id === cursoId)

  const addSeccion = () => setForm({ ...form, secciones: [...form.secciones, getEmptySeccion()] })
  const removeSeccion = (idToRemove) => setForm({ ...form, secciones: form.secciones.filter(s => s.id !== idToRemove) })
  const updateSeccion = (id, field, value) => setForm({ ...form, secciones: form.secciones.map(s => s.id === id ? { ...s, [field]: value } : s) })
  const toggleDia = (id, dia) => {
    setForm({ ...form, secciones: form.secciones.map(s => {
      if (s.id !== id) return s;
      return { ...s, dias: s.dias.includes(dia) ? s.dias.filter(d => d !== dia) : [...s.dias, dia] }
    })})
  }

  if (loading) return (<div className="space-y-4">{[1,2,3,4].map(i => <div key={i} className="skeleton h-20 w-full" />)}</div>)

  if (view === 'form') {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <button onClick={goBack} className="p-2 rounded-lg hover:bg-surface-container-high text-on-surface-variant"><X className="w-5 h-5" /></button>
          <h1 className="text-2xl font-bold text-on-surface">{editing ? 'Editar Curso y Sección Inicial' : 'Nuevo Curso y Sección'}</h1>
        </div>
        <div className="card p-6 max-w-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div><label className="block text-sm font-label font-bold text-on-surface-variant mb-1">Nombre</label><input className="input-field" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} required /></div>
            <div><label className="block text-sm font-label font-bold text-on-surface-variant mb-1">Descripción</label><textarea className="input-field min-h-[100px]" value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} /></div>
            
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-on-surface">Secciones del Curso</h3>
                <button type="button" onClick={addSeccion} className="btn-ghost text-primary text-sm flex items-center gap-1"><Plus className="w-4 h-4" /> Agregar otra sección</button>
              </div>

              {form.secciones.map((sec, index) => {
                const codigo = String.fromCharCode(65 + index)
                return (
                  <div key={sec.id} className="bg-surface-container-lowest border border-surface-variant/20 rounded-xl p-5 space-y-4 relative">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-primary">Sección {codigo}</p>
                      {form.secciones.length > 1 && (
                        <button type="button" onClick={() => removeSeccion(sec.id)} className="p-1.5 rounded-lg hover:bg-error-container text-error transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    
                    <div><label className="block text-sm font-label font-bold text-on-surface-variant mb-1">Sede</label><select className="input-field" value={sec.sede_id} onChange={e => updateSeccion(sec.id, 'sede_id', e.target.value)} required><option value="">Seleccione Sede...</option>{sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}</select></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="block text-sm font-label font-bold text-on-surface-variant mb-1">Fecha Inicio</label><input type="date" className="input-field" value={sec.fecha_inicio} onChange={e => updateSeccion(sec.id, 'fecha_inicio', e.target.value)} required /></div>
                      <div><label className="block text-sm font-label font-bold text-on-surface-variant mb-1">Cupos</label><input type="number" min="1" className="input-field" value={sec.cupos} onChange={e => updateSeccion(sec.id, 'cupos', e.target.value)} required /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="block text-sm font-label font-bold text-on-surface-variant mb-1">Hora Inicio</label><input type="time" className="input-field" value={sec.horario_inicio} onChange={e => updateSeccion(sec.id, 'horario_inicio', e.target.value)} required /></div>
                      <div><label className="block text-sm font-label font-bold text-on-surface-variant mb-1">Hora Fin</label><input type="time" className="input-field" value={sec.horario_fin} onChange={e => updateSeccion(sec.id, 'horario_fin', e.target.value)} required /></div>
                    </div>
                    <div>
                      <label className="block text-sm font-label font-bold text-on-surface-variant mb-2">Días de Clase</label>
                      <div className="flex flex-wrap gap-2">
                        {DIAS_SEMANA.map(dia => (
                          <button
                            key={dia}
                            type="button"
                            onClick={() => toggleDia(sec.id, dia)}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${sec.dias.includes(dia) ? 'bg-primary text-on-primary shadow-sm' : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'}`}
                          >
                            {dia}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex gap-3 pt-4 border-t border-surface-variant/20"><button type="button" onClick={goBack} className="btn-ghost flex-1">Cancelar</button><button type="submit" className="btn-primary flex-1">{editing ? 'Guardar Cambios' : 'Crear Curso'}</button></div>
          </form>
        </div>
      </div>
    )
  }

  if (view === 'alumnos') {
    const inscritos = mockInscripciones.filter(i => i.seccion?.curso_sede?.curso?.id === alumnosModal?.id)
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <button onClick={goBack} className="p-2 rounded-lg hover:bg-surface-container-high text-on-surface-variant"><X className="w-5 h-5" /></button>
          <div>
            <h1 className="text-2xl font-bold text-on-surface">Alumnos Inscritos</h1>
            <p className="text-sm text-on-surface-variant mt-1">{alumnosModal?.nombre}</p>
          </div>
        </div>
        <div className="card p-6">
          {inscritos.length === 0 ? (
            <p className="text-center text-on-surface-variant py-8">No hay alumnos inscritos en este curso.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {inscritos.map(insc => (
                <div key={insc.id} className="flex items-center justify-between p-4 border border-surface-variant/30 rounded-xl hover:bg-surface-container-low transition-colors">
                  <div className="flex items-center gap-3">
                    <UserCircle className="w-10 h-10 text-outline" />
                    <div>
                      <p className="font-bold text-sm text-on-surface">{insc.alumno?.nombre} {insc.alumno?.apellido}</p>
                      <p className="text-xs text-on-surface-variant">{insc.alumno?.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={insc.estado === 'activa' ? 'badge-success text-[10px]' : insc.estado === 'pendiente' ? 'badge-warning text-[10px]' : 'badge-error text-[10px]'}>{insc.estado}</span>
                    <p className="text-xs text-on-surface-variant mt-1 font-bold">Sec. {insc.seccion?.codigo}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div><h1 className="text-2xl font-bold text-on-surface">Gestión de Cursos</h1><p className="text-on-surface-variant text-sm mt-1">{cursos.length} cursos registrados</p></div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" />Nuevo Curso</button>
      </div>

      {cursos.length === 0 ? (
        <div className="card p-12 text-center"><BookOpen className="w-12 h-12 mx-auto text-outline mb-4" /><p className="text-on-surface-variant">No hay cursos registrados</p></div>
      ) : (
        <div className="space-y-3">
          {cursos.map((curso, i) => {
            const cursoSecciones = getCursoSecciones(curso.id)
            const isExpanded = expanded === curso.id
            return (
              <div key={curso.id} className="card overflow-hidden opacity-0 animate-fade-in" style={{ animationDelay: `${i * 0.05}s`, animationFillMode: 'forwards' }}>
                <div className="p-5 flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-[250px]">
                    <div className="p-3 rounded-xl bg-primary-fixed"><BookOpen className="w-5 h-5 text-primary" /></div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-on-surface">{curso.nombre}</h3>
                      <p className="text-sm text-on-surface-variant truncate">{curso.descripcion}</p>
                    </div>
                    <span className={curso.activo ? 'badge-success' : 'badge-error'}>{curso.activo ? 'Activo' : 'Inactivo'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openAlumnos(curso)} className="p-2 rounded-lg hover:bg-surface-container-high transition-colors text-xs font-label font-bold text-primary">Ver Alumnos</button>
                    <button onClick={() => toggleActivo(curso)} className="p-2 rounded-lg hover:bg-surface-container-high transition-colors text-xs font-label font-bold text-on-surface-variant">{curso.activo ? 'Desactivar' : 'Activar'}</button>
                    <button onClick={() => openEdit(curso)} className="p-2 rounded-lg hover:bg-surface-container-high"><Pencil className="w-4 h-4 text-on-surface-variant" /></button>
                    <button onClick={() => deleteCurso(curso.id)} className="p-2 rounded-lg hover:bg-error-container"><Trash2 className="w-4 h-4 text-error" /></button>
                    {cursoSecciones.length > 0 && <button onClick={() => setExpanded(isExpanded ? null : curso.id)} className="p-2 rounded-lg hover:bg-surface-container-high">{isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</button>}
                  </div>
                </div>
                {isExpanded && cursoSecciones.length > 0 && (
                  <div className="bg-surface-container-low border-t border-surface-variant/20 p-4">
                    <p className="text-xs font-label font-bold text-on-surface-variant uppercase mb-3">Secciones ({cursoSecciones.length})</p>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {cursoSecciones.map(sec => (
                        <div key={sec.id} className="bg-surface-container-lowest rounded-xl p-4 border border-surface-variant/20">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-on-surface">Sección {sec.codigo}</span>
                            <span className="badge-info">{sec.curso_sede?.sede?.nombre?.replace('EDUCA Sede ', '') || 'N/A'}</span>
                          </div>
                          <div className="space-y-1 text-sm text-on-surface-variant">
                            <div className="flex items-center gap-2"><Clock className="w-3 h-3" />{sec.dias?.join(', ')} • {sec.horario_inicio?.slice(0,5)} - {sec.horario_fin?.slice(0,5)}</div>
                            <div className="flex items-center gap-2"><Users className="w-3 h-3" />Cupos: {sec.cupo_disponible}/{sec.cupo_maximo} • Inicio: {sec.fecha_inicio || 'N/A'}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
