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
import type { Proveedor } from "./types";

type Props = {
  proveedor: Proveedor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading: boolean;
};

export function DeleteProveedorDialog({
  proveedor,
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: Props) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar proveedor</AlertDialogTitle>
          <AlertDialogDescription>
            ¿Estás seguro de eliminar al proveedor{" "}
            <span className="font-semibold">{proveedor?.nombre}</span>?
            {proveedor && (proveedor._count.mantenimientos > 0 || proveedor._count.repuestos > 0) && (
              <span className="block mt-2 text-destructive">
                Este proveedor tiene {proveedor._count.mantenimientos} mantenimientos
                y {proveedor._count.repuestos} repuestos asociados. No se podrá eliminar.
              </span>
            )}
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
