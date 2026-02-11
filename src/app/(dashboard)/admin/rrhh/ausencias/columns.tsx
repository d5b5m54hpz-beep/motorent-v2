"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Trash2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate } from "@/lib/utils";
import type { Ausencia } from "./types";

const tipoLabels: Record<string, string> = {
  VACACIONES: "Vacaciones",
  ENFERMEDAD: "Enfermedad",
  ACCIDENTE_LABORAL: "Accidente Laboral",
  LICENCIA_MATERNIDAD: "Lic. Maternidad",
  LICENCIA_PATERNIDAD: "Lic. Paternidad",
  ESTUDIO: "Estudio",
  MATRIMONIO: "Matrimonio",
  FALLECIMIENTO_FAMILIAR: "Fallecimiento",
  MUDANZA: "Mudanza",
  DONACION_SANGRE: "Donación Sangre",
};

const tipoColors: Record<string, string> = {
  VACACIONES: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  ENFERMEDAD: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  ACCIDENTE_LABORAL: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  LICENCIA_MATERNIDAD: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
  LICENCIA_PATERNIDAD: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  ESTUDIO: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  MATRIMONIO: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  FALLECIMIENTO_FAMILIAR: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  MUDANZA: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300",
  DONACION_SANGRE: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-300",
};

const estadoColors: Record<string, string> = {
  PENDIENTE: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  APROBADA: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  RECHAZADA: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

type ColumnActions = {
  onEdit: (ausencia: Ausencia) => void;
  onDelete: (ausencia: Ausencia) => void;
};

export function getColumns(actions: ColumnActions): ColumnDef<Ausencia>[] {
  return [
    {
      accessorKey: "empleado",
      header: "Empleado",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">
            {row.original.empleado.apellido}, {row.original.empleado.nombre}
          </p>
          <p className="text-xs text-muted-foreground">DNI: {row.original.empleado.dni}</p>
        </div>
      ),
    },
    {
      accessorKey: "tipo",
      header: "Tipo",
      cell: ({ row }) => {
        const tipo = row.original.tipo;
        const colorClass = tipoColors[tipo] ?? "bg-gray-100 text-gray-800";
        return (
          <Badge variant="outline" className={colorClass}>
            {tipoLabels[tipo] ?? tipo}
          </Badge>
        );
      },
    },
    {
      accessorKey: "fechaInicio",
      header: "Desde",
      cell: ({ row }) => formatDate(row.original.fechaInicio),
    },
    {
      accessorKey: "fechaFin",
      header: "Hasta",
      cell: ({ row }) => formatDate(row.original.fechaFin),
    },
    {
      accessorKey: "dias",
      header: "Días",
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.dias} día{row.original.dias !== 1 ? "s" : ""}
        </span>
      ),
    },
    {
      accessorKey: "justificada",
      header: "Justificada",
      cell: ({ row }) =>
        row.original.justificada ? (
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        ) : (
          <XCircle className="h-4 w-4 text-red-600" />
        ),
    },
    {
      accessorKey: "estado",
      header: "Estado",
      cell: ({ row }) => {
        const estado = row.original.estado;
        const colorClass = estadoColors[estado] ?? "bg-gray-100 text-gray-800";
        const Icon = estado === "APROBADA" ? CheckCircle2 : estado === "RECHAZADA" ? XCircle : Clock;
        return (
          <Badge variant="outline" className={colorClass}>
            <Icon className="mr-1 h-3 w-3" />
            {estado}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const ausencia = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => actions.onEdit(ausencia)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => actions.onDelete(ausencia)}
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
