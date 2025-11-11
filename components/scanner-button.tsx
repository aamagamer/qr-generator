"use client"

import { Button } from "@/components/ui/button"
import { Camera } from "lucide-react"
import Link from "next/link"

interface ScannerButtonProps {
  eventId: string
}

export function ScannerButton({ eventId }: ScannerButtonProps) {
  return (
    <Button variant="outline" size="lg" asChild>
      <Link href={`/scan/${eventId}`}>
        <Camera className="h-4 w-4 mr-2" />
        Escanear Boletos
      </Link>
    </Button>
  )
}
