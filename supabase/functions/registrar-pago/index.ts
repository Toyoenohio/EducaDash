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
    const { inscripcion_id, monto, metodo_pago, referencia, obligacion_ids } = await req.json()

    if (!inscripcion_id) {
      throw new Error('inscripcion_id es requerido.')
    }
    if (!monto || monto <= 0) {
      throw new Error('monto es requerido y debe ser mayor a 0.')
    }
    if (!metodo_pago) {
      throw new Error('metodo_pago es requerido.')
    }

    // Initialize the Supabase client with the Service Role Key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify inscripcion exists
    const { data: inscripcion, error: inscripcionError } = await supabaseAdmin
      .from('inscripciones')
      .select('id, estado')
      .eq('id', inscripcion_id)
      .single()

    if (inscripcionError || !inscripcion) {
      throw new Error(`Inscripción no encontrada: ${inscripcionError?.message ?? 'ID inválido'}`)
    }

    // 1. Get obligations to pay
    let obligacionesAPagar: Array<{
      id: string
      concepto: string
      numero_semana: number | null
      monto: number
      total_abonado: number
      saldo_pendiente: number
      estado: string
    }> = []

    if (obligacion_ids && obligacion_ids.length > 0) {
      // Use provided obligation IDs
      const { data, error } = await supabaseAdmin
        .from('obligaciones_con_estado')
        .select('id, concepto, numero_semana, monto, total_abonado, saldo_pendiente, estado')
        .in('id', obligacion_ids)
        .neq('estado', 'pagado')

      if (error) {
        throw new Error(`Error al obtener obligaciones: ${error.message}`)
      }

      if (!data || data.length === 0) {
        throw new Error('Las obligaciones seleccionadas ya están pagadas o no existen.')
      }

      // Sort: inscripcion first, then by numero_semana
      obligacionesAPagar = data.sort((a, b) => {
        if (a.concepto === 'inscripcion' && b.concepto !== 'inscripcion') return -1
        if (a.concepto !== 'inscripcion' && b.concepto === 'inscripcion') return 1
        return (a.numero_semana ?? 0) - (b.numero_semana ?? 0)
      })
    } else {
      // Auto-select: unpaid obligations ordered by priority
      const { data, error } = await supabaseAdmin
        .from('obligaciones_con_estado')
        .select('id, concepto, numero_semana, monto, total_abonado, saldo_pendiente, estado')
        .eq('inscripcion_id', inscripcion_id)
        .neq('estado', 'pagado')
        .order('numero_semana', { ascending: true, nullsFirst: true })

      if (error) {
        throw new Error(`Error al obtener obligaciones pendientes: ${error.message}`)
      }

      if (!data || data.length === 0) {
        throw new Error('No hay obligaciones pendientes para esta inscripción.')
      }

      // Sort: inscripcion first (DESC on concepto='inscripcion'), then oldest weeks first
      obligacionesAPagar = data.sort((a, b) => {
        if (a.concepto === 'inscripcion' && b.concepto !== 'inscripcion') return -1
        if (a.concepto !== 'inscripcion' && b.concepto === 'inscripcion') return 1
        return (a.numero_semana ?? 0) - (b.numero_semana ?? 0)
      })
    }

    // 2. Create pago record
    const now = new Date()
    const { data: pago, error: pagoError } = await supabaseAdmin
      .from('pagos')
      .insert({
        inscripcion_id,
        mes: now.getMonth() + 1, // 1-12
        anio: now.getFullYear(),
        monto,
        concepto: 'abono_' + Date.now(),
        metodo_pago,
        referencia: referencia ?? null,
        pagado: true,
        fecha_pago: now.toISOString(),
      })
      .select()
      .single()

    if (pagoError || !pago) {
      throw new Error(`Error al crear pago: ${pagoError?.message ?? 'Error desconocido'}`)
    }

    // 3. Distribute payment across obligations
    let remaining = monto
    const distribuciones: Array<{
      pago_id: string
      obligacion_id: string
      monto_abonado: number
      concepto: string
      numero_semana: number | null
    }> = []

    for (const obligacion of obligacionesAPagar) {
      if (remaining <= 0) break

      const saldoPendiente = Number(obligacion.saldo_pendiente)
      if (saldoPendiente <= 0) continue

      const abono = Math.min(saldoPendiente, remaining)

      const { error: poError } = await supabaseAdmin
        .from('pago_obligaciones')
        .insert({
          pago_id: pago.id,
          obligacion_id: obligacion.id,
          monto_abonado: abono,
        })

      if (poError) {
        throw new Error(`Error al distribuir pago a obligación ${obligacion.id}: ${poError.message}`)
      }

      distribuciones.push({
        pago_id: pago.id,
        obligacion_id: obligacion.id,
        monto_abonado: abono,
        concepto: obligacion.concepto,
        numero_semana: obligacion.numero_semana,
      })

      remaining = Math.round((remaining - abono) * 100) / 100 // avoid floating point issues
    }

    // 4 & 5. Update inscription status based on obligation states
    // Re-query all obligations with updated state
    const { data: allObligaciones, error: allObError } = await supabaseAdmin
      .from('obligaciones_con_estado')
      .select('id, concepto, saldo_pendiente, estado, fecha_vencimiento')
      .eq('inscripcion_id', inscripcion_id)

    if (allObError) {
      throw new Error(`Error al verificar estado de obligaciones: ${allObError.message}`)
    }

    let nuevoEstado = inscripcion.estado

    if (allObligaciones && allObligaciones.length > 0) {
      // Check if inscripcion obligation is fully paid
      const obligInscripcion = allObligaciones.find(
        (o: { concepto: string }) => o.concepto === 'inscripcion'
      )
      const inscripcionPagada = !obligInscripcion || obligInscripcion.estado === 'pagado'

      // Count overdue weekly obligations
      const today = now.toISOString().substring(0, 10)
      const semanalesVencidas = allObligaciones.filter(
        (o: { concepto: string; fecha_vencimiento: string; estado: string }) =>
          o.concepto === 'cuota_semanal' &&
          o.fecha_vencimiento < today &&
          o.estado !== 'pagado'
      )

      if (semanalesVencidas.length >= 3) {
        nuevoEstado = 'suspendido'
      } else if (inscripcionPagada && semanalesVencidas.length === 0) {
        nuevoEstado = 'activa'
      } else if (inscripcionPagada) {
        // Inscripcion paid but some overdue (less than 3), keep or set activa
        nuevoEstado = 'activa'
      }

      // Update inscription status
      const { error: updateError } = await supabaseAdmin
        .from('inscripciones')
        .update({ estado: nuevoEstado })
        .eq('id', inscripcion_id)

      if (updateError) {
        throw new Error(`Error al actualizar estado de inscripción: ${updateError.message}`)
      }
    }

    // 6. Return result
    return new Response(JSON.stringify({
      pago,
      distribuciones,
      nuevo_estado: nuevoEstado,
      monto_sobrante: remaining > 0 ? remaining : 0,
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
