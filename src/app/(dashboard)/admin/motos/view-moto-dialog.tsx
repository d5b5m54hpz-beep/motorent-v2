"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import type { Moto } from "./types";

const estadoBadgeMap: Record<string, { label: string; className: string }> = {
  EN_DEPOSITO: {
    label: "En Depósito",
    className: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  },
  EN_PATENTAMIENTO: {
    label: "Patentando",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  },
  DISPONIBLE: {
    label: "Disponible",
    className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  },
  RESERVADA: {
    label: "Reservada",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  },
  ALQUILADA: {
    label: "Alquilada",
    className: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300",
  },
  EN_SERVICE: {
    label: "En Service",
    className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  },
  EN_REPARACION: {
    label: "En Reparación",
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  },
  INMOVILIZADA: {
    label: "Inmovilizada",
    className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  },
  RECUPERACION: {
    label: "Recuperación",
    className: "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-300",
  },
  BAJA_TEMP: {
    label: "Baja Temporal",
    className: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-300",
  },
  BAJA_DEFINITIVA: {
    label: "Baja Definitiva",
    className: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300",
  },
  TRANSFERIDA: {
    label: "Transferida",
    className: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300",
  },
};

type Props = {
  moto: Moto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ViewMotoDialog({ moto, open, onOpenChange }: Props) {
  if (!moto) return null;

  const badge = estadoBadgeMap[moto.estado] ?? { label: moto.estado, className: "" };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {moto.marca} {moto.modelo}
          </DialogTitle>
        </DialogHeader>

        {moto.imagen && (
          <img
            src={moto.imagen}
            alt={`${moto.marca} ${moto.modelo}`}
            className="h-48 w-full rounded-md object-cover"
          />
        )}

        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <span className="text-muted-foreground">Patente: </span>
            <span className="font-mono">{moto.patente}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Año: </span>
            {moto.anio}
          </div>
          <div>
            <span className="text-muted-foreground">Color: </span>
            {moto.color ?? "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Cilindrada: </span>
            {moto.cilindrada ? `${moto.cilindrada} cc` : "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Kilometraje: </span>
            {moto.kilometraje.toLocaleString("es-AR")} km
          </div>
          <div>
            <span className="text-muted-foreground">Precio Mensual: </span>
            {formatCurrency(moto.precioMensual)}
          </div>
          <div>
            <span className="text-muted-foreground">Tipo: </span>
            {moto.tipo ? moto.tipo.charAt(0).toUpperCase() + moto.tipo.slice(1) : "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Estado: </span>
            <Badge variant="outline" className={badge.className}>
              {badge.label}
            </Badge>
          </div>
        </div>

        {moto.descripcion && (
          <>
            <Separator />
            <div className="text-sm">
              <span className="text-muted-foreground">Descripcion:</span>
              <p className="mt-1">{moto.descripcion}</p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
