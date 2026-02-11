"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { EmpleadoListItem } from "./types";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type ColumnActions = {
  onEdit: (empleado: EmpleadoListItem) => void;
  onDelete: (empleado: EmpleadoListItem) => void;
  onView: (empleado: EmpleadoListItem) => void;
};

export function getColumns(actions: ColumnActions): ColumnDef<EmpleadoListItem>[] {
  return [
    {
      accessorKey: "visibleId",
      header: "ID",
      cell: ({ row }) => {
        const id = row.getValue("visibleId") as string;
        return (
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs">{id.slice(0, 8)}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "apellido",
      header: "Apellido",
      cell: ({ row }) => {
        const apellido = row.getValue("apellido") as string;
        return <span className="font-medium">{apellido}</span>;
      },
    },
    {
      accessorKey: "nombre",
      header: "Nombre",
    },
    {
      accessorKey: "dni",
      header: "DNI",
      cell: ({ row }) => {
        const dni = row.getValue("dni") as string;
        return <span className="font-mono text-sm">{dni}</span>;
      },
    },
    {
      accessorKey: "cargo",
      header: "Cargo",
      cell: ({ row }) => {
        const cargo = row.getValue("cargo") as string;
        return <span className="text-sm">{cargo}</span>;
      },
    },
    {
      accessorKey: "estado",
      header: "Estado",
      cell: ({ row }) => {
        const estado = row.getValue("estado") as string;
        const variant: "default" | "secondary" | "destructive" | "outline" =
          estado === "ACTIVO"
            ? "default"
            : estado === "LICENCIA"
            ? "secondary"
            : estado === "SUSPENDIDO"
            ? "destructive"
            : "outline";

        return <Badge variant={variant}>{estado}</Badge>;
      },
    },
    {
      accessorKey: "fechaIngreso",
      header: "Ingreso",
      cell: ({ row }) => {
        const fecha = row.getValue("fechaIngreso") as Date;
        return (
          <span className="text-sm text-muted-foreground">
            {format(new Date(fecha), "dd/MM/yyyy", { locale: es })}
          </span>
        );
      },
    },
    {
      accessorKey: "salarioBasico",
      header: "Salario Básico",
      cell: ({ row }) => {
        const salario = row.getValue("salarioBasico") as number;
        return (
          <span className="font-mono text-sm">
            {new Intl.NumberFormat("es-AR", {
              style: "currency",
              currency: "ARS",
              minimumFractionDigits: 0,
            }).format(salario)}
          </span>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const empleado = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Abrir menú</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => actions.onView(empleado)}>
                <Eye className="mr-2 h-4 w-4" />
                Ver Detalle
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => actions.onEdit(empleado)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => actions.onDelete(empleado)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Dar de Baja
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
