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
    const { inscripcion_id } = await req.json()

    if (!inscripcion_id) {
      throw new Error('inscripcion_id es requerido.')
    }

    // Initialize the Supabase client with the Service Role Key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Get inscripcion
    const { data: inscripcion, error: inscripcionError } = await supabaseAdmin
      .from('inscripciones')
      .select('id, seccion_id, fecha_inscripcion')
      .eq('id', inscripcion_id)
      .single()

    if (inscripcionError || !inscripcion) {
      throw new Error(`Inscripción no encontrada: ${inscripcionError?.message ?? 'ID inválido'}`)
    }

    // 2. Get seccion → curso_sede_id, fecha_inicio
    const { data: seccion, error: seccionError } = await supabaseAdmin
      .from('secciones')
      .select('id, curso_sede_id, fecha_inicio')
      .eq('id', inscripcion.seccion_id)
      .single()

    if (seccionError || !seccion) {
      throw new Error(`Sección no encontrada: ${seccionError?.message ?? 'ID inválido'}`)
    }

    // 3. Get curso_sede → sede_id
    const { data: cursoSede, error: cursoSedeError } = await supabaseAdmin
      .from('curso_sede')
      .select('id, sede_id')
      .eq('id', seccion.curso_sede_id)
      .single()

    if (cursoSedeError || !cursoSede) {
      throw new Error(`Curso-sede no encontrado: ${cursoSedeError?.message ?? 'ID inválido'}`)
    }

    // 4. Get sede → inicio_cursos
    const { data: sede, error: sedeError } = await supabaseAdmin
      .from('sedes')
      .select('id, inicio_cursos')
      .eq('id', cursoSede.sede_id)
      .single()

    if (sedeError || !sede) {
      throw new Error(`Sede no encontrada: ${sedeError?.message ?? 'ID inválido'}`)
    }

    if (!seccion.fecha_inicio && !sede.inicio_cursos) {
      throw new Error('No hay fecha de inicio configurada (ni en la sección ni en la sede).')
    }

    // 5. Query sede_costos for this sede
    const { data: costos, error: costosError } = await supabaseAdmin
      .from('sede_costos')
      .select('concepto, monto, duracion_semanas')
      .eq('sede_id', cursoSede.sede_id)

    if (costosError) {
      throw new Error(`Error al obtener costos de sede: ${costosError.message}`)
    }

    if (!costos || costos.length === 0) {
      throw new Error('No se encontraron costos configurados para esta sede.')
    }

    // Check if obligations already exist for this inscription
    const { data: existingObligaciones, error: existingError } = await supabaseAdmin
      .from('obligaciones')
      .select('id')
      .eq('inscripcion_id', inscripcion_id)
      .limit(1)

    if (existingError) {
      throw new Error(`Error al verificar obligaciones existentes: ${existingError.message}`)
    }

    if (existingObligaciones && existingObligaciones.length > 0) {
      throw new Error('Ya existen obligaciones generadas para esta inscripción.')
    }

    const obligaciones: Array<{
      inscripcion_id: string
      concepto: string
      numero_semana: number | null
      monto: number
      fecha_vencimiento: string
    }> = []

    const fechaBase = seccion.fecha_inicio || sede.inicio_cursos
    const inicioCursos = new Date(fechaBase + 'T00:00:00')

    // 6. For concepto='inscripcion': create 1 obligation
    const costoInscripcion = costos.find((c: { concepto: string }) => c.concepto === 'inscripcion')
    if (costoInscripcion) {
      // fecha_vencimiento = fecha_inscripcion cast to date
      const fechaInscripcion = inscripcion.fecha_inscripcion.substring(0, 10) // extract date part from timestamptz
      obligaciones.push({
        inscripcion_id,
        concepto: 'inscripcion',
        numero_semana: null,
        monto: costoInscripcion.monto,
        fecha_vencimiento: fechaInscripcion,
      })
    }

    // 7. For concepto='cuota_semanal': generate N weekly obligations
    const costoSemanal = costos.find((c: { concepto: string }) => c.concepto === 'cuota_semanal')
    if (costoSemanal && costoSemanal.duracion_semanas) {
      const duracion = costoSemanal.duracion_semanas

      for (let i = 1; i <= duracion; i++) {
        const fechaVencimiento = new Date(inicioCursos)
        fechaVencimiento.setDate(fechaVencimiento.getDate() + (i * 7))
        const fechaStr = fechaVencimiento.toISOString().substring(0, 10)

        obligaciones.push({
          inscripcion_id,
          concepto: 'cuota_semanal',
          numero_semana: i,
          monto: costoSemanal.monto,
          fecha_vencimiento: fechaStr,
        })
      }
    }

    // 8. Do NOT generate 'certificado_carnet' (optional, added manually)

    if (obligaciones.length === 0) {
      throw new Error('No se generaron obligaciones. Verifique los costos configurados para la sede.')
    }

    // 9. Insert all obligations
    const { data: created, error: insertError } = await supabaseAdmin
      .from('obligaciones')
      .insert(obligaciones)
      .select()

    if (insertError) {
      throw new Error(`Error al insertar obligaciones: ${insertError.message}`)
    }

    // 10. Return created obligations and total count
    return new Response(JSON.stringify({
      obligaciones: created,
      total: created?.length ?? 0,
      mensaje: `Se generaron ${created?.length ?? 0} obligaciones para la inscripción.`,
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
