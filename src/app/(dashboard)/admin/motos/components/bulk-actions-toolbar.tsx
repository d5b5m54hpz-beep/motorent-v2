"use client";

import { X, ChevronDown, Image as ImageIcon, Trash2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type BulkActionsToolbarProps = {
  selectedCount: number;
  onChangeState: () => void;
  onChangeImage: () => void;
  onDelete: () => void;
  onExport: () => void;
  onDeselect: () => void;
};

export function BulkActionsToolbar({
  selectedCount,
  onChangeState,
  onChangeImage,
  onDelete,
  onExport,
  onDeselect,
}: BulkActionsToolbarProps) {
  return (
    <div className="sticky top-16 z-10 flex items-center justify-between gap-4 rounded-lg border bg-cyan-50 p-4 shadow-sm dark:bg-cyan-950/20">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500 text-sm font-bold text-white">
          {selectedCount}
        </div>
        <span className="text-sm font-medium">
          {selectedCount} moto{selectedCount !== 1 ? "s" : ""} seleccionada{selectedCount !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Cambiar Estado
              <ChevronDown className="ml-1 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onChangeState}>
              Cambiar estado masivo
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="outline" size="sm" onClick={onChangeImage}>
          <ImageIcon className="mr-1 h-4 w-4" />
          Cambiar Imagen
        </Button>

        <Button variant="outline" size="sm" onClick={onExport}>
          <Download className="mr-1 h-4 w-4" />
          Exportar
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onDelete}
          className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
        >
          <Trash2 className="mr-1 h-4 w-4" />
          Eliminar
        </Button>

        <Button variant="ghost" size="sm" onClick={onDeselect}>
          <X className="mr-1 h-4 w-4" />
          Deseleccionar
        </Button>
      </div>
    </div>
  );
}
