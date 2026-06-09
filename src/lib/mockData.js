// ─────────────────────────────────────────────────────────────
// Mock data for all EDUCA modules – used during development
// ─────────────────────────────────────────────────────────────

// Generate UUIDs
const uuid = () => crypto.randomUUID()

// Generate fixed UUIDs for consistency
const SEDE_IDS = { barcelona: uuid(), valencia: uuid(), madrid: uuid() }
const CURSO_IDS = {
  matematicas: uuid(),
  ingles: uuid(),
  programacion: uuid(),
  diseno: uuid(),
  marketing: uuid(),
}

// ── Sedes ────────────────────────────────────────────────────
export const mockSedes = [
  {
    id: SEDE_IDS.barcelona,
    nombre: 'EDUCA Sede Barcelona',
    direccion: 'Av. Diagonal 123, Barcelona',
    inicio_courses: '2026-01-15',
    created_at: '2025-06-01',
  },
  {
    id: SEDE_IDS.valencia,
    nombre: 'EDUCA Sede Valencia',
    direccion: 'Calle Colón 45, Valencia',
    inicio_courses: '2026-02-01',
    created_at: '2025-07-15',
  },
  {
    id: SEDE_IDS.madrid,
    nombre: 'EDUCA Sede Madrid',
    direccion: 'Gran Vía 78, Madrid',
    inicio_courses: '2026-03-01',
    created_at: '2025-09-20',
  },
]

// ── Cursos ───────────────────────────────────────────────────
export const mockCursos = [
  {
    id: CURSO_IDS.matematicas,
    nombre: 'Matemáticas Avanzadas',
    descripcion: 'Curso de álgebra y cálculo avanzado',
    activo: true,
    created_at: '2025-06-15',
  },
  {
    id: CURSO_IDS.ingles,
    nombre: 'Inglés B2',
    descripcion: 'Preparación para certificación B2',
    activo: true,
    created_at: '2025-06-20',
  },
  {
    id: CURSO_IDS.programacion,
    nombre: 'Programación Web',
    descripcion: 'HTML, CSS, JavaScript y React',
    activo: true,
    created_at: '2025-07-01',
  },
  {
    id: CURSO_IDS.diseno,
    nombre: 'Diseño Gráfico',
    descripcion: 'Adobe Suite y principios de diseño',
    activo: true,
    created_at: '2025-07-15',
  },
  {
    id: CURSO_IDS.marketing,
    nombre: 'Marketing Digital',
    descripcion: 'SEO, SEM y redes sociales',
    activo: false,
    created_at: '2025-08-01',
  },
]

// ── Alumnos (20 registros realistas) ─────────────────────────
const NOMBRES = [
  'María', 'Carlos', 'Ana', 'José', 'Laura',
  'Pedro', 'Sofía', 'Diego', 'Valentina', 'Miguel',
  'Isabella', 'Andrés', 'Camila', 'Gabriel', 'Daniela',
  'Fernando', 'Lucía', 'Ricardo', 'Elena', 'Alejandro',
]

const APELLIDOS = [
  'González', 'Rodríguez', 'Martínez', 'López', 'García',
  'Hernández', 'Díaz', 'Torres', 'Ramírez', 'Flores',
  'Morales', 'Pérez', 'Sánchez', 'Romero', 'Castro',
  'Vargas', 'Ruiz', 'Mendoza', 'Ortega', 'Silva',
]

export const mockAlumnos = NOMBRES.map((nombre, i) => ({
  id: uuid(),
  cedula: `V-${10000000 + i * 1234567}`,
  nombre,
  apellido: APELLIDOS[i],
  telefono: `04${12 + (i % 4)}-${1000000 + i * 111111}`,
  email: `${nombre.toLowerCase()}.${APELLIDOS[i].toLowerCase()}@gmail.com`,
  direccion: `Calle ${i + 1}, Edificio ${String.fromCharCode(65 + (i % 5))}`,
  fecha_nacimiento: `${1990 + (i % 10)}-${String(1 + (i % 12)).padStart(2, '0')}-${String(1 + (i % 28)).padStart(2, '0')}`,
  created_at: `2025-${String(6 + (i % 6)).padStart(2, '0')}-${String(1 + i).padStart(2, '0')}`,
}))

// ── Curso ↔ Sede relations ──────────────────────────────────
const CURSO_SEDE_IDS = {}
let csIndex = 0

export const mockCursoSede = Object.values(SEDE_IDS).flatMap((sedeId) =>
  Object.values(CURSO_IDS).slice(0, 3).map((cursoId) => {
    const id = uuid()
    CURSO_SEDE_IDS[`cs_${csIndex++}`] = id
    return { id, sede_id: sedeId, curso_id: cursoId }
  })
)

// ── Secciones ────────────────────────────────────────────────
export const mockSecciones = mockCursoSede.flatMap((cs, i) => [
  {
    id: uuid(),
    curso_sede_id: cs.id,
    codigo: 'A',
    tipo: 'presencial',
    dias: ['Lunes', 'Miércoles'],
    horario_inicio: '08:00:00',
    horario_fin: '10:00:00',
    cupo_maximo: 25,
    cupo_disponible: 25 - (i % 10),
    profesor: `Prof. ${APELLIDOS[i % APELLIDOS.length]}`,
    created_at: '2025-08-01',
  },
  {
    id: uuid(),
    curso_sede_id: cs.id,
    codigo: 'B',
    tipo: 'presencial',
    dias: ['Martes', 'Jueves'],
    horario_inicio: '14:00:00',
    horario_fin: '16:00:00',
    cupo_maximo: 20,
    cupo_disponible: 20 - (i % 8),
    profesor: `Prof. ${APELLIDOS[(i + 5) % APELLIDOS.length]}`,
    created_at: '2025-08-01',
  },
])

