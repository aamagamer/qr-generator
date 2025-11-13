"use client"

import { useState, useEffect, useRef } from "react"
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
  timestamp: number
}

export function QRScanner({ eventId }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [lastResult, setLastResult] = useState<ScanResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([])
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const detectionLoopRef = useRef<number | null>(null)

  useEffect(() => {
    checkCameraPermission()

    return () => {
      stopScanning()
    }
  }, [])

  const checkCameraPermission = async () => {
    try {
      const result = await navigator.permissions.query({ name: "camera" as PermissionName })
      setHasPermission(result.state === "granted")

      result.addEventListener("change", () => {
        setHasPermission(result.state === "granted")
      })
    } catch (error) {
      setHasPermission(null)
    }
  }

  const startScanning = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })

      streamRef.current = stream
      const video = document.getElementById("qr-video") as HTMLVideoElement
      videoRef.current = video

      if (video) {
        video.srcObject = stream
        await video.play()
        setIsScanning(true)
        setHasPermission(true)

        video.onloadedmetadata = () => {
          startQRDetection(video)
        }
      }
    } catch (error) {
      console.error("Error accessing camera:", error)
      toast.error("No se pudo acceder a la cámara. Verifica los permisos.")
      setHasPermission(false)
    }
  }

  const stopScanning = () => {
    if (detectionLoopRef.current) {
      cancelAnimationFrame(detectionLoopRef.current)
      detectionLoopRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setIsScanning(false)
  }

  const startQRDetection = async (video: HTMLVideoElement) => {
    if ("BarcodeDetector" in window) {
      const barcodeDetector = new (window as any).BarcodeDetector({ formats: ["qr_code"] })

      const detect = async () => {
        if (isScanning && video.readyState === video.HAVE_ENOUGH_DATA && !isProcessing) {
          try {
            const barcodes = await barcodeDetector.detect(video)
            if (barcodes.length > 0) {
              await handleScan(barcodes[0].rawValue)
            }
          } catch (error) {
            console.error("Detection error:", error)
          }
        }

        if (isScanning) {
          detectionLoopRef.current = requestAnimationFrame(detect)
        }
      }

      detect()
    } else {
      toast.error("La detección automática no está disponible. Usa entrada manual.")
    }
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
        result = {
          type: "valid",
          code,
          message: "✓ Boleto válido y registrado",
          timestamp: Date.now(),
        }
        toast.success("Boleto válido", {
          description: "Entrada registrada correctamente",
        })
      } else if (data.alreadyScanned) {
        result = {
          type: "already-scanned",
          code,
          message: "⚠ Este boleto ya fue escaneado",
          timestamp: Date.now(),
        }
        toast.error("Boleto duplicado", {
          description: "Este boleto ya fue utilizado",
        })
      } else {
        result = {
          type: "invalid",
          code,
          message: "✗ Boleto no válido",
          timestamp: Date.now(),
        }
        toast.error("Boleto inválido", {
          description: "El código no corresponde a este evento",
        })
      }

      setLastResult(result)
      setScanHistory((prev) => [result, ...prev].slice(0, 20))

      await new Promise((resolve) => setTimeout(resolve, 800))
    } catch (error) {
      console.error("Scan error:", error)
      toast.error("Error al validar el boleto")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleManualInput = async () => {
    const code = prompt("Ingresa el código del boleto:")
    if (code) {
      await handleScan(code.trim())
    }
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
                  {hasPermission === false && <p className="text-xs text-red-400 mt-2">Permiso de cámara denegado</p>}
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
              disabled={isProcessing}
            >
              Entrada Manual
            </Button>
          </div>

          {lastResult && (
            <div
              className={`mt-6 p-6 rounded-lg border-2 ${
                lastResult.type === "valid"
                  ? "bg-green-500/20 border-green-500"
                  : lastResult.type === "already-scanned"
                    ? "bg-yellow-500/20 border-yellow-500"
                    : "bg-red-500/20 border-red-500"
              }`}
            >
              <div className="flex items-center gap-4">
                {lastResult.type === "valid" && <CheckCircle className="h-12 w-12 text-green-500 flex-shrink-0" />}
                {lastResult.type === "already-scanned" && (
                  <AlertTriangle className="h-12 w-12 text-yellow-500 flex-shrink-0" />
                )}
                {lastResult.type === "invalid" && <XCircle className="h-12 w-12 text-red-500 flex-shrink-0" />}
                <div className="flex-1">
                  <p
                    className={`font-bold text-xl ${
                      lastResult.type === "valid"
                        ? "text-green-300"
                        : lastResult.type === "already-scanned"
                          ? "text-yellow-300"
                          : "text-red-300"
                    }`}
                  >
                    {lastResult.message}
                  </p>
                  <p className="text-sm text-slate-300 font-mono mt-2">{lastResult.code}</p>
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
                  key={`${result.code}-${result.timestamp}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-950/50 border border-slate-800"
                >
                  <div className="flex-1">
                    <p className="text-xs font-mono text-slate-400">{result.code}</p>
                    <p className="text-xs text-slate-500 mt-1">{new Date(result.timestamp).toLocaleTimeString()}</p>
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
