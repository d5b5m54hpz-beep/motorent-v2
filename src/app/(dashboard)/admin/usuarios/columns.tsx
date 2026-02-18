"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowUpDown, MoreHorizontal, Pencil, KeyRound, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { Usuario } from "./types";

type ColumnsProps = {
  onEdit: (usuario: Usuario) => void;
  onResetPassword: (usuario: Usuario) => void;
  onDelete: (usuario: Usuario) => void;
};

const ROLE_BADGE_COLORS: Record<string, string> = {
  ADMIN: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  OPERADOR: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  CLIENTE: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  CONTADOR: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  RRHH_MANAGER: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  COMERCIAL: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
  VIEWER: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300",
};

export function getColumns({ onEdit, onResetPassword, onDelete }: ColumnsProps): ColumnDef<Usuario>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2"
          >
            Nombre
            <ArrowUpDown className="ml-2 h-3 w-3" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const usuario = row.original;
        return (
          <div className="flex items-center gap-3">
            {usuario.image ? (
              <img
                src={usuario.image}
                alt={usuario.name}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
                {usuario.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="font-medium">{usuario.name}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.email}</span>
      ),
    },
    {
      accessorKey: "role",
      header: "Rol",
      cell: ({ row }) => {
        const role = row.original.role;
        return (
          <Badge variant="outline" className={ROLE_BADGE_COLORS[role] || ""}>
            {role}
          </Badge>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      id: "profiles",
      header: "Perfiles",
      cell: ({ row }) => {
        const usuario = row.original;
        const userProfiles = usuario.profiles || [];

        if (userProfiles.length === 0) {
          return <span className="text-sm text-muted-foreground">Sin perfiles</span>;
        }

        return (
          <div className="flex flex-wrap gap-1">
            {userProfiles.map((up) => (
              <Badge
                key={up.profileId}
                variant="secondary"
                className="text-xs"
              >
                {up.profile.name}
              </Badge>
            ))}
          </div>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2"
          >
            Fecha de Registro
            <ArrowUpDown className="ml-2 h-3 w-3" />
          </Button>
        );
      },
      cell: ({ row }) => formatDate(new Date(row.original.createdAt)),
    },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => {
        const usuario = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onEdit(usuario)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onResetPassword(usuario)}>
                <KeyRound className="mr-2 h-4 w-4" />
                Resetear Password
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(usuario)}
                className="text-red-600 dark:text-red-400"
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
