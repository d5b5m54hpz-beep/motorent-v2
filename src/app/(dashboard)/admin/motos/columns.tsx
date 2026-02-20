"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import type { Moto } from "./types";

const estadoBadgeMap: Record<string, { label: string; className: string }> = {
  EN_DEPOSITO: {
    label: "En Depósito",
    className: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  },
  EN_PATENTAMIENTO: {
    label: "Patentando",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  },
  DISPONIBLE: {
    label: "Disponible",
    className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  },
  RESERVADA: {
    label: "Reservada",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  },
  ALQUILADA: {
    label: "Alquilada",
    className: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300",
  },
  EN_SERVICE: {
    label: "En Service",
    className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  },
  EN_REPARACION: {
    label: "En Reparación",
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  },
  INMOVILIZADA: {
    label: "Inmovilizada",
    className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  },
  RECUPERACION: {
    label: "Recuperación",
    className: "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-300",
  },
  BAJA_TEMP: {
    label: "Baja Temporal",
    className: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-300",
  },
  BAJA_DEFINITIVA: {
    label: "Baja Definitiva",
    className: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300",
  },
  TRANSFERIDA: {
    label: "Transferida",
    className: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300",
  },
};

type ColumnActions = {
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
};

export function getColumns(actions: ColumnActions): ColumnDef<Moto>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            actions.selectedIds.size > 0 &&
            table.getRowModel().rows.every((row) => actions.selectedIds.has(row.original.id))
          }
          onCheckedChange={actions.onToggleSelectAll}
          aria-label="Seleccionar todas"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={actions.selectedIds.has(row.original.id)}
          onCheckedChange={() => actions.onToggleSelect(row.original.id)}
          aria-label="Seleccionar fila"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "imagen",
      header: "Imagen",
      cell: ({ row }) => {
        const imagen = row.getValue("imagen") as string | null;
        return imagen ? (
          <div className="relative h-10 w-10 overflow-hidden rounded-md">
            <Image
              src={imagen}
              alt={`${row.original.marca} ${row.original.modelo}`}
              width={40}
              height={40}
              className="object-cover"
            />
          </div>
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
            <span className="text-xs text-muted-foreground">Sin img</span>
          </div>
        );
      },
    },
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
        <Badge variant="outline" className="font-mono">
          {row.getValue("patente")}
        </Badge>
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
      accessorKey: "tipo",
      header: "Tipo",
      cell: ({ row }) => {
        const tipo = row.original.tipo as string | null;
        return tipo ? (
          <Badge variant="outline">{tipo}</Badge>
        ) : (
          "—"
        );
      },
    },
    {
      accessorKey: "color",
      header: "Color",
      cell: ({ row }) => {
        const color = row.getValue("color") as string | null;
        return color ? (
          <div className="flex items-center gap-2">
            <div
              className="h-4 w-4 rounded-full border"
              style={{ backgroundColor: color.toLowerCase() }}
            />
            <span className="capitalize">{color}</span>
          </div>
        ) : (
          "—"
        );
      },
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
      id: "proximoService",
      header: "Próximo Service",
      cell: ({ row }) => {
        // Placeholder — se completará en Prompt 3 (ItemOT) cuando la lógica de planes esté activa
        return <span className="text-xs text-muted-foreground">—</span>;
      },
    },
    {
      accessorKey: "kilometraje",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Km
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const km = row.getValue("kilometraje") as number | null;
        return km ? km.toLocaleString("es-AR") : "0";
      },
    },
  ];
}
