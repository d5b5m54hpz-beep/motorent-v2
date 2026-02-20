"use client";

import { X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

type BulkActionsToolbarProps = {
  selectedCount: number;
  onExport: () => void;
  onDeselect: () => void;
};

export function BulkActionsToolbar({
  selectedCount,
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
        <Button variant="outline" size="sm" onClick={onExport}>
          <Download className="mr-1 h-4 w-4" />
          Exportar
        </Button>

        <Button variant="ghost" size="sm" onClick={onDeselect}>
          <X className="mr-1 h-4 w-4" />
          Deseleccionar
        </Button>
      </div>
    </div>
  );
}
