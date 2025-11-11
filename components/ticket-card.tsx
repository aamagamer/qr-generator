"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Download, CheckCircle, Circle } from "lucide-react"
import QRCode from "qrcode"

interface Ticket {
  id: string
  code: string
  scanned: boolean
  scanned_at: string | null
}

interface TicketCardProps {
  ticket: Ticket
  eventName: string
}

export function TicketCard({ ticket, eventName }: TicketCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string>("")

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, ticket.code, {
        width: 200,
        margin: 2,
        color: {
          dark: "#0f172a",
          light: "#ffffff",
        },
      })

      // Also generate data URL for download
      QRCode.toDataURL(ticket.code, { width: 400 }, (err, url) => {
        if (!err) setQrDataUrl(url)
      })
    }
  }, [ticket.code])

  const handleDownload = () => {
    if (!qrDataUrl) return

    const link = document.createElement("a")
    link.href = qrDataUrl
    link.download = `ticket-${ticket.code}.png`
    link.click()
  }

  return (
    <Card className={ticket.scanned ? "border-muted bg-muted/20" : ""}>
      <CardContent className="p-4">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="flex items-center justify-between w-full">
            <Badge variant={ticket.scanned ? "secondary" : "default"}>
              {ticket.scanned ? (
                <>
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Escaneado
                </>
              ) : (
                <>
                  <Circle className="h-3 w-3 mr-1" />
                  Válido
                </>
              )}
            </Badge>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDownload} disabled={!qrDataUrl}>
              <Download className="h-4 w-4" />
            </Button>
          </div>

          <canvas ref={canvasRef} className="rounded-lg border-2 border-border" />

          <div className="w-full">
            <p className="text-xs font-mono bg-muted px-2 py-1 rounded break-all">{ticket.code}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
