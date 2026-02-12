"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal, Eye, Pencil, Trash2 } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Moto } from "./types";

const estadoBadgeMap: Record<string, { label: string; className: string }> = {
  disponible: {
    label: "Disponible",
    className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
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
      id: "docs",
      header: "Docs",
      cell: ({ row }) => {
        const moto = row.original;
        const estadoPatentamiento = moto.estadoPatentamiento || "SIN_PATENTAR";
        const estadoSeguro = moto.estadoSeguro || "SIN_SEGURO";

        // Helpers para badges
        const patentamientoBadge = {
          SIN_PATENTAR: { label: "Sin Pat.", className: "bg-red-100 text-red-700 border-red-300" },
          EN_TRAMITE: { label: "Trámite", className: "bg-yellow-100 text-yellow-700 border-yellow-300" },
          PATENTADA: { label: "Patentada", className: "bg-green-100 text-green-700 border-green-300" },
        }[estadoPatentamiento] ?? { label: "N/A", className: "" };

        const seguroBadge = {
          SIN_SEGURO: { label: "Sin Seg.", className: "bg-red-100 text-red-700 border-red-300" },
          EN_TRAMITE: { label: "Trámite", className: "bg-yellow-100 text-yellow-700 border-yellow-300" },
          ASEGURADA: { label: "Asegurada", className: "bg-green-100 text-green-700 border-green-300" },
        }[estadoSeguro] ?? { label: "N/A", className: "" };

        // Calcular si el seguro está por vencer
        const vencimientoSeguro = moto.fechaVencimientoSeguro ? new Date(moto.fechaVencimientoSeguro) : null;
        const hoy = new Date();
        const diasParaVencer = vencimientoSeguro ? Math.floor((vencimientoSeguro.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)) : null;
        const seguroPorVencer = diasParaVencer !== null && diasParaVencer >= 0 && diasParaVencer <= 30;

        return (
          <div className="flex flex-col gap-1">
            <Badge variant="outline" className={`text-[10px] ${patentamientoBadge.className}`}>
              {patentamientoBadge.label}
            </Badge>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className={`text-[10px] ${seguroBadge.className}`}>
                {seguroBadge.label}
              </Badge>
              {seguroPorVencer && <span className="text-yellow-600" title="Seguro vence en 30 días">⚠️</span>}
            </div>
          </div>
        );
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
