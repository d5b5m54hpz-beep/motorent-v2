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
import { formatCurrency } from "@/lib/utils";
import type { AsientoContable } from "./types";

type Props = {
  asiento: AsientoContable | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading: boolean;
};

export function DeleteAsientoDialog({ asiento, open, onOpenChange, onConfirm, isLoading }: Props) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar asiento contable</AlertDialogTitle>
          <AlertDialogDescription>
            ¿Estás seguro de eliminar el asiento{" "}
            <span className="font-semibold">#{asiento?.numero}</span>{" "}
            ({asiento?.tipo}) por {formatCurrency(asiento?.totalDebe ?? 0)}?
            <br />
            <span className="font-semibold">{asiento?.descripcion}</span>
            <br /><br />
            Esta acción eliminará también las {asiento?.lineas.length} líneas del asiento y no se puede deshacer.
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
