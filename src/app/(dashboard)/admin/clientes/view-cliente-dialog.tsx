"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatDate } from "@/lib/utils";
import type { Cliente } from "./types";

const estadoBadgeMap: Record<string, { label: string; className: string }> = {
  PENDIENTE: {
    label: "Pendiente",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  },
  APROBADO: {
    label: "Aprobado",
    className: "bg-teal-50 text-teal-800 dark:bg-teal-900 dark:text-teal-300",
  },
  RECHAZADO: {
    label: "Rechazado",
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  },
};

function VerificationBadge({ has, verified, labelYes, labelNo, labelNone }: {
  has: boolean;
  verified: boolean;
  labelYes: string;
  labelNo: string;
  labelNone: string;
}) {
  if (!has) {
    return (
      <Badge variant="outline" className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
        {labelNone}
      </Badge>
    );
  }
  if (verified) {
    return (
      <Badge variant="outline" className="bg-teal-50 text-teal-800 dark:bg-teal-900 dark:text-teal-300">
        {labelYes}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
      {labelNo}
    </Badge>
  );
}

type Props = {
  cliente: Cliente | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ViewClienteDialog({ cliente, open, onOpenChange }: Props) {
  if (!cliente) return null;

  const badge = estadoBadgeMap[cliente.estado] ?? { label: cliente.estado, className: "" };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{cliente.nombre ?? "Sin nombre"}</DialogTitle>
        </DialogHeader>

        {/* Datos personales */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <span className="text-muted-foreground">Email: </span>
            {cliente.email}
          </div>
          <div>
            <span className="text-muted-foreground">Telefono: </span>
            {cliente.telefono ?? "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Fecha nacimiento: </span>
            {cliente.fechaNacimiento ? formatDate(new Date(cliente.fechaNacimiento)) : "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Estado: </span>
            <Badge variant="outline" className={badge.className}>
              {badge.label}
            </Badge>
          </div>
        </div>

        <Separator />

        {/* Documento y licencia */}
        <p className="text-sm font-medium text-muted-foreground">Documento y licencia</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <span className="text-muted-foreground">DNI: </span>
            <span className="font-mono">{cliente.dni ?? "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Verificacion DNI: </span>
            <VerificationBadge
              has={!!cliente.dni}
              verified={cliente.dniVerificado}
              labelYes="Verificado"
              labelNo="Pendiente"
              labelNone="Sin DNI"
            />
          </div>
          <div>
            <span className="text-muted-foreground">Licencia: </span>
            {cliente.licencia ?? "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Verificacion licencia: </span>
            <VerificationBadge
              has={!!cliente.licencia}
              verified={cliente.licenciaVerificada}
              labelYes="Verificada"
              labelNo="Pendiente"
              labelNone="Sin licencia"
            />
          </div>
          {cliente.licenciaVencimiento && (
            <div className="col-span-2">
              <span className="text-muted-foreground">Vencimiento licencia: </span>
              {formatDate(new Date(cliente.licenciaVencimiento))}
            </div>
          )}
        </div>

        <Separator />

        {/* Direccion */}
        <p className="text-sm font-medium text-muted-foreground">Direccion</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <span className="text-muted-foreground">Direccion: </span>
            {cliente.direccion ?? "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Ciudad: </span>
            {cliente.ciudad ?? "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Provincia: </span>
            {cliente.provincia ?? "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Codigo postal: </span>
            {cliente.codigoPostal ?? "—"}
          </div>
        </div>

        {/* Contratos */}
        <Separator />
        <div className="text-sm">
          <span className="text-muted-foreground">Contratos totales: </span>
          <span className="font-semibold">{cliente._count.contratos}</span>
        </div>

        {/* Notas */}
        {cliente.notas && (
          <>
            <Separator />
            <div className="text-sm">
              <span className="text-muted-foreground">Notas:</span>
              <p className="mt-1">{cliente.notas}</p>
            </div>
          </>
        )}

        {/* Registro */}
        <Separator />
        <div className="text-xs text-muted-foreground">
          Registrado el {formatDate(new Date(cliente.createdAt))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
