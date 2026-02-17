"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal, Pencil, Trash2, Eye, Copy, Lock } from "lucide-react";
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
import type { AsientoContable, LineaAsiento } from "@prisma/client";

type AsientoContableWithLineas = AsientoContable & {
  lineas: (LineaAsiento & {
    cuenta: { codigo: string; nombre: string };
  })[];
};

const tipoColors: Record<string, string> = {
  APERTURA: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  COMPRA: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  VENTA: "bg-teal-50 text-teal-800 dark:bg-teal-900 dark:text-teal-300",
  PAGO: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  COBRO: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  AJUSTE: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  CIERRE: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
};

type ColumnActions = {
  onView: (asiento: AsientoContableWithLineas) => void;
  onEdit: (asiento: AsientoContableWithLineas) => void;
  onDelete: (asiento: AsientoContableWithLineas) => void;
};

export function getColumns(actions: ColumnActions): ColumnDef<AsientoContableWithLineas>[] {
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
      accessorKey: "numero",
      header: ({ column }) => (
        <Button variant="ghost" size="sm" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Nº
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-mono font-semibold">#{row.original.numero}</span>
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
      accessorKey: "descripcion",
      header: "Descripción",
      cell: ({ row }) => (
        <div className="max-w-[300px]">
          <p className="truncate">{row.original.descripcion}</p>
          {row.original.notas && (
            <p className="text-xs text-muted-foreground truncate">{row.original.notas}</p>
          )}
        </div>
      ),
    },
    {
      accessorKey: "totalDebe",
      header: "Debe",
      cell: ({ row }) => (
        <span className="font-mono text-sm">
          {formatCurrency(row.original.totalDebe)}
        </span>
      ),
    },
    {
      accessorKey: "totalHaber",
      header: "Haber",
      cell: ({ row }) => (
        <span className="font-mono text-sm">
          {formatCurrency(row.original.totalHaber)}
        </span>
      ),
    },
    {
      accessorKey: "lineas",
      header: "Líneas",
      cell: ({ row }) => (
        <Badge variant="outline">
          {row.original.lineas.length}
        </Badge>
      ),
    },
    {
      accessorKey: "cerrado",
      header: "Estado",
      cell: ({ row }) => (
        row.original.cerrado ? (
          <div className="flex items-center gap-1 text-muted-foreground">
            <Lock className="h-3 w-3" />
            <span className="text-xs">Cerrado</span>
          </div>
        ) : (
          <Badge variant="outline" className="bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
            Abierto
          </Badge>
        )
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const asiento = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => actions.onView(asiento)}>
                <Eye className="mr-2 h-4 w-4" />
                Ver detalle
              </DropdownMenuItem>
              {!asiento.cerrado && (
                <>
                  <DropdownMenuItem onClick={() => actions.onEdit(asiento)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => actions.onDelete(asiento)} className="text-destructive focus:text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
