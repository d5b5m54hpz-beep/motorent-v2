"use client";

import { useState, useRef } from "react";
import { Upload, Download, CheckCircle, XCircle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import Papa from "papaparse";
import { importRepuestoSchema } from "@/lib/validations";

type ImportRow = {
  valid: boolean;
  data: Record<string, unknown>;
  error?: string;
  rowNumber: number;
};

type ImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

export function ImportDialog({ open, onOpenChange, onSuccess }: ImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch("/api/repuestos/template");
      if (!res.ok) throw new Error("Error downloading template");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "template-repuestos.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Template descargado");
    } catch (error) {
      console.error("Error downloading template:", error);
      toast.error("Error al descargar template");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith(".csv")) {
      toast.error("Por favor sube un archivo CSV");
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error("El archivo no debe superar 5MB");
      return;
    }

    setFile(selectedFile);
    parseCSV(selectedFile);
  };

  const parseCSV = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows: ImportRow[] = results.data.map((row: unknown, index: number) => {
          const parsed = importRepuestoSchema.safeParse(row);
          return {
            valid: parsed.success,
            data: row as Record<string, unknown>,
            error: parsed.success ? undefined : parsed.error.errors[0]?.message,
            rowNumber: index + 2, // +2 because of 0-index and header row
          };
        });
        setPreview(rows);
      },
      error: (error) => {
        console.error("CSV parse error:", error);
        toast.error("Error al parsear el CSV");
      },
    });
  };

  const handleImport = async () => {
    const validRows = preview.filter((r) => r.valid).map((r) => r.data);
    if (validRows.length === 0) {
      toast.error("No hay filas válidas para importar");
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch("/api/import/repuestos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repuestos: validRows }),
      });

      if (!res.ok) throw new Error("Error importing");

      const result = await res.json();
      toast.success(
        `Importación exitosa: ${result.creados} creados, ${result.actualizados} actualizados${
          result.errores > 0 ? `, ${result.errores} errores` : ""
        }`
      );
      onSuccess();
      handleClose();
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Error al importar repuestos");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreview([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onOpenChange(false);
  };

  const validCount = preview.filter((r) => r.valid).length;
  const invalidCount = preview.filter((r) => !r.valid).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Repuestos</DialogTitle>
          <DialogDescription>
            Importa repuestos desde un archivo CSV con el formato correcto
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step 1: Download Template */}
          <div>
            <h3 className="text-sm font-medium mb-2">1. Descargá el template CSV</h3>
            <Button variant="outline" onClick={handleDownloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Descargar Template CSV
            </Button>
          </div>

          {/* Step 2: Upload File */}
          <div>
            <h3 className="text-sm font-medium mb-2">2. Completá el archivo y subilo acá</h3>
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-1">
                {file ? file.name : "Arrastrá un archivo CSV o hacé click"}
              </p>
              <p className="text-xs text-muted-foreground">Formato: .csv | Máximo: 5MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>

          {/* Step 3: Preview */}
          {preview.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2">3. Preview de datos</h3>
              <div className="border rounded-lg max-h-64 overflow-y-auto">
                <div className="space-y-1 p-3">
                  {preview.map((row) => (
                    <div
                      key={row.rowNumber}
                      className={`flex items-start gap-2 text-sm p-2 rounded ${
                        row.valid ? "bg-green-50" : "bg-red-50"
                      }`}
                    >
                      {row.valid ? (
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        {row.valid ? (
                          <span className="text-green-800">
                            Fila {row.rowNumber}: {String(row.data.nombre)}
                            {row.data.codigo ? ` - ${String(row.data.codigo)}` : ""}
                          </span>
                        ) : (
                          <>
                            <span className="text-red-800 font-medium">
                              Fila {row.rowNumber}: Error
                            </span>
                            <p className="text-xs text-red-700 mt-0.5">{row.error}</p>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between mt-4">
                <div className="flex gap-2">
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    ✓ {validCount} válidos
                  </Badge>
                  {invalidCount > 0 && (
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                      ✗ {invalidCount} con errores
                    </Badge>
                  )}
                </div>

                <Button
                  onClick={handleImport}
                  disabled={validCount === 0 || isProcessing}
                >
                  {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isProcessing ? "Importando..." : `Importar ${validCount}`}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
