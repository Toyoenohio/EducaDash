-- ============================================================
-- MIGRACIÓN: Sistema de Obligaciones Financieras
-- Ejecutar en Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Tabla obligaciones (cuentas por cobrar)
CREATE TABLE IF NOT EXISTS obligaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inscripcion_id uuid NOT NULL REFERENCES inscripciones(id) ON DELETE CASCADE,
  concepto varchar(100) NOT NULL CHECK (concepto IN ('inscripcion', 'cuota_semanal', 'certificado_carnet')),
  numero_semana int4,
  monto numeric(10,2) NOT NULL CHECK (monto > 0),
  fecha_vencimiento date NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_obligaciones_inscripcion ON obligaciones(inscripcion_id);
CREATE INDEX IF NOT EXISTS idx_obligaciones_vencimiento ON obligaciones(fecha_vencimiento);

-- 2. Tabla pago_obligaciones (distribución de pagos)
CREATE TABLE IF NOT EXISTS pago_obligaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pago_id uuid NOT NULL REFERENCES pagos(id) ON DELETE CASCADE,
  obligacion_id uuid NOT NULL REFERENCES obligaciones(id) ON DELETE CASCADE,
  monto_abonado numeric(10,2) NOT NULL CHECK (monto_abonado > 0),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_po_pago ON pago_obligaciones(pago_id);
CREATE INDEX IF NOT EXISTS idx_po_obligacion ON pago_obligaciones(obligacion_id);

-- 3. Vista con estado calculado dinámicamente
CREATE OR REPLACE VIEW obligaciones_con_estado AS
SELECT 
  o.*,
  COALESCE(SUM(po.monto_abonado), 0) AS total_abonado,
  o.monto - COALESCE(SUM(po.monto_abonado), 0) AS saldo_pendiente,
  CASE
    WHEN COALESCE(SUM(po.monto_abonado), 0) >= o.monto THEN 'pagado'
    WHEN o.fecha_vencimiento < CURRENT_DATE THEN 'vencido'
    ELSE 'pendiente'
  END AS estado
FROM obligaciones o
LEFT JOIN pago_obligaciones po ON po.obligacion_id = o.id
GROUP BY o.id;

-- 4. RLS Policies
ALTER TABLE obligaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE pago_obligaciones ENABLE ROW LEVEL SECURITY;

-- Policy: admins can do everything on obligaciones
CREATE POLICY "admin_all_obligaciones" ON obligaciones
  FOR ALL USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('super_admin', 'admin_sede')
  );

-- Policy: admins can do everything on pago_obligaciones
CREATE POLICY "admin_all_pago_obligaciones" ON pago_obligaciones
  FOR ALL USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('super_admin', 'admin_sede')
  );

-- 5. Poblar sede_costos para la sede existente (Barcelona)
INSERT INTO sede_costos (sede_id, concepto, monto, moneda, duracion_semanas) VALUES
('22d7eaed-d604-42c3-a8b6-c519c0efa07a', 'inscripcion',         5.00,  '$', NULL),
('22d7eaed-d604-42c3-a8b6-c519c0efa07a', 'cuota_semanal',      12.00,  '$', 15),
('22d7eaed-d604-42c3-a8b6-c519c0efa07a', 'certificado_carnet', 15.00,  '$', NULL);
