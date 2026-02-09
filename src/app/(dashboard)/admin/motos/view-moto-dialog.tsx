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
  disponible: {
    label: "Disponible",
    className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  },
  alquilada: {
    label: "Alquilada",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  },
  mantenimiento: {
    label: "Mantenimiento",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  },
  baja: {
    label: "Baja",
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
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
