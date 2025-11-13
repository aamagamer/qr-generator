"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface GenerateTicketsDialogProps {
  eventId: string
  eventName: string
  totalTickets: number
  generatedTickets: number
}

export function GenerateTicketsDialog({
  eventId,
  eventName,
  totalTickets,
  generatedTickets,
}: GenerateTicketsDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const router = useRouter()

  const remainingTickets = totalTickets - generatedTickets
  const canGenerate = remainingTickets > 0

  const generateTicketCode = (eventName: string, index: number): string => {
    // Extract initials from event name
    const words = eventName.trim().split(/\s+/)
    const initials = words
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 3)

    // Generate random alphanumeric string
    const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase()
    const timestamp = Date.now().toString(36).toUpperCase()

    return `${initials}-${timestamp}-${randomPart}`
  }

  const handleGenerate = async () => {
    if (quantity > remainingTickets) {
      toast.error(`Solo puedes generar ${remainingTickets} boletos más`)
      return
    }

    setIsLoading(true)

    try {
      const supabase = createClient()

      // Generate tickets in batches of 500 for better performance
      const batchSize = 500
      const batches = Math.ceil(quantity / batchSize)

      for (let i = 0; i < batches; i++) {
        const start = i * batchSize
        const end = Math.min(start + batchSize, quantity)
        const batchQuantity = end - start

        const ticketsToInsert = Array.from({ length: batchQuantity }, (_, index) => ({
          event_id: eventId,
          code: generateTicketCode(eventName, generatedTickets + start + index),
          scanned: false,
        }))

        const { error } = await supabase.from("tickets").insert(ticketsToInsert)
        if (error) throw error
      }

      toast.success(`${quantity} boleto${quantity > 1 ? "s" : ""} generado${quantity > 1 ? "s" : ""} exitosamente`)
      setOpen(false)
      setQuantity(1)
      router.refresh()
    } catch (err) {
      toast.error("Error al generar boletos")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={!canGenerate} size="lg">
          <Plus className="h-4 w-4 mr-2" />
          Generar Boletos QR
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generar Boletos QR</DialogTitle>
          <DialogDescription>
            Puedes generar hasta {remainingTickets} boleto{remainingTickets !== 1 ? "s" : ""} más para este evento.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="quantity">Cantidad de Boletos</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                max={remainingTickets}
                value={quantity}
                onChange={(e) => setQuantity(Number.parseInt(e.target.value) || 1)}
              />
              <p className="text-xs text-muted-foreground">
                Cada boleto tendrá un código QR único basado en las iniciales del evento
              </p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleGenerate} disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isLoading ? "Generando..." : "Generar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
