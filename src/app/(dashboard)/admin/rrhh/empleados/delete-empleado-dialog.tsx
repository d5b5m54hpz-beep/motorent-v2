"use client";

import { useState } from "react";
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
import { toast } from "sonner";
import { EmpleadoListItem } from "./types";

type DeleteEmpleadoDialogProps = {
  empleado: EmpleadoListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

export function DeleteEmpleadoDialog({
  empleado,
  open,
  onOpenChange,
  onSuccess,
}: DeleteEmpleadoDialogProps) {
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!empleado) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/rrhh/empleados/${empleado.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al dar de baja empleado");
      }

      toast.success("Empleado dado de baja correctamente");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error:", error);
      toast.error(error instanceof Error ? error.message : "Error al dar de baja empleado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Dar de baja empleado?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción marcará al empleado <strong>{empleado?.nombre} {empleado?.apellido}</strong> como BAJA
            y registrará la fecha de egreso. Los datos se mantendrán en el sistema para historial.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={loading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {loading ? "Procesando..." : "Dar de Baja"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
