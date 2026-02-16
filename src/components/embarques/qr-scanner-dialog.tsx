"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, X, Upload, ImageIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

type QRScannerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (code: string) => void;
};

export function QRScannerDialog({ open, onOpenChange, onScan }: QRScannerDialogProps) {
  const scannerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"camera" | "upload">("camera");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (open && mode === "camera") {
      startScanning();
    } else {
      stopScanning();
    }

    return () => {
      stopScanning();
    };
  }, [open, mode]);

  const startScanning = async () => {
    try {
      setError(null);
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" }, // Use back camera
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          // Success callback
          toast.success("QR detectado!");
          onScan(decodedText);
          onOpenChange(false);
        },
        (errorMessage) => {
          // Error callback (mostly "No QR code found" - ignore)
          // Only show real errors
        }
      );

      setIsScanning(true);
    } catch (err) {
      console.error("Error starting scanner:", err);
      setError("No se pudo acceder a la cámara. Verifica los permisos o usa la opción 'Subir Imagen'.");
      toast.error("Error al iniciar cámara");
      // Auto-switch to upload mode if camera fails
      setMode("upload");
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
        setIsScanning(false);
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("qr-file-reader");
      const decodedText = await scanner.scanFile(file, true);

      toast.success("QR detectado desde imagen!");
      onScan(decodedText);
      onOpenChange(false);
    } catch (err) {
      console.error("Error reading QR from file:", err);
      setError("No se pudo detectar un código QR en esta imagen. Asegúrate de que la imagen sea clara.");
      toast.error("No se detectó código QR");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Escanear Código QR
          </DialogTitle>
          <DialogDescription>
            Elige cómo escanear el código QR
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as "camera" | "upload")} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="camera">
              <Camera className="mr-2 h-4 w-4" />
              Cámara
            </TabsTrigger>
            <TabsTrigger value="upload">
              <ImageIcon className="mr-2 h-4 w-4" />
              Subir Imagen
            </TabsTrigger>
          </TabsList>

          <TabsContent value="camera" className="space-y-4">
            {error && mode === "camera" && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div id="qr-reader" className="rounded-lg overflow-hidden border min-h-[200px]" />

            <p className="text-xs text-muted-foreground text-center">
              Apunta la cámara hacia el código QR del producto
            </p>
          </TabsContent>

          <TabsContent value="upload" className="space-y-4">
            {error && mode === "upload" && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="border-2 border-dashed rounded-lg p-6 text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload className="h-6 w-6 text-primary" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="qr-file" className="text-sm font-medium cursor-pointer">
                  Sube una imagen con el código QR
                </Label>
                <p className="text-xs text-muted-foreground">
                  Formatos: JPG, PNG, WEBP (máx 10MB)
                </p>
              </div>

              <Input
                ref={fileInputRef}
                id="qr-file"
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={isProcessing}
                className="cursor-pointer"
              />

              {isProcessing && (
                <p className="text-sm text-muted-foreground">Procesando imagen...</p>
              )}
            </div>

            {/* Hidden div for file scanning */}
            <div id="qr-file-reader" className="hidden" />
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
