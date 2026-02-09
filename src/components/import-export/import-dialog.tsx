"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Upload, Loader2, FileSpreadsheet, Download, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

type Props = {
  module: "motos" | "clientes";
  label?: string;
  onSuccess?: () => void;
};

type PreviewData = {
  preview: boolean;
  total: number;
  valid: number;
  invalid: number;
  validRows: Array<{ row: number; data: any }>;
  invalidRows: Array<{ row: number; errors: string[]; data: any }>;
};

export function ImportDialog({ module, label = "Importar", onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileSelect = (selectedFile: File) => {
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ];

    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(xlsx|xls|csv)$/)) {
      toast.error("Formato de archivo inválido. Usa .xlsx, .xls o .csv");
      return;
    }

    setFile(selectedFile);
    setPreview(null);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("confirm", "false");

      const res = await fetch(`/api/import/${module}`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al procesar archivo");
      }

      const data = await res.json();
      setPreview(data);
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Error al procesar archivo");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!file || !preview) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("confirm", "true");

      const res = await fetch(`/api/import/${module}`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al importar");
      }

      const data = await res.json();
      toast.success(data.message);
      setOpen(false);
      setFile(null);
      setPreview(null);
      onSuccess?.();
    } catch (error: any) {
      console.error("Import error:", error);
      toast.error(error.message || "Error al importar datos");
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch(`/api/import/${module}/template`);

      if (!res.ok) {
        throw new Error("Error al descargar plantilla");
      }

      const contentDisposition = res.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] || `plantilla_${module}.xlsx`;

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Plantilla descargada");
    } catch (error) {
      console.error("Template download error:", error);
      toast.error("Error al descargar plantilla");
    }
  };

  const handleClose = () => {
    setOpen(false);
    setFile(null);
    setPreview(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar {module === "motos" ? "Motos" : "Clientes"}</DialogTitle>
          <DialogDescription>
            Sube un archivo Excel (.xlsx) o CSV con los datos a importar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Download Template Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownloadTemplate}
            className="w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            Descargar plantilla
          </Button>

          {/* File Upload Area */}
          {!preview && (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {file ? (
                <div className="space-y-2">
                  <FileSpreadsheet className="h-12 w-12 mx-auto text-primary" />
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                  <Button onClick={handleUpload} disabled={loading} className="mt-4">
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      "Procesar archivo"
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                  <p className="font-medium">Arrastra un archivo aquí o haz clic para seleccionar</p>
                  <p className="text-sm text-muted-foreground">
                    Formatos soportados: .xlsx, .xls, .csv
                  </p>
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileInputChange}
                  />
                  <label htmlFor="file-upload">
                    <Button variant="outline" asChild className="mt-4">
                      <span>Seleccionar archivo</span>
                    </Button>
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Preview Section */}
          {preview && (
            <div className="space-y-4">
              {/* Summary */}
              <Alert>
                <AlertTitle>Resumen de importación</AlertTitle>
                <AlertDescription className="mt-2 space-y-1">
                  <p>Total de filas: {preview.total}</p>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Filas válidas: {preview.valid}</span>
                  </div>
                  {preview.invalid > 0 && (
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-destructive" />
                      <span>Filas con errores: {preview.invalid}</span>
                    </div>
                  )}
                </AlertDescription>
              </Alert>

              {/* Valid Rows Preview */}
              {preview.validRows.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">
                    Vista previa (primeras 5 filas válidas)
                  </h4>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fila</TableHead>
                          {Object.keys(preview.validRows[0].data).slice(0, 5).map((key) => (
                            <TableHead key={key}>{key}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {preview.validRows.map((row) => (
                          <TableRow key={row.row}>
                            <TableCell className="font-medium">{row.row}</TableCell>
                            {Object.values(row.data).slice(0, 5).map((value: any, idx) => (
                              <TableCell key={idx}>
                                {typeof value === "boolean"
                                  ? value
                                    ? "Sí"
                                    : "No"
                                  : String(value)}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Invalid Rows */}
              {preview.invalidRows.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-destructive">
                    Filas con errores
                  </h4>
                  <div className="space-y-2">
                    {preview.invalidRows.map((row) => (
                      <Alert key={row.row} variant="destructive">
                        <AlertTitle>Fila {row.row}</AlertTitle>
                        <AlertDescription>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            {row.errors.map((error, idx) => (
                              <li key={idx}>{error}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {preview && (
            <>
              <Button variant="outline" onClick={handleClose} disabled={uploading}>
                Cancelar
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={uploading || preview.valid === 0}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importando...
                  </>
                ) : (
                  `Importar ${preview.valid} registros`
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
