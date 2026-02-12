'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, Loader2 } from 'lucide-react';
import Image from 'next/image';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  onRemove?: () => void;
  folder?: string;
  className?: string;
}

export function ImageUpload({ value, onChange, onRemove, folder = 'motos', className }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al subir imagen');
      }

      const { url } = await response.json();
      onChange(url);
    } catch (error) {
      console.error('Error uploading:', error);
      alert(error instanceof Error ? error.message : 'Error al subir imagen');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  return (
    <div className={className}>
      {value ? (
        <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-border">
          <Image src={value} alt="Imagen" fill className="object-cover" />
          {onRemove && (
            <button
              type="button"
              onClick={() => { onRemove(); onChange(''); }}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        <div
          className={`
            w-full aspect-video rounded-lg border-2 border-dashed
            flex flex-col items-center justify-center gap-2 cursor-pointer
            transition-colors
            ${dragOver ? 'border-cyan-500 bg-cyan-500/10' : 'border-border hover:border-cyan-500/50'}
            ${isUploading ? 'pointer-events-none opacity-50' : ''}
          `}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-8 w-8 text-cyan-500 animate-spin" />
              <span className="text-sm text-muted-foreground">Subiendo...</span>
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Arrastrá una imagen o hacé click para subir
              </span>
              <span className="text-xs text-muted-foreground">
                JPG, PNG o WebP — máx 5MB
              </span>
            </>
          )}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
