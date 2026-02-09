"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Pago } from "./types";

type PagoDetallado = Pago & {
  contrato: Pago["contrato"] & {
    pagos?: Array<{
      id: string;
      monto: number;
      estado: string;
      vencimientoAt: string | null;
    }>;
  };
};

const estadoBadgeMap: Record<string, { label: string; className: string }> = {
  pendiente: {
    label: "Pendiente",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  },
  aprobado: {
    label: "Aprobado",
    className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  },
  rechazado: {
    label: "Rechazado",
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  },
  reembolsado: {
    label: "Reembolsado",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  },
  cancelado: {
    label: "Cancelado",
    className: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  },
};

type Props = {
  pago: Pago | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ViewPagoDialog({ pago, open, onOpenChange }: Props) {
  const [pagoDetallado, setPagoDetallado] = useState<PagoDetallado | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && pago) {
      setIsLoading(true);
      fetch(`/api/pagos/${pago.id}`)
        .then((res) => res.json())
        .then((data) => {
          setPagoDetallado(data);
        })
        .catch((err) => {
          console.error("Error loading pago details:", err);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setPagoDetallado(null);
    }
  }, [open, pago]);

  const data = pagoDetallado || pago;

  if (!data) return null;

  const badge = estadoBadgeMap[data.estado] ?? {
    label: data.estado,
    className: "",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalle del Pago</DialogTitle>
          <DialogDescription>
            Información completa del pago #{data.id.slice(-8)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Estado */}
          <div>
            <Badge variant="outline" className={badge.className}>
              {badge.label}
            </Badge>
          </div>

          <Separator />

          {/* Info del Pago */}
          <div>
            <h3 className="font-semibold mb-3">Información del Pago</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Monto:</span>
                <p className="text-lg font-bold">{formatCurrency(data.monto)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Método:</span>
                <p className="font-medium capitalize">{data.metodo}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Fecha Vencimiento:</span>
                <p>
                  {data.vencimientoAt
                    ? formatDate(new Date(data.vencimientoAt))
                    : "—"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Fecha Pago:</span>
                <p>
                  {data.pagadoAt ? formatDate(new Date(data.pagadoAt)) : "—"}
                </p>
              </div>
              {data.referencia && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Referencia:</span>
                  <p className="font-mono text-sm">{data.referencia}</p>
                </div>
              )}
              {data.mpPaymentId && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">MercadoPago ID:</span>
                  <p className="font-mono text-sm">{data.mpPaymentId}</p>
                </div>
              )}
              {data.comprobante && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Comprobante:</span>
                  <p className="text-sm break-all">{data.comprobante}</p>
                </div>
              )}
              {data.notas && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Notas:</span>
                  <p className="text-sm">{data.notas}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Info del Cliente */}
          <div>
            <h3 className="font-semibold mb-3">Cliente</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Nombre:</span>
                <p>
                  {data.contrato.cliente.nombre ||
                    data.contrato.cliente.user.name ||
                    "—"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Email:</span>
                <p className="text-sm">{data.contrato.cliente.email}</p>
              </div>
              {data.contrato.cliente.dni && (
                <div>
                  <span className="text-muted-foreground">DNI:</span>
                  <p>{data.contrato.cliente.dni}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Info de la Moto */}
          <div>
            <h3 className="font-semibold mb-3">Moto</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Modelo:</span>
                <p className="font-medium">
                  {data.contrato.moto.marca} {data.contrato.moto.modelo}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Patente:</span>
                <p className="font-mono">{data.contrato.moto.patente}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Info del Contrato */}
          <div>
            <h3 className="font-semibold mb-3">Contrato</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">ID:</span>
                <p className="font-mono text-xs">{data.contratoId}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Estado:</span>
                <p className="capitalize">{data.contrato.estado}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Fecha Inicio:</span>
                <p>{formatDate(new Date(data.contrato.fechaInicio))}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Fecha Fin:</span>
                <p>{formatDate(new Date(data.contrato.fechaFin))}</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
