"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, Loader2, Eye, EyeOff } from "lucide-react"
import { TicketCard } from "./ticket-card"
import { useState } from "react"
import { toast } from "sonner"
import QRCode from "qrcode"
import JSZip from "jszip"

interface Ticket {
  id: string
  code: string
  scanned: boolean
  scanned_at: string | null
  created_at: string
}

interface TicketsGridProps {
  tickets: Ticket[]
  eventName: string
}

export function TicketsGrid({ tickets, eventName }: TicketsGridProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [showTickets, setShowTickets] = useState(false)

  const handleDownloadAll = async () => {
    setIsDownloading(true)
    toast.loading("Generando códigos QR...", { id: "download-zip" })

    try {
      const zip = new JSZip()
      const folder = zip.folder(eventName) || zip

      // Generate all QR codes as PNG
      for (const ticket of tickets) {
        try {
          const qrDataUrl = await QRCode.toDataURL(ticket.code, {
            width: 400,
            margin: 2,
            color: {
              dark: "#000000",
              light: "#FFFFFF",
            },
          })

          // Convert data URL to base64
          const base64Data = qrDataUrl.split(",")[1]
          const fileName = `${ticket.code}.png`

          folder.file(fileName, base64Data, { base64: true })
        } catch (error) {
          console.error(`Error generating QR for ${ticket.code}:`, error)
        }
      }

      // Generate ZIP file
      const content = await zip.generateAsync({ type: "blob" })

      // Download ZIP
      const url = URL.createObjectURL(content)
      const link = document.createElement("a")
      link.href = url
      link.download = `${eventName}-QR-Codes.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success(`${tickets.length} códigos QR descargados exitosamente`, { id: "download-zip" })
    } catch (error) {
      console.error("Error creating ZIP:", error)
      toast.error("Error al generar el archivo ZIP", { id: "download-zip" })
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Boletos Generados</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Total: {tickets.length} boletos</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowTickets(!showTickets)}>
              {showTickets ? (
                <>
                  <EyeOff className="h-4 w-4 mr-2" />
                  Ocultar Boletos
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Ver Boletos
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleDownloadAll} disabled={isDownloading}>
              {isDownloading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Descargar Todos
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      {showTickets && (
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tickets.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} eventName={eventName} />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  )
}
