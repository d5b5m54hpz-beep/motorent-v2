"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Download, Mail } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Factura } from "./types";

type Props = {
  factura: Factura | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDownloadPDF: (id: string) => void;
  onSendEmail: (id: string) => void;
};

export function ViewFacturaDialog({ factura, open, onOpenChange, onDownloadPDF, onSendEmail }: Props) {
  if (!factura) return null;

  const cliente = factura.pago.contrato.cliente;
  const moto = factura.pago.contrato.moto;
  const contrato = factura.pago.contrato;
  const numeroCompleto = `${String(factura.puntoVenta).padStart(4, "0")}-${factura.numero}`;
  const clienteNombre = cliente.nombre || cliente.user.name;

  const tipoBadgeColors: Record<string, string> = {
    A: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    B: "bg-teal-50 text-teal-800 dark:bg-teal-900 dark:text-teal-300",
    C: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Factura {numeroCompleto}</span>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={tipoBadgeColors[factura.tipo]}>
                Tipo {factura.tipo}
              </Badge>
              {factura.emitida ? (
                <Badge className="bg-teal-600 dark:bg-teal-700">Emitida</Badge>
              ) : (
                <Badge variant="secondary">Pendiente</Badge>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Información de la Factura */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold tracking-tight">Información de la Factura</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Número: </span>
                <span className="font-mono">{numeroCompleto}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Fecha: </span>
                {formatDate(new Date(factura.createdAt))}
              </div>
              <div>
                <span className="text-muted-foreground">Punto de Venta: </span>
                {factura.puntoVenta}
              </div>
              <div>
                <span className="text-muted-foreground">Tipo: </span>
                {factura.tipo}
              </div>
              {factura.cae && (
                <>
                  <div>
                    <span className="text-muted-foreground">CAE: </span>
                    <span className="font-mono text-xs">{factura.cae}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Vencimiento CAE: </span>
                    {factura.caeVencimiento ? formatDate(new Date(factura.caeVencimiento)) : "—"}
                  </div>
                </>
              )}
            </div>
          </div>

          <Separator />

          {/* Datos del Cliente */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold tracking-tight">Datos del Cliente</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Nombre: </span>
                {factura.razonSocial || clienteNombre}
              </div>
              <div>
                <span className="text-muted-foreground">CUIT/DNI: </span>
                {factura.cuit || cliente.dni || "—"}
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Email: </span>
                {cliente.user.email}
              </div>
              {cliente.direccion && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Dirección: </span>
                  {cliente.direccion}
                  {cliente.ciudad && `, ${cliente.ciudad}`}
                  {cliente.provincia && `, ${cliente.provincia}`}
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Detalle del Servicio */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold tracking-tight">Detalle del Servicio</h3>
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <p className="font-medium mb-1">
                Alquiler de moto {moto.marca} {moto.modelo}
              </p>
              <p className="text-xs text-muted-foreground mb-1">
                Patente: <span className="font-mono">{moto.patente}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Período: {formatDate(new Date(contrato.fechaInicio))} al{" "}
                {formatDate(new Date(contrato.fechaFin))}
              </p>
            </div>
          </div>

          <Separator />

          {/* Montos */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold tracking-tight">Montos</h3>
            <div className="space-y-1 text-sm">
              {factura.tipo === "A" ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span>{formatCurrency(factura.montoNeto)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">IVA 21%:</span>
                    <span>{formatCurrency(factura.montoIva)}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between text-base font-bold">
                    <span>TOTAL:</span>
                    <span className="text-primary">{formatCurrency(factura.montoTotal)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-base font-bold">
                  <span>TOTAL:</span>
                  <span className="text-primary">{formatCurrency(factura.montoTotal)}</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Email Status */}
          {factura.emailEnviado && factura.emailEnviadoAt && (
            <div className="rounded-lg bg-teal-50 dark:bg-teal-950 p-3 text-sm">
              <p className="text-teal-700 dark:text-teal-300 font-medium">
                ✓ Factura enviada por email
              </p>
              <p className="text-xs text-teal-600 dark:text-teal-400 mt-1">
                Enviado el {formatDate(new Date(factura.emailEnviadoAt))} a {cliente.user.email}
              </p>
            </div>
          )}

          {/* Botones */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onSendEmail(factura.id)}
              className="gap-2"
            >
              <Mail className="h-4 w-4" />
              {factura.emailEnviado ? "Reenviar al Cliente" : "Enviar al Cliente"}
            </Button>
            <Button
              onClick={() => onDownloadPDF(factura.id)}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Descargar PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
