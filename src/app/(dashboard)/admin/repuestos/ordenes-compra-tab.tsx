"use client";

import { useState, useEffect } from "react";
import { Plus, MoreHorizontal, Eye, Pencil, Send, PackageCheck, XCircle, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { formatCurrency } from "@/lib/utils";
import { CrearOCDialog } from "./crear-oc-dialog";
import { DetalleOCSheet } from "./detalle-oc-sheet";

type OrdenCompra = {
  id: string;
  numero: string;
  estado: string;
  total: number;
  fechaEmision: string;
  fechaEntregaEstimada: string | null;
  proveedor: { nombre: string };
  items: Array<unknown>;
};

const ESTADO_BADGES: Record<string, { label: string; className: string }> = {
  BORRADOR: { label: "🔵 BORRADOR", className: "bg-blue-50 text-blue-700 border-blue-200" },
  PENDIENTE: { label: "🟡 PENDIENTE", className: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  PARCIAL: { label: "🟠 PARCIAL", className: "bg-orange-50 text-orange-700 border-orange-200" },
  COMPLETADA: { label: "🟢 COMPLETADA", className: "bg-green-50 text-green-700 border-green-200" },
  CANCELADA: { label: "⚫ CANCELADA", className: "bg-gray-50 text-gray-700 border-gray-200" },
};

export function OrdenesCompraTab() {
  const [ordenes, setOrdenes] = useState<OrdenCompra[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [crearDialogOpen, setCrearDialogOpen] = useState(false);
  const [detalleSheetOpen, setDetalleSheetOpen] = useState(false);
  const [selectedOrdenId, setSelectedOrdenId] = useState<string | null>(null);

  useEffect(() => {
    fetchOrdenes();
  }, []);

  const fetchOrdenes = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/ordenes-compra?limit=100");
      if (!res.ok) throw new Error("Error fetching ordenes");
      const json = await res.json();
      setOrdenes(json.data);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar órdenes de compra");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeEstado = async (id: string, estado: string) => {
    try {
      const res = await fetch(`/api/ordenes-compra/${id}/estado`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }
      toast.success(`Estado cambiado a ${estado}`);
      fetchOrdenes();
    } catch (error) {
      console.error("Error:", error);
      toast.error(error instanceof Error ? error.message : "Error al cambiar estado");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar esta orden?")) return;

    try {
      const res = await fetch(`/api/ordenes-compra/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }
      toast.success("Orden eliminada");
      fetchOrdenes();
    } catch (error) {
      console.error("Error:", error);
      toast.error(error instanceof Error ? error.message : "Error al eliminar");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Órdenes de Compra</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (ordenes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Órdenes de Compra</CardTitle>
          <CardDescription>Gestiona las órdenes de compra a proveedores</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-10">
          <PackageCheck className="h-16 w-16 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">No hay órdenes de compra registradas</p>
          <Button onClick={() => setCrearDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Crear primera Orden de Compra
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Órdenes de Compra</h2>
          <p className="text-muted-foreground">Gestiona las órdenes de compra a proveedores</p>
        </div>
        <Button onClick={() => setCrearDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Orden de Compra
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordenes.map((oc) => {
                const estadoBadge = ESTADO_BADGES[oc.estado] || ESTADO_BADGES.BORRADOR;
                return (
                  <TableRow key={oc.id}>
                    <TableCell className="font-mono font-medium">{oc.numero}</TableCell>
                    <TableCell>{oc.proveedor.nombre}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={estadoBadge.className}>
                        {estadoBadge.label}
                      </Badge>
                    </TableCell>
                    <TableCell>{oc.items.length}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(oc.total)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(oc.fechaEmision), "dd/MM/yy", { locale: es })}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedOrdenId(oc.id);
                              setDetalleSheetOpen(true);
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Ver detalle
                          </DropdownMenuItem>

                          {oc.estado === "BORRADOR" && (
                            <>
                              <DropdownMenuItem onClick={() => toast.info("Editar - Por implementar")}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleChangeEstado(oc.id, "PENDIENTE")}>
                                <Send className="mr-2 h-4 w-4" />
                                Enviar a proveedor
                              </DropdownMenuItem>
                            </>
                          )}

                          {(oc.estado === "PENDIENTE" || oc.estado === "PARCIAL") && (
                            <DropdownMenuItem onClick={() => toast.info("Registrar recepción - Por implementar")}>
                              <PackageCheck className="mr-2 h-4 w-4" />
                              Registrar recepción
                            </DropdownMenuItem>
                          )}

                          {(oc.estado === "BORRADOR" || oc.estado === "PENDIENTE") && (
                            <DropdownMenuItem onClick={() => handleChangeEstado(oc.id, "CANCELADA")}>
                              <XCircle className="mr-2 h-4 w-4" />
                              Cancelar
                            </DropdownMenuItem>
                          )}

                          {oc.estado === "BORRADOR" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDelete(oc.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CrearOCDialog
        open={crearDialogOpen}
        onOpenChange={setCrearDialogOpen}
        onSuccess={fetchOrdenes}
      />

      <DetalleOCSheet
        open={detalleSheetOpen}
        onOpenChange={setDetalleSheetOpen}
        ordenId={selectedOrdenId}
        onRefresh={fetchOrdenes}
      />
    </div>
  );
}
