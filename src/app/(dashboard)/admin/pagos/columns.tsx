"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal, Eye, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Pago } from "./types";

const estadoBadgeMap: Record<string, { label: string; className: string }> = {
  pendiente: {
    label: "Pendiente",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  },
  aprobado: {
    label: "Aprobado",
    className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  },
  rechazado: {
    label: "Rechazado",
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  },
  reembolsado: {
    label: "Reembolsado",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  },
  cancelado: {
    label: "Cancelado",
    className: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  },
};

const metodoBadgeMap: Record<string, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  mercadopago: "MercadoPago",
  pendiente: "—",
};

type ColumnActions = {
  onView: (pago: Pago) => void;
  onRegistrar: (pago: Pago) => void;
};

export function getColumns(actions: ColumnActions): ColumnDef<Pago>[] {
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
      accessorFn: (row) => row.contrato.cliente.nombre || row.contrato.cliente.user.name || row.contrato.cliente.email,
      header: "Cliente",
      cell: ({ row }) => (
        <div className="max-w-[150px] truncate">
          {row.original.contrato.cliente.nombre ||
            row.original.contrato.cliente.user.name ||
            row.original.contrato.cliente.email}
        </div>
      ),
    },
    {
      id: "moto",
      accessorFn: (row) => `${row.contrato.moto.marca} ${row.contrato.moto.modelo}`,
      header: "Moto",
      cell: ({ row }) => (
        <div className="max-w-[120px]">
          <div className="truncate font-medium">
            {row.original.contrato.moto.marca} {row.original.contrato.moto.modelo}
          </div>
          <div className="text-xs text-muted-foreground font-mono">
            {row.original.contrato.moto.patente}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "contratoId",
      header: "Contrato",
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {row.getValue<string>("contratoId").slice(-8)}
        </span>
      ),
    },
    {
      accessorKey: "monto",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Monto
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-medium">
          {formatCurrency(row.getValue("monto"))}
        </span>
      ),
    },
    {
      accessorKey: "vencimientoAt",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Vencimiento
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const vencimiento = row.getValue<string | null>("vencimientoAt");
        if (!vencimiento) return <span className="text-muted-foreground">—</span>;

        const fechaVencimiento = new Date(vencimiento);
        const hoy = new Date();
        const estado = row.original.estado;
        const estaVencido = estado === "pendiente" && fechaVencimiento < hoy;

        return (
          <span className={estaVencido ? "text-red-600 font-medium" : "text-sm"}>
            {formatDate(fechaVencimiento)}
          </span>
        );
      },
    },
    {
      accessorKey: "pagadoAt",
      header: "Fecha Pago",
      cell: ({ row }) => {
        const fecha = row.getValue<string | null>("pagadoAt");
        return fecha ? (
          <span className="text-sm">{formatDate(new Date(fecha))}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      accessorKey: "metodo",
      header: "Método",
      cell: ({ row }) => {
        const metodo = row.getValue<string>("metodo");
        return (
          <span className="text-sm">
            {metodoBadgeMap[metodo] ?? metodo}
          </span>
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
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const pago = row.original;
        const puedeRegistrar = pago.estado === "pendiente";
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => actions.onView(pago)}>
                <Eye className="mr-2 h-4 w-4" />
                Ver Detalle
              </DropdownMenuItem>
              {puedeRegistrar && (
                <DropdownMenuItem onClick={() => actions.onRegistrar(pago)}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Registrar Pago
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
