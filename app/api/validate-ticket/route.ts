import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { eventId, code } = await request.json()

    if (!eventId || !code) {
      return NextResponse.json({ error: "Missing eventId or code" }, { status: 400 })
    }

    const supabase = await createClient()

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if ticket exists for this event
    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .select("*, events!inner(*)")
      .eq("code", code)
      .eq("event_id", eventId)
      .single()

    if (ticketError || !ticket) {
      return NextResponse.json({
        valid: false,
        alreadyScanned: false,
        message: "Boleto no encontrado para este evento",
      })
    }

    // Check if already scanned
    if (ticket.scanned) {
      return NextResponse.json({
        valid: true,
        alreadyScanned: true,
        scannedAt: ticket.scanned_at,
        message: "Este boleto ya fue escaneado",
      })
    }

    // Mark ticket as scanned
    const { error: updateError } = await supabase
      .from("tickets")
      .update({
        scanned: true,
        scanned_at: new Date().toISOString(),
      })
      .eq("id", ticket.id)

    if (updateError) {
      console.error("Error updating ticket:", updateError)
      return NextResponse.json({ error: "Error al actualizar el boleto" }, { status: 500 })
    }

    return NextResponse.json({
      valid: true,
      alreadyScanned: false,
      message: "Boleto válido y registrado",
    })
  } catch (error) {
    console.error("Validation error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
