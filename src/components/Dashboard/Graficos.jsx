import { Bar, Doughnut, Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend, ArcElement,
  PointElement, LineElement, Filler
} from 'chart.js'
import { useSede } from '../../contexts/SedeContext'
import { useDashboard } from '../../hooks/useDashboard'
import { useMemo } from 'react'

import PagosPendientesBox from './PagosPendientesBox'

ChartJS.register(
  CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend, ArcElement,
  PointElement, LineElement, Filler
)

const chartFont = { family: 'Montserrat, sans-serif' }
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun']

export default function Graficos() {
  const { selectedSede } = useSede()
  const { inscripciones, pagos, sedes, loading } = useDashboard()

  const data = useMemo(() => {
    const filteredInsc = inscripciones.filter(i => 
      selectedSede === 'todas' || i.seccion?.curso_sede?.sede?.id === selectedSede
    )
    const filteredPagos = pagos.filter(p => 
      selectedSede === 'todas' || p.inscripcion?.seccion?.curso_sede?.sede?.id === selectedSede
    )

    // Aggregate by month
    const inscripcionesPorMes = MESES.map((mes, idx) => {
      // Validar created_at existe
      const count = filteredInsc.filter(i => {
        if (!i.created_at) return false;
        return new Date(i.created_at).getMonth() === idx;
      }).length;
      return { mes, cantidad: count }
    })

    const ingresosMensuales = MESES.map((mes, idx) => {
      const sum = filteredPagos.filter(p => p.pagado && p.mes === idx + 1).reduce((s, p) => s + p.monto, 0);
      return { mes, monto: sum }
    })

    const distribucionPorSede = sedes.filter(s => selectedSede === 'todas' || s.id === selectedSede).map(sede => {
      const count = filteredInsc.filter(i => i.seccion?.curso_sede?.sede?.id === sede.id).length;
      return { sede: sede.nombre.replace('EDUCA Sede ', ''), alumnos: count }
    })

    return { inscripcionesPorMes, ingresosMensuales, distribucionPorSede }
  }, [inscripciones, pagos, sedes, selectedSede])

  const barData = {
    labels: data.inscripcionesPorMes.map(d => d.mes),
    datasets: [{
      label: 'Inscripciones',
      data: data.inscripcionesPorMes.map(d => d.cantidad),
      backgroundColor: '#00008b',
      borderRadius: 8,
      borderSkipped: false,
    }],
  }

  const doughnutData = {
    labels: data.distribucionPorSede.map(d => d.sede),
    datasets: [{
      data: data.distribucionPorSede.map(d => d.alumnos),
      backgroundColor: ['#00008b', '#006e03', '#705d00'],
      borderWidth: 0,
      hoverOffset: 8,
    }],
  }

  const lineData = {
    labels: data.ingresosMensuales.map(d => d.mes),
    datasets: [{
      label: 'Ingresos ($)',
      data: data.ingresosMensuales.map(d => d.monto),
      borderColor: '#3c45ec',
      backgroundColor: 'rgba(60, 69, 236, 0.1)',
      fill: true,
      tension: 0.4,
      pointBackgroundColor: '#3c45ec',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 5,
      pointHoverRadius: 7,
    }],
  }

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#313030',
        titleFont: chartFont,
        bodyFont: chartFont,
        padding: 12,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { ...chartFont, size: 12 }, color: '#767587' },
      },
      y: {
        grid: { color: 'rgba(0,0,0,0.05)' },
        ticks: { font: { ...chartFont, size: 12 }, color: '#767587' },
      },
    },
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="skeleton h-[350px] w-full" />
        <div className="skeleton h-[350px] w-full" />
        <div className="skeleton h-[350px] w-full lg:col-span-2" />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Bar Chart */}
      <div className="card p-6 opacity-0 animate-fade-in" style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}>
        <h3 className="text-lg font-bold text-on-surface mb-4">Inscripciones por Mes</h3>
        <div className="h-64">
          <Bar data={barData} options={commonOptions} />
        </div>
      </div>

      <PagosPendientesBox />
      
      {/* Line Chart - Full Width */}
      <div className="card p-6 lg:col-span-2 opacity-0 animate-fade-in" style={{ animationDelay: '0.5s', animationFillMode: 'forwards' }}>
        <h3 className="text-lg font-bold text-on-surface mb-4">Ingresos Mensuales</h3>
        <div className="h-64">
          <Line data={lineData} options={commonOptions} />
        </div>
      </div>
    </div>
  )
}
