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
import { formatCurrency } from "@/lib/utils";
import type { Repuesto } from "./types";

type ColumnActions = {
  onEdit: (r: Repuesto) => void;
  onDelete: (r: Repuesto) => void;
};

export function getColumns(actions: ColumnActions): ColumnDef<Repuesto>[] {
  return [
    {
      accessorKey: "nombre",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Nombre
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
    },
    {
      accessorKey: "codigo",
      header: "Código",
      cell: ({ row }) => {
        const val = row.getValue("codigo") as string | null;
        return val ? <span className="font-mono text-xs">{val}</span> : "—";
      },
    },
    {
      accessorKey: "categoria",
      header: "Categoría",
      cell: ({ row }) => row.getValue("categoria") || "—",
    },
    {
      accessorKey: "stock",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Stock
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const stock = row.original.stock;
        const minimo = row.original.stockMinimo;
        const isLow = stock <= minimo;
        return (
          <div className="flex items-center gap-2">
            <span className={isLow ? "text-destructive font-semibold" : ""}>
              {stock}
            </span>
            {isLow && (
              <Badge variant="destructive" className="text-[10px] px-1 py-0">
                Bajo
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "precioCompra",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          P. Compra
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => formatCurrency(row.getValue("precioCompra") as number),
    },
    {
      accessorKey: "precioVenta",
      header: "P. Venta",
      cell: ({ row }) => formatCurrency(row.getValue("precioVenta") as number),
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
        const r = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => actions.onEdit(r)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => actions.onDelete(r)}
                className="text-destructive focus:text-destructive"
              >
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
