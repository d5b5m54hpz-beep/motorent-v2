"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Ausencia } from "./types";

interface DeleteAusenciaDialogProps {
  ausencia: Ausencia | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading: boolean;
}

export function DeleteAusenciaDialog({
  ausencia,
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: DeleteAusenciaDialogProps) {
  if (!ausencia) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar ausencia?</AlertDialogTitle>
          <AlertDialogDescription>
            Se eliminará la ausencia de{" "}
            <span className="font-semibold">
              {ausencia.empleado.apellido}, {ausencia.empleado.nombre}
            </span>{" "}
            del {new Date(ausencia.fechaInicio).toLocaleDateString("es-AR")} al{" "}
            {new Date(ausencia.fechaFin).toLocaleDateString("es-AR")}.
            <br />
            <br />
            Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isLoading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {isLoading ? "Eliminando..." : "Eliminar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
