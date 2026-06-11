import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { SedeProvider } from './contexts/SedeContext'
import Layout from './components/Layout/Layout'
import ProtectedRoute from './components/Layout/ProtectedRoute'

const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./features/dashboard/pages/Dashboard'))
const SedesPage = lazy(() => import('./features/sedes/pages/SedesPage'))
const CursosPage = lazy(() => import('./features/cursos/pages/CursosPage'))
const AlumnosPage = lazy(() => import('./features/alumnos/pages/AlumnosPage'))
const InscripcionesPage = lazy(() => import('./features/inscripciones/pages/InscripcionesPage'))
const PagosPage = lazy(() => import('./features/pagos/pages/PagosPage'))
const AsistenciaPage = lazy(() => import('./features/cursos/pages/AsistenciaPage'))

function App() {
  return (
    <AuthProvider>
      <SedeProvider>
        <BrowserRouter>
          <Suspense fallback={<div className="h-screen w-full flex items-center justify-center text-primary font-bold">Cargando aplicación...</div>}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={
                <ProtectedRoute allowedRoles={['super_admin', 'admin_sede']}>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route index element={<Dashboard />} />
                <Route path="sedes" element={
                  <ProtectedRoute allowedRoles={['super_admin']}>
                    <SedesPage />
                  </ProtectedRoute>
                } />
                <Route path="cursos" element={<CursosPage />} />
                <Route path="alumnos" element={<AlumnosPage />} />
                <Route path="inscripciones" element={<InscripcionesPage />} />
                <Route path="pagos" element={<PagosPage />} />
                <Route path="asistencia" element={<AsistenciaPage />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </SedeProvider>
    </AuthProvider>
  )
}

export default App
