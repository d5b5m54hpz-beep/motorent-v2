"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency, formatDate } from "@/lib/utils";
import { categoriaGastoLabels } from "@/lib/validations";
import type { Gasto } from "./types";

const categoriaBadgeColors: Record<string, string> = {
  MANTENIMIENTO: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  COMBUSTIBLE: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  SEGURO: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  REPUESTOS: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  SUELDOS: "bg-teal-50 text-teal-800 dark:bg-teal-900 dark:text-teal-300",
  IMPUESTOS: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

type ColumnActions = {
  onEdit: (g: Gasto) => void;
  onDelete: (g: Gasto) => void;
};

export function getColumns(actions: ColumnActions): ColumnDef<Gasto>[] {
  return [
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
      accessorKey: "concepto",
      header: "Concepto",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.concepto}</p>
          {row.original.descripcion && (
            <p className="text-xs text-muted-foreground truncate max-w-[200px]">{row.original.descripcion}</p>
          )}
        </div>
      ),
    },
    {
      accessorKey: "categoria",
      header: "Categoría",
      cell: ({ row }) => {
        const cat = row.original.categoria;
        const colorClass = categoriaBadgeColors[cat] ?? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
        return (
          <Badge variant="outline" className={colorClass}>
            {categoriaGastoLabels[cat] ?? cat}
          </Badge>
        );
      },
    },
    {
      accessorKey: "monto",
      header: ({ column }) => (
        <Button variant="ghost" size="sm" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Monto
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-semibold text-red-600 dark:text-red-400">
          {formatCurrency(row.original.monto ?? 0)}
        </span>
      ),
    },
    {
      accessorKey: "moto",
      header: "Moto",
      cell: ({ row }) => {
        const moto = row.original.moto;
        return moto ? `${moto.marca} ${moto.modelo}` : "—";
      },
    },
    {
      accessorKey: "proveedor",
      header: "Proveedor",
      cell: ({ row }) => row.original.proveedor?.nombre ?? "—",
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const g = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => actions.onEdit(g)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => actions.onDelete(g)} className="text-destructive focus:text-destructive">
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
