"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Contrato } from "./types";

type ContratoDetalle = Contrato & {
  pagos: Array<{
    id: string;
    monto: number;
    estado: string;
    vencimientoAt: string | null;
    pagadoAt: string | null;
  }>;
};

const estadoBadgeMap: Record<string, { label: string; className: string }> = {
  pendiente: {
    label: "Pendiente",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  },
  activo: {
    label: "Activo",
    className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  },
  finalizado: {
    label: "Finalizado",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  },
  cancelado: {
    label: "Cancelado",
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  },
};

const pagoBadgeMap: Record<string, { label: string; className: string }> = {
  pendiente: {
    label: "Pendiente",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  },
  pagado: {
    label: "Pagado",
    className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  },
  vencido: {
    label: "Vencido",
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  },
  cancelado: {
    label: "Cancelado",
    className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  },
};

type Props = {
  contrato: Contrato | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ViewContratoDialog({ contrato, open, onOpenChange }: Props) {
  const [detalle, setDetalle] = useState<ContratoDetalle | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && contrato) {
      setLoading(true);
      fetch(`/api/contratos/${contrato.id}`)
        .then((res) => res.json())
        .then((data) => setDetalle(data))
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    } else {
      setDetalle(null);
    }
  }, [open, contrato]);

  if (!contrato) return null;

  const badge = estadoBadgeMap[contrato.estado] ?? { label: contrato.estado, className: "" };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalle del contrato</DialogTitle>
        </DialogHeader>

        {/* Info del contrato */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <span className="text-muted-foreground">Cliente:</span>{" "}
            <span className="font-medium">{contrato.cliente.nombre || contrato.cliente.email}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Moto:</span>{" "}
            <span className="font-medium">{contrato.moto.marca} {contrato.moto.modelo}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Fecha inicio:</span>{" "}
            {formatDate(new Date(contrato.fechaInicio))}
          </div>
          <div>
            <span className="text-muted-foreground">Fecha fin:</span>{" "}
            {formatDate(new Date(contrato.fechaFin))}
          </div>
          <div>
            <span className="text-muted-foreground">Frecuencia:</span>{" "}
            <span className="capitalize">{contrato.frecuenciaPago}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Estado:</span>{" "}
            <Badge variant="outline" className={badge.className}>
              {badge.label}
            </Badge>
          </div>
        </div>

        <Separator />

        {/* Montos */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <span className="text-muted-foreground">Monto por período:</span>{" "}
            <span className="font-medium">{formatCurrency(contrato.montoPeriodo)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Monto total:</span>{" "}
            <span className="font-medium">{formatCurrency(contrato.montoTotal)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Depósito:</span>{" "}
            {formatCurrency(contrato.deposito)}
          </div>
          <div>
            <span className="text-muted-foreground">Descuento aplicado:</span>{" "}
            {contrato.descuentoAplicado}%
          </div>
        </div>

        {contrato.notas && (
          <>
            <Separator />
            <div className="text-sm">
              <span className="text-muted-foreground">Notas:</span>
              <p className="mt-1">{contrato.notas}</p>
            </div>
          </>
        )}

        <Separator />

        {/* Tabla de pagos */}
        <div>
          <p className="mb-2 text-sm font-medium">Pagos del contrato</p>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : detalle?.pagos && detalle.pagos.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Pagado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detalle.pagos.map((pago) => {
                    const pagoBadge = pagoBadgeMap[pago.estado] ?? { label: pago.estado, className: "" };
                    return (
                      <TableRow key={pago.id}>
                        <TableCell className="text-sm">
                          {pago.vencimientoAt ? formatDate(new Date(pago.vencimientoAt)) : "—"}
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {formatCurrency(pago.monto)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={pagoBadge.className}>
                            {pagoBadge.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {pago.pagadoAt ? formatDate(new Date(pago.pagadoAt)) : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No hay pagos registrados</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
