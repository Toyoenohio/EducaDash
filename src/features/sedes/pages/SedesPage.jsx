import { useState } from 'react'
import toast from 'react-hot-toast'
import { useSedes } from '../hooks/useSedes'
import { Plus, Pencil, Trash2, X, Building2, MapPin, Calendar } from 'lucide-react'

export default function SedesPage() {
  const { sedes, loading, createSede, updateSede, deleteSede } = useSedes()
  const [view, setView] = useState('list')
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ nombre: '', direccion: '', inicio_cursos: '', costo_inscripcion: '', costo_semanal: '', duracion_semanas: '' })

  const openCreate = () => { setEditing(null); setForm({ nombre: '', direccion: '', inicio_cursos: '', costo_inscripcion: '', costo_semanal: '', duracion_semanas: '' }); setView('form') }
  
  const openEdit = (sede) => { 
    setEditing(sede); 
    const costos = sede.sede_costos || []
    const cInsc = costos.find(c => c.concepto === 'inscripcion')
    const cSem = costos.find(c => c.concepto === 'clase_semanal' || c.concepto === 'cuota_semanal')
    
    setForm({ 
      nombre: sede.nombre, 
      direccion: sede.direccion, 
      inicio_cursos: sede.inicio_cursos || '',
      costo_inscripcion: cInsc ? cInsc.monto : '',
      costo_semanal: cSem ? cSem.monto : '',
      duracion_semanas: cSem ? cSem.duracion_semanas : ''
    }); 
    setView('form') 
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (form.costo_semanal && !form.duracion_semanas) {
      return toast.error('Si estableces un costo semanal, debes especificar la duración en semanas.')
    }
    
    const costosToSave = []
    if (form.costo_inscripcion) costosToSave.push({ concepto: 'inscripcion', monto: form.costo_inscripcion })
    if (form.costo_semanal) costosToSave.push({ concepto: 'clase_semanal', monto: form.costo_semanal, duracion_semanas: form.duracion_semanas })

    const updates = { nombre: form.nombre, direccion: form.direccion, inicio_cursos: form.inicio_cursos }

    try {
      if (editing) { 
        await updateSede({ id: editing.id, updates, costos: costosToSave }) 
        toast.success('Sede y costos actualizados')
      } else { 
        const newSede = await createSede(updates) 
        if (costosToSave.length > 0) {
          await updateSede({ id: newSede.id, updates: {}, costos: costosToSave })
        }
        toast.success('Sede creada exitosamente')
      }
      setView('list')
    } catch (error) {
      console.error(error)
      toast.error('Error al guardar sede')
    }
  }

  const handleDelete = async (sede) => {
    if (window.confirm(`¿Eliminar la sede ${sede.nombre}? Esta acción no se puede deshacer.`)) {
      try {
        await deleteSede(sede.id)
        toast.success('Sede eliminada')
      } catch (error) {
        toast.error('Error al eliminar sede')
      }
    }
  }

  if (loading && sedes.length === 0) return (
    <div className="space-y-6">
      <div className="flex justify-between items-center"><div className="skeleton h-8 w-48" /><div className="skeleton h-10 w-32" /></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{[1,2,3].map(i => <div key={i} className="skeleton h-48 w-full" />)}</div>
    </div>
  )

  if (view === 'form') {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <button onClick={() => setView('list')} className="p-2 rounded-lg hover:bg-surface-container-high text-on-surface-variant"><X className="w-5 h-5" /></button>
          <h1 className="text-2xl font-bold text-on-surface">{editing ? 'Editar Sede y Costos' : 'Nueva Sede'}</h1>
        </div>
        <div className="card p-6 max-w-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-on-surface border-b border-surface-variant/20 pb-2">Datos Principales</h2>
              <div><label className="block text-sm font-label font-bold text-on-surface-variant mb-1">Nombre</label><input className="input-field" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} required /></div>
              <div><label className="block text-sm font-label font-bold text-on-surface-variant mb-1">Dirección</label><input className="input-field" value={form.direccion} onChange={e => setForm({...form, direccion: e.target.value})} required /></div>
              <div><label className="block text-sm font-label font-bold text-on-surface-variant mb-1">Fecha de Inicio de Cursos</label><input type="date" className="input-field" value={form.inicio_cursos} onChange={e => setForm({...form, inicio_cursos: e.target.value})} /></div>
            </div>

            <div className="space-y-4">
              <h2 className="text-lg font-bold text-on-surface border-b border-surface-variant/20 pb-2">Costos Globales de la Sede</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-label font-bold text-on-surface-variant mb-1">Costo Inscripción ($)</label>
                  <input type="number" step="0.01" className="input-field" placeholder="Ej: 5.00" value={form.costo_inscripcion} onChange={e => setForm({...form, costo_inscripcion: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-label font-bold text-on-surface-variant mb-1">Costo Semanal ($)</label>
                  <input type="number" step="0.01" className="input-field" placeholder="Ej: 10.00" value={form.costo_semanal} onChange={e => setForm({...form, costo_semanal: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-label font-bold text-on-surface-variant mb-1">Duración (Semanas)</label>
                  <input type="number" className="input-field" placeholder="Ej: 15" value={form.duracion_semanas} onChange={e => setForm({...form, duracion_semanas: e.target.value})} />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-surface-variant/20">
              <button type="button" onClick={() => setView('list')} className="btn-ghost flex-1">Cancelar</button>
              <button type="submit" className="btn-primary flex-1">Guardar Sede</button>
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
          <h1 className="text-2xl font-bold text-on-surface">Gestión de Sedes</h1>
          <p className="text-on-surface-variant text-sm mt-1">{sedes.length} sedes registradas</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" />Nueva Sede</button>
      </div>

      {sedes.length === 0 ? (
        <div className="card p-12 text-center"><Building2 className="w-12 h-12 mx-auto text-outline mb-4" /><p className="text-on-surface-variant">No hay sedes registradas</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sedes.map((sede, i) => (
            <div key={sede.id} className="card p-6 opacity-0 animate-fade-in" style={{ animationDelay: `${i * 0.05}s`, animationFillMode: 'forwards' }}>
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-xl bg-primary-fixed"><Building2 className="w-5 h-5 text-primary" /></div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(sede)} className="p-2 rounded-lg hover:bg-surface-container-high transition-colors"><Pencil className="w-4 h-4 text-on-surface-variant" /></button>
                  <button onClick={() => handleDelete(sede)} className="p-2 rounded-lg hover:bg-error-container transition-colors"><Trash2 className="w-4 h-4 text-error" /></button>
                </div>
              </div>
              <h3 className="font-bold text-on-surface text-lg mb-2">{sede.nombre}</h3>
              <div className="flex items-center gap-2 text-sm text-on-surface-variant mb-1"><MapPin className="w-4 h-4" />{sede.direccion}</div>
              {sede.inicio_courses && <div className="flex items-center gap-2 text-sm text-on-surface-variant"><Calendar className="w-4 h-4" />Inicio: {sede.inicio_courses}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
