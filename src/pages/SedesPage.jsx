import { useState } from 'react'
import { useSedes } from '../hooks/useSedes'
import { Plus, Pencil, Trash2, X, Building2, MapPin, Calendar } from 'lucide-react'

export default function SedesPage() {
  const { sedes, loading, createSede, updateSede, deleteSede } = useSedes()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [form, setForm] = useState({ nombre: '', direccion: '', inicio_courses: '' })

  const openCreate = () => { setEditing(null); setForm({ nombre: '', direccion: '', inicio_courses: '' }); setModalOpen(true) }
  const openEdit = (sede) => { setEditing(sede); setForm({ nombre: sede.nombre, direccion: sede.direccion, inicio_courses: sede.inicio_courses || '' }); setModalOpen(true) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (editing) { await updateSede(editing.id, form) } else { await createSede(form) }
    setModalOpen(false)
  }

  const handleDelete = async () => {
    if (deleteConfirm) { await deleteSede(deleteConfirm.id); setDeleteConfirm(null) }
  }

  if (loading) return (
    <div className="space-y-6">
      <div className="flex justify-between items-center"><div className="skeleton h-8 w-48" /><div className="skeleton h-10 w-32" /></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{[1,2,3].map(i => <div key={i} className="skeleton h-48 w-full" />)}</div>
    </div>
  )

  return (
    <div className="space-y-6">
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
                  <button onClick={() => setDeleteConfirm(sede)} className="p-2 rounded-lg hover:bg-error-container transition-colors"><Trash2 className="w-4 h-4 text-error" /></button>
                </div>
              </div>
              <h3 className="font-bold text-on-surface text-lg mb-2">{sede.nombre}</h3>
              <div className="flex items-center gap-2 text-sm text-on-surface-variant mb-1"><MapPin className="w-4 h-4" />{sede.direccion}</div>
              {sede.inicio_courses && <div className="flex items-center gap-2 text-sm text-on-surface-variant"><Calendar className="w-4 h-4" />Inicio: {sede.inicio_courses}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="relative bg-surface-container-lowest rounded-2xl shadow-modal w-full max-w-md animate-scale-in">
            <div className="flex items-center justify-between p-6 border-b border-surface-variant/20">
              <h2 className="text-xl font-bold text-on-surface">{editing ? 'Editar Sede' : 'Nueva Sede'}</h2>
              <button onClick={() => setModalOpen(false)} className="p-2 rounded-lg hover:bg-surface-container-high"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div><label className="block text-sm font-label font-bold text-on-surface-variant mb-1">Nombre</label><input className="input-field" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} required /></div>
              <div><label className="block text-sm font-label font-bold text-on-surface-variant mb-1">Dirección</label><input className="input-field" value={form.direccion} onChange={e => setForm({...form, direccion: e.target.value})} required /></div>
              <div><label className="block text-sm font-label font-bold text-on-surface-variant mb-1">Inicio de cursos</label><input type="date" className="input-field" value={form.inicio_courses} onChange={e => setForm({...form, inicio_courses: e.target.value})} /></div>
              <div className="flex gap-3 pt-4"><button type="button" onClick={() => setModalOpen(false)} className="btn-ghost flex-1">Cancelar</button><button type="submit" className="btn-primary flex-1">{editing ? 'Guardar' : 'Crear'}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-surface-container-lowest rounded-2xl shadow-modal w-full max-w-sm animate-scale-in p-6">
            <h2 className="text-lg font-bold text-on-surface mb-2">¿Eliminar sede?</h2>
            <p className="text-on-surface-variant text-sm mb-6">Se eliminará <strong>{deleteConfirm.nombre}</strong> y todos sus datos asociados. Esta acción no se puede deshacer.</p>
            <div className="flex gap-3"><button onClick={() => setDeleteConfirm(null)} className="btn-ghost flex-1">Cancelar</button><button onClick={handleDelete} className="btn-danger flex-1">Eliminar</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
