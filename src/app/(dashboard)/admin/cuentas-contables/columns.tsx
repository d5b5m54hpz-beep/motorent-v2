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
import type { CuentaContable } from "./types";

const tipoColors: Record<string, string> = {
  ACTIVO: "bg-teal-50 text-teal-800 dark:bg-teal-900 dark:text-teal-300",
  PASIVO: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  PATRIMONIO: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  INGRESO: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  EGRESO: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
};

type ColumnActions = {
  onEdit: (cuenta: CuentaContable) => void;
  onDelete: (cuenta: CuentaContable) => void;
};

export function getColumns(actions: ColumnActions): ColumnDef<CuentaContable>[] {
  return [
    {
      accessorKey: "codigo",
      header: ({ column }) => (
        <Button variant="ghost" size="sm" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Código
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-mono text-sm font-medium">{row.original.codigo}</span>
      ),
    },
    {
      accessorKey: "nombre",
      header: "Nombre",
      cell: ({ row }) => {
        const nivel = row.original.nivel ?? 1;
        // Use Tailwind classes instead of inline styles to avoid hydration issues
        const paddingClass = nivel === 1 ? "" : nivel === 2 ? "pl-6" : nivel === 3 ? "pl-12" : "pl-16";
        return (
          <div className={`flex items-center gap-2 ${paddingClass}`}>
            <span className={nivel === 1 ? "font-bold" : nivel === 2 ? "font-semibold" : ""}>
              {row.original.nombre}
            </span>
          </div>
        );
      },
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
      accessorKey: "nivel",
      header: "Nivel",
      cell: ({ row }) => (
        <Badge variant="outline" className="font-mono">
          {row.original.nivel}
        </Badge>
      ),
    },
    {
      accessorKey: "imputable",
      header: "Imputable",
      cell: ({ row }) => (
        <span className={row.original.imputable ? "text-teal-600 dark:text-teal-400" : "text-muted-foreground"}>
          {row.original.imputable ? "Sí" : "No"}
        </span>
      ),
    },
    {
      accessorKey: "activa",
      header: "Estado",
      cell: ({ row }) => (
        <Badge variant={row.original.activa ? "default" : "outline"}>
          {row.original.activa ? "Activa" : "Inactiva"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const cuenta = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => actions.onEdit(cuenta)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => actions.onDelete(cuenta)} className="text-destructive focus:text-destructive">
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