// ── Inscripciones ────────────────────────────────────────────
export const mockInscripciones = mockAlumnos.slice(0, 15).map((alumno, i) => ({
  id: uuid(),
  alumno_id: alumno.id,
  seccion_id: mockSecciones[i % mockSecciones.length].id,
  monto_inscripcion: 5.0,
  estado: i < 12 ? 'activa' : 'retirada',
  created_at: `2026-0${1 + (i % 5)}-${String(1 + i).padStart(2, '0')}`,
  // Enriched data for display
  alumno,
  seccion: {
    ...mockSecciones[i % mockSecciones.length],
    curso_sede: {
      curso: mockCursos[Math.floor((i % mockSecciones.length) / 2) % mockCursos.length],
      sede: mockSedes[Math.floor((i % mockSecciones.length) / 6) % mockSedes.length],
    },
  },
}))

// ── Pagos ────────────────────────────────────────────────────
const METODOS = ['efectivo', 'transferencia', 'tarjeta', 'zelle']

export const mockPagos = mockInscripciones
  .filter((i) => i.estado === 'activa')
  .flatMap((insc, i) =>
    [1, 2, 3, 4, 5, 6].map((mes) => ({
      id: uuid(),
      inscripcion_id: insc.id,
      mes,
      anio: 2026,
      monto: 12.0,
      concepto: 'cuota_mensual',
      metodo_pago: mes <= 4 ? METODOS[i % METODOS.length] : null,
      pagado: mes <= 4,
      fecha_pago:
        mes <= 4
          ? `2026-${String(mes).padStart(2, '0')}-${String(5 + (i % 15)).padStart(2, '0')}`
          : null,
      fecha_vencimiento: `2026-${String(mes).padStart(2, '0')}-28`,
      referencia:
        mes <= 4
          ? `REF-${2026}${String(mes).padStart(2, '0')}${String(i).padStart(4, '0')}`
          : null,
      // Enriched
      inscripcion: insc,
    }))
  )

// ── Asistencia ───────────────────────────────────────────────
const ESTADOS_ASISTENCIA = ['presente', 'ausente', 'tardanza', 'presente', 'presente', 'presente']

export const mockAsistencia = mockInscripciones
  .filter((i) => i.estado === 'activa')
  .flatMap((insc, i) =>
    Array.from({ length: 10 }, (_, d) => ({
      id: uuid(),
      inscripcion_id: insc.id,
      fecha: `2026-05-${String(1 + d * 2).padStart(2, '0')}`,
      hora_entrada:
        ESTADOS_ASISTENCIA[(i + d) % 6] === 'tardanza' ? '08:15:00' : '08:00:00',
      hora_salida: '12:00:00',
      estado: ESTADOS_ASISTENCIA[(i + d) % 6],
      observaciones:
        ESTADOS_ASISTENCIA[(i + d) % 6] === 'tardanza'
          ? 'Llegó 15 minutos tarde'
          : null,
      inscripcion: insc,
    }))
  )

// ── Dashboard stats ──────────────────────────────────────────
export const mockDashboardStats = {
  totalAlumnos: mockAlumnos.length,
  inscripcionesActivas: mockInscripciones.filter((i) => i.estado === 'activa').length,
  pagosPendientes: mockPagos.filter((p) => !p.pagado).length,
  totalSedes: mockSedes.length,
  ingresosMensuales: mockPagos
    .filter((p) => p.pagado)
    .reduce((sum, p) => sum + p.monto, 0),
  tasaAsistencia: Math.round(
    (mockAsistencia.filter((a) => a.estado === 'presente').length /
      mockAsistencia.length) *
      100
  ),
}

// ── Chart data ───────────────────────────────────────────────
export const mockChartData = {
  inscripcionesPorMes: [
    { mes: 'Ene', cantidad: 8 },
    { mes: 'Feb', cantidad: 12 },
    { mes: 'Mar', cantidad: 15 },
    { mes: 'Abr', cantidad: 10 },
    { mes: 'May', cantidad: 18 },
    { mes: 'Jun', cantidad: 14 },
  ],
  distribucionPorSede: mockSedes.map((sede) => ({
    sede: sede.nombre.replace('EDUCA Sede ', ''),
    alumnos: Math.floor(Math.random() * 20) + 10,
  })),
  ingresosMensuales: [
    { mes: 'Ene', monto: 580 },
    { mes: 'Feb', monto: 720 },
    { mes: 'Mar', monto: 850 },
    { mes: 'Abr', monto: 640 },
    { mes: 'May', monto: 920 },
    { mes: 'Jun', monto: 780 },
  ],
}

// ── Mock user for development ────────────────────────────────
export const mockUser = {
  id: uuid(),
  email: 'admin@educa.com',
  user_metadata: {
    role: 'super_admin',
    nombre: 'Admin Principal',
    sede_id: null,
  },
  role: 'super_admin',
  sede_id: null,
  alumno_id: null,
}
