import { useState } from 'react'
import toast from 'react-hot-toast'
import { useAlumnos } from '../hooks/useAlumnos'
import { Plus, Pencil, Trash2, X, Search, Users, ChevronLeft, ChevronRight } from 'lucide-react'

export default function AlumnosPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const perPage = 10
  
  const { alumnos, total, loading, createAlumno, updateAlumno, deleteAlumno } = useAlumnos(page, perPage, searchTerm)
  
  const [form, setForm] = useState({ cedula: '', nombre: '', apellido: '', telefono: '', email: '', direccion: '', fecha_nacimiento: '' })

  const openCreate = () => { setEditing(null); setForm({ cedula: '', nombre: '', apellido: '', telefono: '', email: '', direccion: '', fecha_nacimiento: '' }); setModalOpen(true) }
  const openEdit = (a) => { setEditing(a); setForm({ cedula: a.cedula, nombre: a.nombre, apellido: a.apellido, telefono: a.telefono || '', email: a.email || '', direccion: a.direccion || '', fecha_nacimiento: a.fecha_nacimiento || '' }); setModalOpen(true) }
  
  const handleSubmit = async (e) => { 
    e.preventDefault(); 
    try {
      if (editing) { 
        await updateAlumno({ id: editing.id, updates: form }) 
        toast.success('Alumno actualizado exitosamente')
      } else { 
        await createAlumno(form) 
        toast.success('Alumno creado exitosamente')
      }
      setModalOpen(false) 
    } catch (error) {
      toast.error('Ocurrió un error al guardar el alumno')
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este alumno?')) {
      try {
        await deleteAlumno(id)
        toast.success('Alumno eliminado')
      } catch (error) {
        toast.error('Error al eliminar el alumno')
      }
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / perPage))

  if (loading && alumnos.length === 0) return (<div className="space-y-4">{Array.from({length: 5}, (_,i) => <div key={i} className="skeleton h-16 w-full" />)}</div>)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div><h1 className="text-2xl font-bold text-on-surface">Gestión de Alumnos</h1><p className="text-on-surface-variant text-sm mt-1">{total} alumnos encontrados</p></div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" />Nuevo Alumno</button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-outline" />
        <input 
          className="input-field pl-10" 
          placeholder="Buscar por nombre, cédula o email..." 
          value={searchTerm}
          onChange={e => { setSearchTerm(e.target.value); setPage(1) }} 
        />
      </div>

      {alumnos.length === 0 ? (
        <div className="card p-12 text-center"><Users className="w-12 h-12 mx-auto text-outline mb-4" /><p className="text-on-surface-variant">No se encontraron alumnos</p></div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block card overflow-hidden">
            <table className="w-full">
              <thead><tr className="bg-surface-container-low"><th className="table-header">Cédula</th><th className="table-header">Nombre</th><th className="table-header">Teléfono</th><th className="table-header">Email</th><th className="table-header text-right">Acciones</th></tr></thead>
              <tbody>
                {alumnos.map((a, i) => (
                  <tr key={a.id} className="table-row opacity-0 animate-fade-in" style={{ animationDelay: `${i * 0.03}s`, animationFillMode: 'forwards' }}>
                    <td className="table-cell font-mono text-sm">{a.cedula}</td>
                    <td className="table-cell"><span className="font-semibold">{a.nombre} {a.apellido}</span></td>
                    <td className="table-cell">{a.telefono}</td>
                    <td className="table-cell text-on-surface-variant">{a.email}</td>
                    <td className="table-cell text-right"><div className="flex justify-end gap-1"><button onClick={() => openEdit(a)} className="p-2 rounded-lg hover:bg-surface-container-high"><Pencil className="w-4 h-4 text-on-surface-variant" /></button><button onClick={() => handleDelete(a.id)} className="p-2 rounded-lg hover:bg-error-container"><Trash2 className="w-4 h-4 text-error" /></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {alumnos.map(a => (
              <div key={a.id} className="card p-4">
                <div className="flex justify-between items-start"><div><p className="font-bold text-on-surface">{a.nombre} {a.apellido}</p><p className="text-sm text-on-surface-variant">{a.cedula}</p></div><div className="flex gap-1"><button onClick={() => openEdit(a)} className="p-2 rounded-lg hover:bg-surface-container-high"><Pencil className="w-4 h-4" /></button><button onClick={() => handleDelete(a.id)} className="p-2 rounded-lg hover:bg-error-container"><Trash2 className="w-4 h-4 text-error" /></button></div></div>
                <div className="mt-2 text-sm text-on-surface-variant space-y-1"><p>{a.telefono}</p><p>{a.email}</p></div>
              </div>
            ))}
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1} className="btn-ghost flex items-center gap-1 disabled:opacity-40"><ChevronLeft className="w-4 h-4" />Anterior</button>
              <span className="text-sm text-on-surface-variant">Página {page} de {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages} className="btn-ghost flex items-center gap-1 disabled:opacity-40">Siguiente<ChevronRight className="w-4 h-4" /></button>
            </div>
          )}
        </>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="relative bg-surface-container-lowest rounded-2xl shadow-modal w-full max-w-lg animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-surface-variant/20 sticky top-0 bg-surface-container-lowest z-10"><h2 className="text-xl font-bold">{editing ? 'Editar Alumno' : 'Nuevo Alumno'}</h2><button onClick={() => setModalOpen(false)} className="p-2 rounded-lg hover:bg-surface-container-high"><X className="w-5 h-5" /></button></div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="block text-sm font-label font-bold text-on-surface-variant mb-1">Cédula</label><input className="input-field" value={form.cedula} onChange={e => setForm({...form, cedula: e.target.value})} placeholder="V-12345678" required /></div>
                <div><label className="block text-sm font-label font-bold text-on-surface-variant mb-1">Nombre</label><input className="input-field" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} required /></div>
                <div><label className="block text-sm font-label font-bold text-on-surface-variant mb-1">Apellido</label><input className="input-field" value={form.apellido} onChange={e => setForm({...form, apellido: e.target.value})} required /></div>
                <div><label className="block text-sm font-label font-bold text-on-surface-variant mb-1">Teléfono</label><input className="input-field" value={form.telefono} onChange={e => setForm({...form, telefono: e.target.value})} /></div>
                <div><label className="block text-sm font-label font-bold text-on-surface-variant mb-1">Email</label><input type="email" className="input-field" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
                <div><label className="block text-sm font-label font-bold text-on-surface-variant mb-1">Fecha de Nacimiento</label><input type="date" className="input-field" value={form.fecha_nacimiento} onChange={e => setForm({...form, fecha_nacimiento: e.target.value})} /></div>
              </div>
              <div><label className="block text-sm font-label font-bold text-on-surface-variant mb-1">Dirección</label><input className="input-field" value={form.direccion} onChange={e => setForm({...form, direccion: e.target.value})} /></div>
              <div className="flex gap-3 pt-4"><button type="button" onClick={() => setModalOpen(false)} className="btn-ghost flex-1">Cancelar</button><button type="submit" className="btn-primary flex-1">{editing ? 'Guardar' : 'Crear'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
