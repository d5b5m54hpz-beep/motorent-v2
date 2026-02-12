"use client";

import { useState, useCallback } from "react";
import { Upload, FileText, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import type { OCRResponse } from "./types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDataExtracted: (data: OCRResponse["data"]) => void;
};

export function OCRUploadDialog({ open, onOpenChange, onDataExtracted }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<OCRResponse["data"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleReset = () => {
    setFile(null);
    setProgress(0);
    setResult(null);
    setError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "application/pdf"];
    if (!allowedTypes.includes(selectedFile.type)) {
      toast.error("Tipo de archivo no soportado. Use PNG, JPG o PDF.");
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (selectedFile.size > maxSize) {
      toast.error("Archivo muy grande. Máximo 5MB.");
      return;
    }

    handleReset();
    setFile(selectedFile);
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (!droppedFile) return;

    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "application/pdf"];
    if (!allowedTypes.includes(droppedFile.type)) {
      toast.error("Tipo de archivo no soportado. Use PNG, JPG o PDF.");
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (droppedFile.size > maxSize) {
      toast.error("Archivo muy grande. Máximo 5MB.");
      return;
    }

    handleReset();
    setFile(droppedFile);
  }, []);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const processOCR = async () => {
    if (!file) return;

    setIsProcessing(true);
    setProgress(10);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      setProgress(30);

      const res = await fetch("/api/documents/ocr", {
        method: "POST",
        body: formData,
      });

      setProgress(70);

      const json: OCRResponse = await res.json();

      if (!res.ok) {
        throw new Error(json.data as unknown as string ?? "Error al procesar documento");
      }

      setProgress(100);
      setResult(json.data);
      toast.success(`Datos extraídos con ${json.data.confianza}% de confianza`);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Error al procesar documento";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUseData = () => {
    if (!result) return;
    onDataExtracted(result);
    onOpenChange(false);
    handleReset();
  };

  const handleClose = () => {
    onOpenChange(false);
    handleReset();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Extraer datos con OCR</DialogTitle>
          <DialogDescription>
            Subí una imagen o PDF de la factura para extraer los datos automáticamente usando IA
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!file ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
            >
              <input
                type="file"
                id="ocr-file-input"
                accept="image/png,image/jpeg,image/jpg,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="ocr-file-input" className="cursor-pointer">
                <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm font-medium mb-1">Arrastrá un archivo o hacé clic para seleccionar</p>
                <p className="text-xs text-muted-foreground">PNG, JPG o PDF (máx. 5MB)</p>
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted/30">
                <FileText className="h-8 w-8 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                {!isProcessing && !result && (
                  <Button variant="ghost" size="sm" onClick={handleReset}>
                    Cambiar
                  </Button>
                )}
              </div>

              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm font-medium">Procesando con Claude Vision...</span>
                  </div>
                  <Progress value={progress} />
                </div>
              )}

              {result && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-teal-600" />
                    <span className="font-medium text-teal-600">Datos extraídos correctamente</span>
                    <Badge variant="outline" className="ml-auto">
                      {result.confianza}% confianza
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm p-4 bg-muted/30 rounded-lg">
                    <div>
                      <p className="text-muted-foreground">Proveedor</p>
                      <p className="font-medium">{result.razonSocial}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Tipo</p>
                      <p className="font-medium">{result.tipo}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Número</p>
                      <p className="font-medium">{result.numero}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total</p>
                      <p className="font-medium">${result.total.toFixed(2)}</p>
                    </div>
                  </div>

                  {result.notas && (
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-900 rounded-lg">
                      <p className="text-xs font-medium text-yellow-800 dark:text-yellow-200">
                        Nota: {result.notas}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 rounded-lg">
                  <XCircle className="h-5 w-5 text-red-600 shrink-0" />
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              <div className="flex gap-2 justify-end">
                {!result && !isProcessing && (
                  <>
                    <Button variant="outline" onClick={handleClose}>
                      Cancelar
                    </Button>
                    <Button onClick={processOCR}>
                      Procesar
                    </Button>
                  </>
                )}
                {result && (
                  <>
                    <Button variant="outline" onClick={handleReset}>
                      Volver a intentar
                    </Button>
                    <Button onClick={handleUseData}>
                      Usar estos datos
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
