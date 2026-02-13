"use client";

import { useEffect, useState } from "react";
import { Package, PackageCheck, Send, XCircle } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { formatCurrency } from "@/lib/utils";

type OrdenCompraDetalle = {
  id: string;
  numero: string;
  estado: string;
  subtotal: number;
  iva: number;
  total: number;
  fechaEmision: string;
  fechaEntregaEstimada: string | null;
  notas: string | null;
  proveedor: { nombre: string; email: string | null };
  items: Array<{
    id: string;
    cantidad: number;
    cantidadRecibida: number;
    precioUnitario: number;
    repuesto: { nombre: string; codigo: string | null };
  }>;
  recepciones: Array<{ numero: string; fechaRecepcion: string }>;
};

type DetalleOCSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ordenId: string | null;
  onRefresh: () => void;
};

const ESTADO_BADGES: Record<string, { label: string; className: string }> = {
  BORRADOR: { label: "🔵 BORRADOR", className: "bg-blue-50 text-blue-700 border-blue-200" },
  PENDIENTE: { label: "🟡 PENDIENTE", className: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  PARCIAL: { label: "🟠 PARCIAL", className: "bg-orange-50 text-orange-700 border-orange-200" },
  COMPLETADA: { label: "🟢 COMPLETADA", className: "bg-green-50 text-green-700 border-green-200" },
  CANCELADA: { label: "⚫ CANCELADA", className: "bg-gray-50 text-gray-700 border-gray-200" },
};

export function DetalleOCSheet({ open, onOpenChange, ordenId, onRefresh }: DetalleOCSheetProps) {
  const [orden, setOrden] = useState<OrdenCompraDetalle | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && ordenId) {
      fetchDetalle();
    }
  }, [open, ordenId]);

  const fetchDetalle = async () => {
    if (!ordenId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/ordenes-compra/${ordenId}`);
      if (!res.ok) throw new Error("Error fetching OC");
      const json = await res.json();
      setOrden(json);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar orden");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeEstado = async (estado: string) => {
    if (!ordenId) return;
    try {
      const res = await fetch(`/api/ordenes-compra/${ordenId}/estado`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }
      toast.success(`Estado cambiado a ${estado}`);
      fetchDetalle();
      onRefresh();
    } catch (error) {
      console.error("Error:", error);
      toast.error(error instanceof Error ? error.message : "Error al cambiar estado");
    }
  };

  if (!orden && isLoading) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </SheetHeader>
          <div className="space-y-4 mt-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  if (!orden) return null;

  const estadoBadge = ESTADO_BADGES[orden.estado] || ESTADO_BADGES.BORRADOR;
  const totalItems = orden.items.reduce((sum, i) => sum + i.cantidad, 0);
  const totalRecibidos = orden.items.reduce((sum, i) => sum + i.cantidadRecibida, 0);
  const progreso = totalItems > 0 ? (totalRecibidos / totalItems) * 100 : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {orden.numero}
          </SheetTitle>
          <SheetDescription>
            {orden.proveedor.nombre}
            {orden.proveedor.email && <> • {orden.proveedor.email}</>}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Estado y Fechas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Estado</p>
              <Badge variant="outline" className={estadoBadge.className}>
                {estadoBadge.label}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Fecha emisión</p>
              <p className="text-sm font-medium">
                {format(new Date(orden.fechaEmision), "dd/MM/yyyy", { locale: es })}
              </p>
            </div>
            {orden.fechaEntregaEstimada && (
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground mb-1">Entrega estimada</p>
                <p className="text-sm font-medium">
                  {format(new Date(orden.fechaEntregaEstimada), "dd/MM/yyyy", { locale: es })}
                </p>
              </div>
            )}
          </div>

          {/* Progreso */}
          {orden.estado !== "BORRADOR" && orden.estado !== "CANCELADA" && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">
                  Progreso de recepción
                </p>
                <p className="text-sm text-muted-foreground">
                  {totalRecibidos} de {totalItems} items
                </p>
              </div>
              <Progress value={progreso} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {progreso.toFixed(0)}% completado
              </p>
            </div>
          )}

          {/* Items */}
          <div>
            <p className="text-sm font-medium mb-2">Items</p>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-2">Repuesto</th>
                    <th className="text-right p-2 w-20">Pedido</th>
                    <th className="text-right p-2 w-20">Recibido</th>
                    <th className="text-right p-2 w-24">Precio</th>
                  </tr>
                </thead>
                <tbody>
                  {orden.items.map((item) => {
                    const pendiente = item.cantidad - item.cantidadRecibida;
                    return (
                      <tr
                        key={item.id}
                        className={`border-t ${pendiente > 0 ? "bg-yellow-50/50" : ""}`}
                      >
                        <td className="p-2">
                          <div>
                            <div className="font-medium">{item.repuesto.nombre}</div>
                            {item.repuesto.codigo && (
                              <div className="text-xs text-muted-foreground font-mono">
                                {item.repuesto.codigo}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-2 text-right">{item.cantidad}</td>
                        <td className="p-2 text-right font-medium">
                          {item.cantidadRecibida}
                          {pendiente > 0 && (
                            <span className="text-xs text-yellow-700 ml-1">
                              (-{pendiente})
                            </span>
                          )}
                        </td>
                        <td className="p-2 text-right">{formatCurrency(item.precioUnitario)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recepciones */}
          {orden.recepciones.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Recepciones</p>
              <div className="space-y-2">
                {orden.recepciones.map((rec, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm p-2 bg-muted rounded">
                    <PackageCheck className="h-4 w-4 text-green-600" />
                    <span className="font-mono">{rec.numero}</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground">
                      {format(new Date(rec.fechaRecepcion), "dd/MM/yyyy HH:mm", { locale: es })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notas */}
          {orden.notas && (
            <div>
              <p className="text-sm font-medium mb-1">Notas</p>
              <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                {orden.notas}
              </p>
            </div>
          )}

          {/* Totales */}
          <div className="border-t pt-4">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-medium">{formatCurrency(orden.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>IVA (21%):</span>
                <span className="font-medium">{formatCurrency(orden.iva)}</span>
              </div>
              <div className="flex justify-between text-base font-bold border-t pt-1">
                <span>Total:</span>
                <span>{formatCurrency(orden.total)}</span>
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div className="border-t pt-4 space-y-2">
            {orden.estado === "BORRADOR" && (
              <Button
                className="w-full"
                onClick={() => handleChangeEstado("PENDIENTE")}
              >
                <Send className="mr-2 h-4 w-4" />
                Enviar a Proveedor
              </Button>
            )}

            {(orden.estado === "PENDIENTE" || orden.estado === "PARCIAL") && (
              <Button
                className="w-full"
                onClick={() => toast.info("Registrar recepción - Abrir desde tab Recepciones")}
              >
                <PackageCheck className="mr-2 h-4 w-4" />
                Registrar Recepción
              </Button>
            )}

            {(orden.estado === "BORRADOR" || orden.estado === "PENDIENTE") && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleChangeEstado("CANCELADA")}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Cancelar Orden
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
