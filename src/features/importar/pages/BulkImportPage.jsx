import { useState, useRef, useMemo } from 'react'
import { Upload, FileText, Trash2, CheckCircle2, AlertCircle, Loader2, ArrowRight, Users, BookOpen } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useCachedQuery } from '../../../lib/useCachedQuery'

const DEFAULT_PASSWORD = 'Educa2026*'

/**
 * Parser de CSV simple (sin dependencia externa).
 * Soporta campos con comillas y saltos de línea.
 */
function parseCSV(text) {
  const rows = []
  let current = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ }
        else { inQuotes = false }
      } else {
        field += ch
      }
    } else {
      if (ch === '"') { inQuotes = true }
      else if (ch === ',') { current.push(field.trim()); field = '' }
      else if (ch === '\n' || ch === '\r') {
        if (field || current.length) {
          current.push(field.trim())
          if (current.some(f => f !== '')) rows.push(current)
          current = []
          field = ''
        }
        if (ch === '\r' && text[i + 1] === '\n') i++
      } else { field += ch }
    }
  }
  if (field || current.length) {
    current.push(field.trim())
    if (current.some(f => f !== '')) rows.push(current)
  }
  return rows
}

function mapCSVToAlumnos(rows) {
  if (!rows.length) return { headers: [], data: [] }
  const headers = rows[0].map(h => h.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
  const nombreIdx = headers.findIndex(h => h === 'nombre')
  const apellidoIdx = headers.findIndex(h => h === 'apellido')
  const cedulaIdx = headers.findIndex(h => h === 'cedula')
  const telefonoIdx = headers.findIndex(h => ['telefono', 'tlf', 'telf', 'phone'].includes(h))
  const emailIdx = headers.findIndex(h => ['email', 'correo', 'mail'].includes(h))

  if (nombreIdx === -1 || apellidoIdx === -1 || cedulaIdx === -1) {
    return { headers: rows[0], data: [], error: 'Columnas requeridas: nombre, apellido, cedula' }
  }

  const data = rows.slice(1).filter(r => r.some(f => f !== '')).map((row, i) => ({
    _idx: i,
    nombre: row[nombreIdx] || '',
    apellido: row[apellidoIdx] || '',
    cedula: (row[cedulaIdx] || '').replace(/[^VvEe0-9]/g, ''),
    telefono: telefonoIdx >= 0 ? (row[telefonoIdx] || '') : '',
    email: emailIdx >= 0 ? (row[emailIdx] || '') : '',
  })).filter(a => a.nombre && a.cedula)

  return { headers: rows[0], data, error: null }
}

export default function BulkImportPage() {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [seccionId, setSeccionId] = useState('')
  const [status, setStatus] = useState('idle') // idle | processing | done
  const [log, setLog] = useState([])
  const [stats, setStats] = useState({ success: 0, failed: 0 })
  const fileInputRef = useRef(null)

  // Cargar secciones
  const { data: seccionesData, isLoading: loadingSecciones } = useCachedQuery({
    queryKey: ['secciones_para_import'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('secciones')
        .select(`id, codigo, dias, horario_inicio, horario_fin,
          curso_sede:curso_sede_id(
            curso:cursos(id, nombre),
            sede:sedes(nombre)
          )
        `)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    }
  })

  const secciones = seccionesData || []

  const selectedSeccion = useMemo(() => {
    return secciones.find(s => s.id === seccionId)
  }, [secciones, seccionId])

  function handleFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target.result
      const rows = parseCSV(text)
      const result = mapCSVToAlumnos(rows)
      setPreview(result)
    }
    reader.readAsText(f)
  }

  function formatSeccion(s) {
    const curso = s?.curso_sede?.curso?.nombre || '?'
    const sede = s?.curso_sede?.sede?.nombre || '?'
    const codigo = s?.codigo || '?'
    return `${curso} — ${sede} — Sección ${codigo}`
  }

  async function handleImport() {
    if (!preview?.data?.length || !seccionId) return
    setStatus('processing')
    setLog([])
    let success = 0
    let failed = 0
    const entries = []

    for (const alumno of preview.data) {
      const email = alumno.email || `${alumno.cedula}@educadash.local`
      const label = `${alumno.nombre} ${alumno.apellido}`

      try {
        // Paso 1: Crear auth user via Edge Function
        const { data: authResult, error: authError } = await supabase.functions.invoke('create-student', {
          body: { email, password: DEFAULT_PASSWORD, metadata: { nombre: alumno.nombre, apellido: alumno.apellido, cedula: alumno.cedula } }
        })

        if (authError || !authResult?.user) {
          const msg = authError?.message || authResult?.error || 'Error al crear usuario'
          entries.push({ label, ok: false, msg })
          failed++
          setLog(prev => [...prev, { label, ok: false, msg }])
          continue
        }

        const alumnoId = authResult.user.id

        // Paso 2: Insertar registro en tabla alumnos (el Edge solo crea auth user)
        const { error: alumnoError } = await supabase.from('alumnos').insert([{
          id: alumnoId,
          nombre: alumno.nombre,
          apellido: alumno.apellido,
          cedula: alumno.cedula,
          telefono: alumno.telefono || null,
          email: email
        }])

        if (alumnoError) {
          const msg = `Auth creado pero falló registro en alumnos: ${alumnoError.message}`
          entries.push({ label, ok: false, msg })
          failed++
          setLog(prev => [...prev, { label, ok: false, msg }])
          continue
        }

        // Paso 3: Inscribir en sección
        const { error: inscError } = await supabase.from('inscripciones').insert([{
          alumno_id: alumnoId,
          seccion_id: seccionId,
          estado: 'pendiente'
        }])

        if (inscError) {
          entries.push({ label, ok: false, msg: `Creado pero error al inscribir: ${inscError.message}` })
          failed++
          setLog(prev => [...prev, { label, ok: false, msg: `Creado pero error al inscribir: ${inscError.message}` }])
          continue
        }

        // Paso 4: Generar obligaciones
        await supabase.functions.invoke('generar-obligaciones', {
          body: { inscripcion_id: alumnoId }
        }).catch(() => {})

        entries.push({ label, ok: true, msg: 'OK' })
        success++
        setLog(prev => [...prev, { label, ok: true, msg: 'Inscrito ✓' }])

      } catch (err) {
        entries.push({ label, ok: false, msg: err.message })
        failed++
        setLog(prev => [...prev, { label, ok: false, msg: err.message }])
      }

      // Pequeña pausa entre alumnos
      await new Promise(r => setTimeout(r, 600))
    }

    setStats({ success, failed })
    setStatus('done')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-on-surface">Importar Alumnos</h1>
        <p className="text-on-surface-variant mt-1">Carga un archivo CSV y asigna todos los alumnos a una misma sección.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Columna izquierda: Upload */}
        <div className="space-y-5">
          {/* 1. Seleccionar sección */}
          <div className="bg-surface-container-lowest rounded-2xl p-5 border border-surface-variant/30">
            <h3 className="font-semibold text-on-surface flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-primary" />
              Curso y sección destino
            </h3>
            {loadingSecciones ? (
              <p className="text-sm text-on-surface-variant">Cargando secciones...</p>
            ) : (
              <select
                value={seccionId}
                onChange={e => setSeccionId(e.target.value)}
                className="w-full bg-surface-container px-4 py-2.5 rounded-xl border border-surface-variant/30 text-on-surface text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              >
                <option value="">-- Seleccionar sección --</option>
                {secciones.map(s => (
                  <option key={s.id} value={s.id}>{formatSeccion(s)}</option>
                ))}
              </select>
            )}
          </div>

          {/* 2. Subir CSV */}
          <div className="bg-surface-container-lowest rounded-2xl p-5 border border-surface-variant/30">
            <h3 className="font-semibold text-on-surface flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-primary" />
              Archivo CSV
            </h3>

            <div
              onClick={() => fileInputRef.current?.click()}
              className={`
                border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
                ${file
                  ? 'border-primary/40 bg-primary-fixed/20'
                  : 'border-surface-variant/40 hover:border-primary/30 hover:bg-surface-container'
                }
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFile}
                className="hidden"
              />
              {file ? (
                <div className="space-y-1">
                  <Upload className="mx-auto w-6 h-6 text-primary" />
                  <p className="text-sm font-medium text-on-surface">{file.name}</p>
                  <p className="text-xs text-on-surface-variant">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="mx-auto w-6 h-6 text-on-surface-variant" />
                  <p className="text-sm text-on-surface-variant">Click para seleccionar CSV</p>
                  <p className="text-xs text-on-surface-variant/70">Columnas: nombre, apellido, cedula, telefono, email</p>
                </div>
              )}
            </div>
          </div>

          {/* Vista previa */}
          {preview && (
            <div className="bg-surface-container-lowest rounded-2xl p-5 border border-surface-variant/30">
              <h3 className="font-semibold text-on-surface flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-primary" />
                {preview.error ? 'Error en CSV' : `Vista previa (${preview.data.length} alumnos)`}
              </h3>

              {preview.error ? (
                <div className="flex items-center gap-2 p-3 bg-error/10 rounded-xl text-error text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {preview.error}
                </div>
              ) : (
                <div className="overflow-x-auto max-h-60 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-surface-variant/30">
                        <th className="text-left py-2 px-1 text-on-surface-variant font-medium">Nombre</th>
                        <th className="text-left py-2 px-1 text-on-surface-variant font-medium">Apellido</th>
                        <th className="text-left py-2 px-1 text-on-surface-variant font-medium">Cédula</th>
                        <th className="text-left py-2 px-1 text-on-surface-variant font-medium">Teléfono</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.data.slice(0, 10).map(a => (
                        <tr key={a._idx} className="border-b border-surface-variant/10 text-on-surface">
                          <td className="py-1.5 px-1">{a.nombre}</td>
                          <td className="py-1.5 px-1">{a.apellido}</td>
                          <td className="py-1.5 px-1 font-mono text-xs">{a.cedula}</td>
                          <td className="py-1.5 px-1 text-xs">{a.telefono || '—'}</td>
                        </tr>
                      ))}
                      {preview.data.length > 10 && (
                        <tr><td colSpan={4} className="py-2 text-center text-on-surface-variant text-xs">... y {preview.data.length - 10} más</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Botón importar */}
          <button
            onClick={handleImport}
            disabled={!preview?.data?.length || !seccionId || status === 'processing'}
            className={`
              w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold text-sm transition-all
              ${(!preview?.data?.length || !seccionId || status === 'processing')
                ? 'bg-surface-container text-on-surface-variant cursor-not-allowed'
                : 'bg-primary text-on-primary hover:bg-primary/90 shadow-md hover:shadow-lg active:scale-[0.98]'
              }
            `}
          >
            {status === 'processing' ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Importando...</>
            ) : status === 'done' ? (
              <><CheckCircle2 className="w-4 h-4" /> Completado — {stats.success}/{preview?.data?.length || 0}</>
            ) : (
              <><ArrowRight className="w-4 h-4" /> Importar {preview?.data?.length || 0} alumnos</>
            )}
          </button>
        </div>

        {/* Columna derecha: Log */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 border border-surface-variant/30">
          <h3 className="font-semibold text-on-surface flex items-center gap-2 mb-3">
            {status === 'done' && stats.failed > 0
              ? <AlertCircle className="w-4 h-4 text-amber-400" />
              : status === 'done'
                ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                : <FileText className="w-4 h-4 text-primary" />
            }
            Registro de importación
          </h3>

          {log.length === 0 && status === 'idle' && (
            <p className="text-sm text-on-surface-variant text-center py-8">
              Seleccioná un CSV y una sección, luego hacé click en Importar.
            </p>
          )}

          {log.length === 0 && status === 'processing' && (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-on-surface-variant">
              <Loader2 className="w-4 h-4 animate-spin" />
              Preparando...
            </div>
          )}

          <div className="space-y-1 max-h-[500px] overflow-y-auto">
            {log.map((entry, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm animate-fade-in ${
                  entry.ok ? 'bg-emerald-500/5 text-emerald-400' : 'bg-error/5 text-error'
                }`}
              >
                {entry.ok ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />}
                <span className="font-medium flex-shrink-0">{entry.label}</span>
                <span className="text-on-surface-variant truncate">— {entry.msg}</span>
              </div>
            ))}
          </div>

          {status === 'done' && (
            <div className="mt-4 p-3 bg-surface-container rounded-xl">
              <div className="flex justify-between text-sm">
                <span className="text-emerald-400">✅ {stats.success} importados</span>
                {stats.failed > 0 && <span className="text-error">❌ {stats.failed} fallos</span>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
