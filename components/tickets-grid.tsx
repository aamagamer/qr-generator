"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { TicketCard } from "./ticket-card"

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
  const handleDownloadAll = () => {
    // Create a printable page with all tickets
    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    const ticketsHTML = tickets
      .map(
        (ticket) => `
        <div style="page-break-inside: avoid; margin-bottom: 20px; padding: 20px; border: 2px solid #e2e8f0; border-radius: 8px;">
          <h3 style="margin: 0 0 10px 0; font-size: 18px;">${eventName}</h3>
          <div id="qr-${ticket.id}" style="margin: 20px 0;"></div>
          <p style="margin: 10px 0; font-family: monospace; font-size: 14px;">Código: ${ticket.code}</p>
          ${ticket.scanned ? '<p style="color: #ef4444; font-weight: bold;">✓ ESCANEADO</p>' : '<p style="color: #10b981; font-weight: bold;">VÁLIDO</p>'}
        </div>
      `,
      )
      .join("")

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Boletos - ${eventName}</title>
          <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <h1 style="text-align: center; margin-bottom: 30px;">Boletos QR - ${eventName}</h1>
          ${ticketsHTML}
          <script>
            ${tickets
              .map(
                (ticket) => `
              QRCode.toCanvas(document.createElement('canvas'), '${ticket.code}', { width: 200 }, function (error, canvas) {
                if (!error) document.getElementById('qr-${ticket.id}').appendChild(canvas);
              });
            `,
              )
              .join("")}
            setTimeout(() => window.print(), 1000);
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Boletos Generados</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Total: {tickets.length} boletos</p>
          </div>
          <Button variant="outline" onClick={handleDownloadAll}>
            <Download className="h-4 w-4 mr-2" />
            Descargar Todos
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} eventName={eventName} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
