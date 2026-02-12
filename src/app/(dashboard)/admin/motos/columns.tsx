"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal, Eye, Pencil, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/lib/utils";
import type { Moto } from "./types";

const estadoBadgeMap: Record<string, { label: string; className: string }> = {
  disponible: {
    label: "Disponible",
    className: "bg-teal-50 text-teal-800 dark:bg-teal-900 dark:text-teal-300",
  },
  alquilada: {
    label: "Alquilada",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  },
  mantenimiento: {
    label: "Mantenimiento",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  },
  baja: {
    label: "Baja",
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  },
};

type ColumnActions = {
  onView: (moto: Moto) => void;
  onEdit: (moto: Moto) => void;
  onDelete: (moto: Moto) => void;
  onBaja: (moto: Moto) => void;
};

export function getColumns(actions: ColumnActions): ColumnDef<Moto>[] {
  return [
    {
      accessorKey: "marca",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Marca
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
    },
    {
      accessorKey: "modelo",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Modelo
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
    },
    {
      accessorKey: "anio",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Año
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
    },
    {
      accessorKey: "patente",
      header: "Patente",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.getValue("patente")}</span>
      ),
    },
    {
      accessorKey: "cilindrada",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Cilindrada
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const val = row.getValue("cilindrada") as number | null;
        return val ? `${val} cc` : "—";
      },
    },
    {
      accessorKey: "precioMensual",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Precio Mensual
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => formatCurrency(row.getValue("precioMensual") as number),
    },
    {
      accessorKey: "estado",
      header: "Estado",
      cell: ({ row }) => {
        const estado = row.getValue("estado") as string;
        const badge = estadoBadgeMap[estado] ?? { label: estado, className: "" };
        return (
          <Badge variant="outline" className={badge.className}>
            {badge.label}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const moto = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => actions.onView(moto)}>
                <Eye className="mr-2 h-4 w-4" />
                Ver
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => actions.onEdit(moto)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {moto.estado !== "baja" && (
                <DropdownMenuItem
                  onClick={() => actions.onBaja(moto)}
                  className="text-orange-600 focus:text-orange-600"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Dar de Baja
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => actions.onDelete(moto)}
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
