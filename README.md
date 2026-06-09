# EducaDash - Panel Administrativo Educativo

EducaDash es un panel administrativo moderno y escalable diseñado para instituciones educativas. Permite gestionar de manera centralizada la información de sedes, cursos, secciones, alumnos, inscripciones y pagos.

## 🚀 Características Principales

- **Dashboard Analítico**: Estadísticas en tiempo real, inscripciones recientes y control de pagos pendientes.
- **Gestión de Sedes**: Administración de las diferentes locaciones de la institución.
- **Catálogo de Cursos y Secciones**:
  - Creación dinámica de cursos.
  - Asignación múltiple de secciones con horarios, días de clase y cupos específicos.
  - Control de capacidad (cupo máximo y cupo disponible).
- **Control de Alumnos**:
  - Registro de estudiantes directamente desde el panel.
  - Sincronización automática de usuarios con el sistema de autenticación seguro de Supabase.
  - Historial de cursos y pagos por alumno.
- **Gestión de Pagos**:
  - Registro manual de pagos y comprobantes.
  - Integración nativa con base de datos para trazabilidad.
- **Inscripciones y Asistencia**:
  - Listado detallado de estudiantes por sección.
  - Control de estatus de inscripción (activa, pendiente, inactiva).

## 🛠️ Tecnologías Utilizadas

- **Frontend**: [React 18](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Estilos**: [TailwindCSS](https://tailwindcss.com/) (con sistema de diseño personalizado moderno y responsivo)
- **Iconografía**: [Lucide React](https://lucide.dev/)
- **Backend/Base de Datos**: [Supabase](https://supabase.com/) (PostgreSQL + Auth + Row Level Security)
- **Enrutamiento**: React Router v6 (Manejo de rutas protegidas)

## 📋 Requisitos Previos

Asegúrate de tener instalado en tu entorno local:
- [Node.js](https://nodejs.org/) (Versión 18 o superior recomendada)
- Una cuenta activa en [Supabase](https://supabase.com/) con el esquema de base de datos configurado.

## ⚙️ Instalación y Configuración

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/Toyoenohio/EducaDash.git
   cd educa-admin
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   Crea un archivo `.env` en la raíz del proyecto basándote en el archivo `.env.example` y agrega tus credenciales de Supabase:
   ```env
   VITE_SUPABASE_URL=tu_url_de_supabase_aqui
   VITE_SUPABASE_ANON_KEY=tu_anon_key_de_supabase_aqui
   VITE_SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_de_supabase_aqui
   ```
   > **Nota importante:** El `SERVICE_ROLE_KEY` es necesario para que el panel administrativo pueda registrar usuarios de autenticación (Alumnos) en segundo plano de manera silenciosa.

4. **Levantar el servidor de desarrollo**
   ```bash
   npm run dev
   ```
   El proyecto estará disponible por defecto en `http://localhost:5173`.

## 📁 Estructura del Proyecto

```
src/
├── components/       # Componentes reusables y de Layout (Navbar, Sidebar, Widgets)
├── contexts/         # Estados globales de React (AuthContext, SedeContext)
├── hooks/            # Custom Hooks para conexión con Supabase (useCursos, usePagos, etc.)
├── lib/              # Configuraciones de terceros (Cliente Supabase, Datos Mock)
├── pages/            # Vistas principales del sistema (Dashboard, Cursos, Pagos, etc.)
├── index.css         # Archivo global de estilos y sistema de tokens CSS (M3)
└── main.jsx          # Punto de entrada de la aplicación
```

## 🤝 Contribución

Este proyecto es privado. Si eres parte del equipo y deseas contribuir, por favor asegúrate de crear una nueva rama a partir de `main` y enviar un Pull Request con tus cambios documentados.
