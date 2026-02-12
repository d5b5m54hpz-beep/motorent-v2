"use client";

import { useState, useCallback } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type BulkImageDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  onConfirm: (imageUrl: string) => Promise<void>;
};

export function BulkImageDialog({
  open,
  onOpenChange,
  selectedCount,
  onConfirm,
}: BulkImageDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = useCallback((file: File) => {
    // Validar tipo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Tipo de archivo no permitido. Usar JPG, PNG o WebP.');
      return;
    }

    // Validar tamaño (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('El archivo no puede superar 5MB');
      return;
    }

    setSelectedFile(file);

    // Crear preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files[0]) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files[0]) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleRemove = useCallback(() => {
    setSelectedFile(null);
    setPreviewUrl(null);
  }, []);

  const handleApply = async () => {
    if (!selectedFile) {
      toast.error('Selecciona una imagen primero');
      return;
    }

    setIsUploading(true);
    try {
      // 1. Subir imagen a R2
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('folder', 'motos');

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        const errorData = await uploadRes.json();
        throw new Error(errorData.error || 'Error al subir imagen');
      }

      const { url } = await uploadRes.json();

      // 2. Aplicar imagen a motos
      await onConfirm(url);

      // 3. Limpiar y cerrar
      handleRemove();
      onOpenChange(false);

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al cambiar imagen';
      toast.error(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      handleRemove();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cambiar imagen masivo</DialogTitle>
          <DialogDescription>
            Esta imagen se aplicará a {selectedCount} moto{selectedCount !== 1 ? 's' : ''} seleccionada{selectedCount !== 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload Area */}
          {!previewUrl ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
                isDragging
                  ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/20'
                  : 'border-muted-foreground/25 hover:border-cyan-500/50'
              }`}
            >
              <Upload className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="mb-2 text-sm font-medium">
                Arrastra una imagen aquí o{' '}
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer text-cyan-500 underline hover:text-cyan-600"
                >
                  selecciona un archivo
                </label>
              </p>
              <p className="text-xs text-muted-foreground">
                JPG, PNG o WebP (máx. 5MB)
              </p>
              <input
                id="file-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                className="hidden"
                onChange={handleInputChange}
                disabled={isUploading}
              />
            </div>
          ) : (
            /* Preview */
            <div className="relative">
              <div className="relative aspect-video w-full overflow-hidden rounded-lg border">
                <Image
                  src={previewUrl}
                  alt="Preview"
                  fill
                  className="object-contain"
                />
              </div>
              {!isUploading && (
                <button
                  onClick={handleRemove}
                  className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white transition-colors hover:bg-black/80"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              {selectedFile && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isUploading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleApply}
            disabled={!selectedFile || isUploading}
          >
            {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isUploading ? 'Aplicando...' : 'Aplicar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
