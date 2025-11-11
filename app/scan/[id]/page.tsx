import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { QRScanner } from "@/components/qr-scanner"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ScanPage({ params }: PageProps) {
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

  const { data: tickets } = await supabase.from("tickets").select("*").eq("event_id", id)

  const scannedCount = tickets?.filter((t) => t.scanned).length || 0
  const totalCount = event.total_tickets

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <header className="border-b border-slate-700 bg-slate-900/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" asChild className="text-white hover:bg-slate-800">
            <Link href={`/event/${id}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al Evento
            </Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">{event.name}</h1>
            <p className="text-slate-300 text-lg">
              Boletos escaneados: <span className="font-bold text-white">{scannedCount}</span> / {totalCount}
            </p>
          </div>

          <QRScanner eventId={id} />
        </div>
      </main>
    </div>
  )
}
