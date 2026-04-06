"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Camera, X, Keyboard } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";

interface ScanResult {
  barcode: string;
  format: string;
}

interface Props {
  onScan: (barcode: string) => void;
}

export default function BarcodeScanner({ onScan }: Props) {
  const [mode, setMode] = useState<"camera" | "manual">("camera");
  const [manualCode, setManualCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  }, []);

  const startCamera = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setScanning(true);

      // Use BarcodeDetector API if available
      if ("BarcodeDetector" in window) {
        // @ts-expect-error - BarcodeDetector is experimental
        const detector = new BarcodeDetector({
          formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "qr_code"],
        });

        const detect = async () => {
          if (!videoRef.current || !streamRef.current) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0) {
              stopCamera();
              onScan(barcodes[0].rawValue);
              return;
            }
          } catch {
            // Frame not ready yet
          }
          if (streamRef.current) {
            requestAnimationFrame(detect);
          }
        };
        requestAnimationFrame(detect);
      } else {
        // Fallback: use quagga2 (loaded dynamically)
        setError("Camera scanning requires a supported browser. Try entering the code manually.");
      }
    } catch {
      setError("Could not access camera. Please allow camera permissions or enter the code manually.");
    }
  }, [onScan, stopCamera]);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onScan(manualCode.trim());
    }
  };

  return (
    <Card className="p-5 space-y-4">
      {/* Mode toggle */}
      <div className="flex items-center gap-2">
        <Button
          variant={mode === "camera" ? "primary" : "secondary"}
          size="sm"
          onClick={() => { setMode("camera"); }}
        >
          <Camera className="w-4 h-4" /> Camera
        </Button>
        <Button
          variant={mode === "manual" ? "primary" : "secondary"}
          size="sm"
          onClick={() => { setMode("manual"); stopCamera(); }}
        >
          <Keyboard className="w-4 h-4" /> Manual
        </Button>
      </div>

      {mode === "camera" ? (
        <div className="space-y-3">
          <div className="relative aspect-[4/3] bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {!scanning && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Button onClick={startCamera}>
                  <Camera className="w-4 h-4" /> Start Scanner
                </Button>
              </div>
            )}
            {scanning && (
              <>
                {/* Scanning overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-32 border-2 border-[var(--color-accent)] rounded-lg" />
                </div>
                <button
                  onClick={stopCamera}
                  className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
          <p className="text-xs text-[var(--color-text-muted)] text-center">
            Point your camera at a barcode or UPC code
          </p>
        </div>
      ) : (
        <form onSubmit={handleManualSubmit} className="space-y-3">
          <Input
            id="barcode"
            label="Enter Barcode / UPC"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="036000291452"
          />
          <Button type="submit" className="w-full">Look Up</Button>
        </form>
      )}

      {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
    </Card>
  );
}
