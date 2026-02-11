"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal, Pencil, Trash2, Copy, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import type { FacturaCompra } from "./types";

const tipoColors: Record<string, string> = {
  A: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  B: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  C: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  TICKET: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  RECIBO: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
};

const estadoColors: Record<string, string> = {
  PENDIENTE: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  PAGADA: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  PAGADA_PARCIAL: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  VENCIDA: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  ANULADA: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
};

const estadoLabels: Record<string, string> = {
  PENDIENTE: "Pendiente",
  PAGADA: "Pagada",
  PAGADA_PARCIAL: "Pago Parcial",
  VENCIDA: "Vencida",
  ANULADA: "Anulada",
};

type ColumnActions = {
  onEdit: (factura: FacturaCompra) => void;
  onDelete: (factura: FacturaCompra) => void;
};

export function getColumns(actions: ColumnActions): ColumnDef<FacturaCompra>[] {
  return [
    {
      accessorKey: "visibleId",
      header: "ID",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <span className="font-mono text-xs text-muted-foreground">
            {row.original.visibleId.slice(0, 8)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => {
              navigator.clipboard.writeText(row.original.visibleId);
              toast.success("ID copiado");
            }}
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      ),
    },
    {
      accessorKey: "fecha",
      header: ({ column }) => (
        <Button variant="ghost" size="sm" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Fecha
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => formatDate(row.original.fecha),
    },
    {
      accessorKey: "razonSocial",
      header: "Proveedor",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.razonSocial}</p>
          {row.original.cuit && (
            <p className="text-xs text-muted-foreground">{row.original.cuit}</p>
          )}
        </div>
      ),
    },
    {
      accessorKey: "tipo",
      header: "Tipo",
      cell: ({ row }) => {
        const tipo = row.original.tipo;
        const colorClass = tipoColors[tipo] ?? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
        return (
          <Badge variant="outline" className={colorClass}>
            {tipo}
          </Badge>
        );
      },
    },
    {
      accessorKey: "numero",
      header: "Número",
      cell: ({ row }) => (
        <div>
          {row.original.puntoVenta && (
            <span className="text-xs text-muted-foreground">{row.original.puntoVenta}-</span>
          )}
          <span className="font-mono text-sm">{row.original.numero}</span>
        </div>
      ),
    },
    {
      accessorKey: "total",
      header: ({ column }) => (
        <Button variant="ghost" size="sm" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Total
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-semibold text-red-600 dark:text-red-400">
          {formatCurrency(row.original.total)}
        </span>
      ),
    },
    {
      accessorKey: "estado",
      header: "Estado",
      cell: ({ row }) => {
        const estado = row.original.estado;
        const colorClass = estadoColors[estado] ?? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
        return (
          <Badge variant="outline" className={colorClass}>
            {estadoLabels[estado] ?? estado}
          </Badge>
        );
      },
    },
    {
      accessorKey: "vencimiento",
      header: "Vencimiento",
      cell: ({ row }) => {
        const vencimiento = row.original.vencimiento;
        if (!vencimiento) return "—";

        const isVencida = new Date(vencimiento) < new Date() && row.original.estado !== "PAGADA";

        return (
          <div className="flex items-center gap-1">
            {isVencida && <AlertTriangle className="h-3 w-3 text-red-500" />}
            <span className={isVencida ? "text-red-600 dark:text-red-400 font-medium" : ""}>
              {formatDate(vencimiento)}
            </span>
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const factura = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => actions.onEdit(factura)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => actions.onDelete(factura)} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
