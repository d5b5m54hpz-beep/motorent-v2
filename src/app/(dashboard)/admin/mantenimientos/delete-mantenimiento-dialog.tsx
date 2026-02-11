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
import type { Mantenimiento } from "./types";

type Props = {
  mantenimiento: Mantenimiento | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading: boolean;
};

export function DeleteMantenimientoDialog({
  mantenimiento,
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: Props) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar mantenimiento</AlertDialogTitle>
          <AlertDialogDescription>
            ¿Estás seguro de eliminar el mantenimiento de{" "}
            <span className="font-semibold">
              {mantenimiento?.moto.marca} {mantenimiento?.moto.modelo}
            </span>{" "}
            ({mantenimiento?.moto.patente})? Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? "Eliminando..." : "Eliminar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
