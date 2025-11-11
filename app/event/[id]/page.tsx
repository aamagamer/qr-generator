import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Calendar, MapPin, ArrowLeft, Ticket } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { GenerateTicketsDialog } from "@/components/generate-tickets-dialog"
import { TicketsGrid } from "@/components/tickets-grid"
import { ScannerButton } from "@/components/scanner-button"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EventPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) {
    redirect("/auth/login")
  }

  const { data: event, error } = await supabase.from("events").select("*").eq("id", id).single()

  if (error || !event) {
    redirect("/dashboard")
  }

  const { data: tickets } = await supabase
    .from("tickets")
    .select("*")
    .eq("event_id", id)
    .order("created_at", { ascending: true })

  const totalTickets = event.total_tickets
  const generatedTickets = tickets?.length || 0
  const scannedTickets = tickets?.filter((t) => t.scanned).length || 0
  const progressPercentage = totalTickets > 0 ? (scannedTickets / totalTickets) * 100 : 0

  const eventDate = new Date(event.date)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al Dashboard
            </Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Event Header */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-3xl">{event.name}</CardTitle>
                  <CardDescription className="mt-2 text-base">{event.description || "Sin descripción"}</CardDescription>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{format(eventDate, "PPP", { locale: es })}</span>
                </div>
                {event.location && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{event.location}</span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Ticket className="h-5 w-5 text-primary" />
                      <span className="font-semibold">Boletos Escaneados</span>
                    </div>
                    <Badge variant="secondary" className="text-lg px-3 py-1">
                      {scannedTickets} / {totalTickets}
                    </Badge>
                  </div>
                  <Progress value={progressPercentage} className="h-3" />
                  <p className="text-xs text-muted-foreground mt-2">
                    {progressPercentage.toFixed(1)}% de boletos escaneados
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 pt-4 border-t">
                  <GenerateTicketsDialog
                    eventId={event.id}
                    eventName={event.name}
                    totalTickets={totalTickets}
                    generatedTickets={generatedTickets}
                  />
                  <ScannerButton eventId={event.id} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tickets Grid */}
          {tickets && tickets.length > 0 && <TicketsGrid tickets={tickets} eventName={event.name} />}
        </div>
      </main>
    </div>
  )
}
