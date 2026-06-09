import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { SedeProvider } from './contexts/SedeContext'
import Layout from './components/Layout/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import SedesPage from './pages/SedesPage'
import CursosPage from './pages/CursosPage'
import AlumnosPage from './pages/AlumnosPage'
import InscripcionesPage from './pages/InscripcionesPage'
import PagosPage from './pages/PagosPage'
import AsistenciaPage from './pages/AsistenciaPage'
import ProtectedRoute from './components/Layout/ProtectedRoute'

function App() {
  return (
    <AuthProvider>
      <SedeProvider>
        <BrowserRouter>
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
        </BrowserRouter>
      </SedeProvider>
    </AuthProvider>
  )
}

export default App
