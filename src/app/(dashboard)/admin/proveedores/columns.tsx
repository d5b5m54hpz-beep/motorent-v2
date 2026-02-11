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
import type { Proveedor } from "./types";

type ColumnActions = {
  onEdit: (p: Proveedor) => void;
  onDelete: (p: Proveedor) => void;
};

export function getColumns(actions: ColumnActions): ColumnDef<Proveedor>[] {
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
      accessorKey: "contacto",
      header: "Contacto",
      cell: ({ row }) => row.getValue("contacto") || "—",
    },
    {
      accessorKey: "telefono",
      header: "Teléfono",
      cell: ({ row }) => row.getValue("telefono") || "—",
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => row.getValue("email") || "—",
    },
    {
      accessorKey: "rubro",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Rubro
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => row.getValue("rubro") || "—",
    },
    {
      accessorKey: "activo",
      header: "Estado",
      cell: ({ row }) => {
        const activo = row.getValue("activo") as boolean;
        return (
          <Badge
            variant="outline"
            className={
              activo
                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
            }
          >
            {activo ? "Activo" : "Inactivo"}
          </Badge>
        );
      },
    },
    {
      id: "asociaciones",
      header: "Asociaciones",
      cell: ({ row }) => {
        const p = row.original;
        return (
          <div className="text-xs text-muted-foreground">
            {p._count.mantenimientos} mant. / {p._count.repuestos} rep.
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const p = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => actions.onEdit(p)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => actions.onDelete(p)}
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
