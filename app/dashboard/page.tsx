import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { EventsList } from "@/components/events-list"
import { CreateEventDialog } from "@/components/create-event-dialog"
import { LogoutButton } from "@/components/logout-button"
import { QrCode, Plus } from "lucide-react"

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/auth/login")
  }

  const { data: events } = await supabase
    .from("events")
    .select(`
      *,
      tickets:tickets(count)
    `)
    .order("date", { ascending: true })

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900">
                <QrCode className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Sistema de Eventos QR</h1>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Mis Eventos</h2>
            <p className="text-muted-foreground mt-1">Gestiona tus eventos y escanea boletos QR</p>
          </div>
          <CreateEventDialog>
            <Plus className="h-4 w-4 mr-2" />
            Crear Evento
          </CreateEventDialog>
        </div>

        <EventsList events={events || []} />
      </main>
    </div>
  )
}
