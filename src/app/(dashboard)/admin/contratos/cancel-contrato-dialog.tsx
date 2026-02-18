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
import type { Contrato } from "./types";

type Props = {
  contrato: Contrato | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading: boolean;
};

export function CancelContratoDialog({
  contrato,
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: Props) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancelar contrato</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                ¿Estas seguro de cancelar el contrato con{" "}
                <span className="font-semibold">
                  {contrato?.cliente.nombre || contrato?.cliente.email}
                </span>
                ?
              </p>
              <p>Esta accion:</p>
              <ul className="ml-4 list-disc space-y-1">
                <li>Cambiara el estado del contrato a CANCELADO</li>
                <li>
                  Devolvera la moto {contrato?.moto.marca} {contrato?.moto.modelo}{" "}
                  a estado DISPONIBLE
                </li>
                <li>Cancelara todos los pagos pendientes</li>
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>No cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? "Cancelando..." : "Si, cancelar contrato"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
