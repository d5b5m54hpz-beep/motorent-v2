"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal, Eye, Pencil, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Contrato } from "./types";

const estadoBadgeMap: Record<string, { label: string; className: string }> = {
  pendiente: {
    label: "Pendiente",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  },
  activo: {
    label: "Activo",
    className: "bg-teal-50 text-teal-800 dark:bg-teal-900 dark:text-teal-300",
  },
  finalizado: {
    label: "Finalizado",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  },
  cancelado: {
    label: "Cancelado",
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  },
};

type ColumnActions = {
  onView: (contrato: Contrato) => void;
  onEdit: (contrato: Contrato) => void;
  onCancel: (contrato: Contrato) => void;
};

export function getColumns(actions: ColumnActions): ColumnDef<Contrato>[] {
  return [
    {
      accessorKey: "id",
      header: "ID",
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {row.getValue<string>("id").slice(-8)}
        </span>
      ),
    },
    {
      id: "cliente",
      accessorFn: (row) => row.cliente.nombre || row.cliente.email,
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Cliente
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="max-w-[150px] truncate">
          {row.original.cliente.nombre || row.original.cliente.email}
        </div>
      ),
    },
    {
      id: "moto",
      accessorFn: (row) => `${row.moto.marca} ${row.moto.modelo}`,
      header: "Moto",
      cell: ({ row }) => (
        <div className="max-w-[120px]">
          <div className="truncate font-medium">
            {row.original.moto.marca} {row.original.moto.modelo}
          </div>
          <div className="text-xs text-muted-foreground font-mono">
            {row.original.moto.patente}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "fechaInicio",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Inicio
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="text-sm">
          {formatDate(new Date(row.getValue("fechaInicio")))}
        </span>
      ),
    },
    {
      accessorKey: "fechaFin",
      header: "Fin",
      cell: ({ row }) => (
        <span className="text-sm">
          {formatDate(new Date(row.getValue("fechaFin")))}
        </span>
      ),
    },
    {
      accessorKey: "frecuenciaPago",
      header: "Frecuencia",
      cell: ({ row }) => {
        const freq = row.getValue<string>("frecuenciaPago");
        return (
          <span className="text-sm capitalize">{freq}</span>
        );
      },
    },
    {
      accessorKey: "montoPeriodo",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Monto Período
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-medium">
          {formatCurrency(row.getValue("montoPeriodo"))}
        </span>
      ),
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
      id: "progreso",
      header: "Cobrado",
      cell: ({ row }) => {
        const total = row.original.montoTotal;
        const cobrado = row.original.montoCobrado ?? 0;
        const porcentaje = total > 0 ? Math.round((cobrado / total) * 100) : 0;
        return (
          <span className="text-sm">
            {porcentaje}%
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const contrato = row.original;
        const puedeCancel = contrato.estado !== "cancelado" && contrato.estado !== "finalizado";
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => actions.onView(contrato)}>
                <Eye className="mr-2 h-4 w-4" />
                Ver
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => actions.onEdit(contrato)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              {puedeCancel && (
                <DropdownMenuItem
                  onClick={() => actions.onCancel(contrato)}
                  className="text-destructive focus:text-destructive"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancelar
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
