-- Añadir columna fecha_inicio a la tabla secciones
ALTER TABLE public.secciones
ADD COLUMN IF NOT EXISTS fecha_inicio DATE NULL;

-- Comentario para documentar
COMMENT ON COLUMN public.secciones.fecha_inicio IS 'Fecha de inicio individual por sección (opcional). Si es null, se usa el inicio_cursos de la sede para el cálculo de cobros.';
