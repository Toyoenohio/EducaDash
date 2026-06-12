import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { inscripcion_id, concepto } = await req.json()

    if (!inscripcion_id) {
      throw new Error('inscripcion_id es requerido.')
    }

    if (concepto !== 'certificado_carnet') {
      throw new Error("Solo se permite agregar obligaciones de tipo 'certificado_carnet'.")
    }

    // Initialize the Supabase client with the Service Role Key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Get inscripcion → seccion → curso_sede → sede_id
    const { data: inscripcion, error: inscripcionError } = await supabaseAdmin
      .from('inscripciones')
      .select('id, seccion_id')
      .eq('id', inscripcion_id)
      .single()

    if (inscripcionError || !inscripcion) {
      throw new Error(`Inscripción no encontrada: ${inscripcionError?.message ?? 'ID inválido'}`)
    }

    const { data: seccion, error: seccionError } = await supabaseAdmin
      .from('secciones')
      .select('id, curso_sede_id')
      .eq('id', inscripcion.seccion_id)
      .single()

    if (seccionError || !seccion) {
      throw new Error(`Sección no encontrada: ${seccionError?.message ?? 'ID inválido'}`)
    }

    const { data: cursoSede, error: cursoSedeError } = await supabaseAdmin
      .from('curso_sede')
      .select('id, sede_id')
      .eq('id', seccion.curso_sede_id)
      .single()

    if (cursoSedeError || !cursoSede) {
      throw new Error(`Curso-sede no encontrado: ${cursoSedeError?.message ?? 'ID inválido'}`)
    }

    // 2. Get sede → inicio_cursos
    const { data: sede, error: sedeError } = await supabaseAdmin
      .from('sedes')
      .select('id, inicio_cursos')
      .eq('id', cursoSede.sede_id)
      .single()

    if (sedeError || !sede) {
      throw new Error(`Sede no encontrada: ${sedeError?.message ?? 'ID inválido'}`)
    }

    if (!sede.inicio_cursos) {
      throw new Error('La sede no tiene fecha de inicio de cursos configurada.')
    }

    // 3. Query sede_costos for certificado_carnet
    const { data: costoCertificado, error: costoCertError } = await supabaseAdmin
      .from('sede_costos')
      .select('concepto, monto')
      .eq('sede_id', cursoSede.sede_id)
      .eq('concepto', 'certificado_carnet')
      .single()

    if (costoCertError || !costoCertificado) {
      throw new Error(`No se encontró el costo de certificado/carnet para esta sede: ${costoCertError?.message ?? 'No configurado'}`)
    }

    // Get duracion_semanas from cuota_semanal to calculate end of course
    const { data: costoSemanal, error: costoSemError } = await supabaseAdmin
      .from('sede_costos')
      .select('duracion_semanas')
      .eq('sede_id', cursoSede.sede_id)
      .eq('concepto', 'cuota_semanal')
      .single()

    if (costoSemError || !costoSemanal || !costoSemanal.duracion_semanas) {
      throw new Error(`No se encontró la duración del curso (cuota_semanal) para esta sede: ${costoSemError?.message ?? 'No configurado'}`)
    }

    // Check if a certificado_carnet obligation already exists for this inscription
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('obligaciones')
      .select('id')
      .eq('inscripcion_id', inscripcion_id)
      .eq('concepto', 'certificado_carnet')
      .limit(1)

    if (existingError) {
      throw new Error(`Error al verificar obligaciones existentes: ${existingError.message}`)
    }

    if (existing && existing.length > 0) {
      throw new Error('Ya existe una obligación de certificado/carnet para esta inscripción.')
    }

    // 4. Calculate fecha_vencimiento = inicio_cursos + (duracion_semanas * 7 days) → end of course
    const inicioCursos = new Date(sede.inicio_cursos + 'T00:00:00')
    const fechaVencimiento = new Date(inicioCursos)
    fechaVencimiento.setDate(fechaVencimiento.getDate() + (costoSemanal.duracion_semanas * 7))
    const fechaVencimientoStr = fechaVencimiento.toISOString().substring(0, 10)

    // Create the obligation
    const { data: obligacion, error: insertError } = await supabaseAdmin
      .from('obligaciones')
      .insert({
        inscripcion_id,
        concepto: 'certificado_carnet',
        numero_semana: null,
        monto: costoCertificado.monto,
        fecha_vencimiento: fechaVencimientoStr,
      })
      .select()
      .single()

    if (insertError) {
      throw new Error(`Error al crear obligación: ${insertError.message}`)
    }

    // 5. Return created obligation
    return new Response(JSON.stringify({
      obligacion,
      mensaje: 'Obligación de certificado/carnet creada exitosamente.',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
