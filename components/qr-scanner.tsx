"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Camera, CameraOff, CheckCircle, XCircle, AlertTriangle, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface QRScannerProps {
  eventId: string
}

type ScanResult = {
  type: "valid" | "already-scanned" | "invalid"
  code: string
  message: string
}

export function QRScanner({ eventId }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [lastResult, setLastResult] = useState<ScanResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([])
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)

  useEffect(() => {
    checkCameraPermission()
    return () => stopScanning()
  }, [])

  const checkCameraPermission = async () => {
    try {
      const result = await navigator.permissions.query({ name: "camera" as PermissionName })
      setHasPermission(result.state === "granted")

      result.addEventListener("change", () => {
        setHasPermission(result.state === "granted")
      })
    } catch {
      setHasPermission(null)
    }
  }

  const startScanning = async () => {
    try {
      if (!("BarcodeDetector" in window)) {
        toast.error("Tu navegador no soporta la detección automática de QR. Usa entrada manual.")
        return
      }

      const video = document.getElementById("qr-video") as HTMLVideoElement
      if (!video) {
        toast.error("No se encontró el elemento de video.")
        return
      }

      // Solicita la cámara trasera (preferida)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      })

      video.srcObject = stream
      video.muted = true
      video.autoplay = true
      video.setAttribute("playsinline", "true")
      video.setAttribute("autoplay", "")
      video.setAttribute("muted", "")

      // Esperar a que el video esté listo antes de reproducir
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = async () => {
          try {
            await video.play()
            resolve()
          } catch (err) {
            console.error("Error reproduciendo video:", err)
            toast.error("No se pudo iniciar el video. Toca para permitir la reproducción.")
            reject(err)
          }
        }
      })

      setIsScanning(true)
      setHasPermission(true)
      startQRDetection(video)
    } catch (error) {
      console.error("Error al acceder a la cámara:", error)
      toast.error("No se pudo acceder a la cámara. Verifica los permisos.")
      setHasPermission(false)
    }
  }

  const stopScanning = () => {
    const video = document.getElementById("qr-video") as HTMLVideoElement
    if (video && video.srcObject) {
      const stream = video.srcObject as MediaStream
      stream.getTracks().forEach((track) => track.stop())
      video.srcObject = null
    }
    setIsScanning(false)
    setHasPermission(null)
  }

  const startQRDetection = async (video: HTMLVideoElement) => {
    const barcodeDetector = new (window as any).BarcodeDetector({ formats: ["qr_code"] })

    const detect = async () => {
      if (!video.srcObject) return

      // Esperar hasta que haya datos suficientes
      if (video.readyState < video.HAVE_ENOUGH_DATA) {
        requestAnimationFrame(detect)
        return
      }

      if (isScanning) {
        try {
          const barcodes = await barcodeDetector.detect(video)
          if (barcodes.length > 0 && !isProcessing) {
            await handleScan(barcodes[0].rawValue)
          }
        } catch (error) {
          console.error("Error de detección:", error)
        }
        requestAnimationFrame(detect)
      }
    }

    detect()
  }

  const handleScan = async (code: string) => {
    if (isProcessing || !code) return
    setIsProcessing(true)

    try {
      const response = await fetch("/api/validate-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, code }),
      })

      const data = await response.json()
      let result: ScanResult

      if (data.valid && !data.alreadyScanned) {
        result = { type: "valid", code, message: "Boleto válido y registrado" }
        toast.success("Boleto válido", { description: "Entrada registrada correctamente" })
      } else if (data.alreadyScanned) {
        result = { type: "already-scanned", code, message: "Este boleto ya fue escaneado" }
        toast.error("Boleto duplicado", { description: "Este boleto ya fue utilizado" })
      } else {
        result = { type: "invalid", code, message: "Boleto no válido para este evento" }
        toast.error("Boleto inválido", { description: "El código no corresponde a este evento" })
      }

      setLastResult(result)
      setScanHistory((prev) => [result, ...prev].slice(0, 10))
      await new Promise((resolve) => setTimeout(resolve, 2000))
    } catch (error) {
      console.error("Error al validar boleto:", error)
      toast.error("Error al validar el boleto")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleManualInput = async () => {
    const code = prompt("Ingresa el código del boleto:")
    if (code) await handleScan(code)
  }

  return (
    <div className="space-y-6">
      <Card className="bg-slate-900/50 border-slate-700">
        <CardContent className="p-6">
          <div className="relative aspect-square w-full bg-slate-950 rounded-lg overflow-hidden">
            {isScanning ? (
              <>
                <video
                  id="qr-video"
                  className="absolute inset-0 w-full h-full object-cover"
                  playsInline
                  autoPlay
                  muted
                />
                <div className="absolute inset-0 border-4 border-white/20 rounded-lg">
                  <div className="absolute inset-8 border-2 border-white rounded-lg shadow-lg shadow-white/50" />
                </div>
                {isProcessing && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="h-12 w-12 text-white animate-spin" />
                  </div>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <CameraOff className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">Cámara desactivada</p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex gap-3">
            {!isScanning ? (
              <Button onClick={startScanning} className="flex-1" size="lg">
                <Camera className="h-5 w-5 mr-2" />
                Iniciar Escaneo
              </Button>
            ) : (
              <Button onClick={stopScanning} variant="destructive" className="flex-1" size="lg">
                <CameraOff className="h-5 w-5 mr-2" />
                Detener
              </Button>
            )}
            <Button
              onClick={handleManualInput}
              variant="outline"
              size="lg"
              className="border-slate-600 text-white hover:bg-slate-800 bg-transparent"
            >
              Entrada Manual
            </Button>
          </div>

          {lastResult && (
            <div
              className={`mt-6 p-4 rounded-lg border-2 ${
                lastResult.type === "valid"
                  ? "bg-green-500/10 border-green-500"
                  : lastResult.type === "already-scanned"
                  ? "bg-yellow-500/10 border-yellow-500"
                  : "bg-red-500/10 border-red-500"
              }`}
            >
              <div className="flex items-center gap-3">
                {lastResult.type === "valid" && <CheckCircle className="h-8 w-8 text-green-500" />}
                {lastResult.type === "already-scanned" && <AlertTriangle className="h-8 w-8 text-yellow-500" />}
                {lastResult.type === "invalid" && <XCircle className="h-8 w-8 text-red-500" />}
                <div className="flex-1">
                  <p
                    className={`font-bold ${
                      lastResult.type === "valid"
                        ? "text-green-400"
                        : lastResult.type === "already-scanned"
                        ? "text-yellow-400"
                        : "text-red-400"
                    }`}
                  >
                    {lastResult.message}
                  </p>
                  <p className="text-xs text-slate-400 font-mono mt-1">{lastResult.code}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {scanHistory.length > 0 && (
        <Card className="bg-slate-900/50 border-slate-700">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Historial de Escaneos</h3>
            <div className="space-y-2">
              {scanHistory.map((result, index) => (
                <div
                  key={`${result.code}-${index}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-950/50 border border-slate-800"
                >
                  <div className="flex-1">
                    <p className="text-xs font-mono text-slate-400">{result.code}</p>
                  </div>
                  <Badge
                    variant={result.type === "valid" ? "default" : "secondary"}
                    className={
                      result.type === "valid"
                        ? "bg-green-500 hover:bg-green-600"
                        : result.type === "already-scanned"
                        ? "bg-yellow-500 hover:bg-yellow-600"
                        : "bg-red-500 hover:bg-red-600"
                    }
                  >
                    {result.type === "valid" && "Válido"}
                    {result.type === "already-scanned" && "Ya escaneado"}
                    {result.type === "invalid" && "Inválido"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
