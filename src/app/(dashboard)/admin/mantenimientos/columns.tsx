"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal, Eye, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Mantenimiento } from "./types";

const estadoBadgeMap: Record<string, { label: string; className: string }> = {
  PENDIENTE: {
    label: "Pendiente",
    className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  },
  PROGRAMADO: {
    label: "Programado",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  },
  EN_PROCESO: {
    label: "En Proceso",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  },
  ESPERANDO_REPUESTO: {
    label: "Esperando Repuesto",
    className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  },
  COMPLETADO: {
    label: "Completado",
    className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  },
  CANCELADO: {
    label: "Cancelado",
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  },
};

const tipoLabels: Record<string, string> = {
  SERVICE_PREVENTIVO: "Service Preventivo",
  REPARACION: "Reparación",
  CAMBIO_ACEITE: "Cambio de Aceite",
  CAMBIO_NEUMATICOS: "Cambio Neumáticos",
  FRENOS: "Frenos",
  ELECTRICA: "Eléctrica",
  CHAPA_PINTURA: "Chapa y Pintura",
  OTRO: "Otro",
};

type ColumnActions = {
  onView: (m: Mantenimiento) => void;
  onEdit: (m: Mantenimiento) => void;
  onDelete: (m: Mantenimiento) => void;
};

export function getColumns(actions: ColumnActions): ColumnDef<Mantenimiento>[] {
  return [
    {
      accessorKey: "moto",
      header: "Moto",
      cell: ({ row }) => {
        const moto = row.original.moto;
        return (
          <div>
            <p className="font-medium">{moto.marca} {moto.modelo}</p>
            <p className="text-xs text-muted-foreground font-mono">{moto.patente}</p>
          </div>
        );
      },
    },
    {
      accessorKey: "tipo",
      header: "Tipo",
      cell: ({ row }) => tipoLabels[row.getValue("tipo") as string] ?? row.getValue("tipo"),
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
      accessorKey: "costoTotal",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Costo
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => formatCurrency(row.getValue("costoTotal") as number),
    },
    {
      accessorKey: "proveedor",
      header: "Proveedor",
      cell: ({ row }) => row.original.proveedor?.nombre ?? "—",
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Fecha
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => formatDate(row.getValue("createdAt") as string),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const m = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => actions.onView(m)}>
                <Eye className="mr-2 h-4 w-4" />
                Ver
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => actions.onEdit(m)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => actions.onDelete(m)}
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
