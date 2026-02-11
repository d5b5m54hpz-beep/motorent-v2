"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  archivoUrl: string;
  archivoNombre: string;
};

export function PreviewFacturaDialog({ open, onOpenChange, archivoUrl, archivoNombre }: Props) {
  const [imageError, setImageError] = useState(false);

  const isPDF = archivoNombre?.toLowerCase().endsWith('.pdf');
  const isImage = !isPDF && (
    archivoNombre?.toLowerCase().endsWith('.jpg') ||
    archivoNombre?.toLowerCase().endsWith('.jpeg') ||
    archivoNombre?.toLowerCase().endsWith('.png')
  );

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = archivoUrl;
    link.download = archivoNombre;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Factura Original</span>
            <Button onClick={handleDownload} variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Descargar
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[calc(90vh-8rem)]">
          {isPDF ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center p-12 bg-muted rounded-lg">
                <div className="text-center space-y-3">
                  <FileText className="h-16 w-16 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Archivo PDF: {archivoNombre}
                  </p>
                  <Button onClick={handleDownload} variant="default">
                    <Download className="mr-2 h-4 w-4" />
                    Descargar PDF
                  </Button>
                </div>
              </div>

              {/* Embed PDF viewer */}
              <iframe
                src={archivoUrl}
                className="w-full h-[600px] border rounded-lg"
                title="PDF Viewer"
              />
            </div>
          ) : isImage ? (
            imageError ? (
              <div className="flex items-center justify-center p-12 bg-muted rounded-lg">
                <div className="text-center space-y-3">
                  <FileText className="h-16 w-16 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No se pudo cargar la imagen
                  </p>
                  <Button onClick={handleDownload} variant="default">
                    <Download className="mr-2 h-4 w-4" />
                    Descargar archivo
                  </Button>
                </div>
              </div>
            ) : (
              <div className="relative w-full min-h-[400px] bg-muted rounded-lg flex items-center justify-center">
                <Image
                  src={archivoUrl}
                  alt={archivoNombre}
                  width={800}
                  height={1000}
                  className="max-w-full h-auto rounded-lg"
                  onError={() => setImageError(true)}
                />
              </div>
            )
          ) : (
            <div className="flex items-center justify-center p-12 bg-muted rounded-lg">
              <div className="text-center space-y-3">
                <FileText className="h-16 w-16 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Archivo: {archivoNombre}
                </p>
                <Button onClick={handleDownload} variant="default">
                  <Download className="mr-2 h-4 w-4" />
                  Descargar
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
