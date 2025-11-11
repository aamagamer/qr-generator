"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, MapPin, Ticket, QrCode } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { DeleteEventDialog } from "./delete-event-dialog"

interface Event {
  id: string
  name: string
  description: string | null
  date: string
  location: string | null
  total_tickets: number
  tickets?: { count: number }[]
}

interface EventsListProps {
  events: Event[]
}

export function EventsList({ events }: EventsListProps) {
  if (!events || events.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Ticket className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">No tienes eventos</h3>
          <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">
            Crea tu primer evento para comenzar a generar y escanear boletos QR
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => {
        const ticketCount = event.tickets?.[0]?.count || 0
        const eventDate = new Date(event.date)
        const isPast = eventDate < new Date()

        return (
          <Card key={event.id} className="group hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-xl line-clamp-1">{event.name}</CardTitle>
                  <CardDescription className="mt-2 line-clamp-2">
                    {event.description || "Sin descripción"}
                  </CardDescription>
                </div>
                <DeleteEventDialog eventId={event.id} eventName={event.name} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{format(eventDate, "PPP", { locale: es })}</span>
                  {isPast && <Badge variant="secondary">Pasado</Badge>}
                </div>
                {event.location && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span className="line-clamp-1">{event.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Ticket className="h-4 w-4 text-primary" />
                  <span className="font-medium">
                    {ticketCount} / {event.total_tickets} boletos
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t">
                <Button asChild className="w-full">
                  <Link href={`/event/${event.id}`}>
                    <QrCode className="h-4 w-4 mr-2" />
                    Ver Evento
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
