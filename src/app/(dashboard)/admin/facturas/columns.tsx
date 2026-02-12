"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Download, Mail } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Factura } from "./types";

type Props = {
  onView: (factura: Factura) => void;
  onDownloadPDF: (id: string) => void;
  onSendEmail: (id: string) => void;
};

export function getColumns({ onView, onDownloadPDF, onSendEmail }: Props): ColumnDef<Factura>[] {
  return [
    {
      accessorKey: "numero",
      header: "Número",
      cell: ({ row }) => {
        const factura = row.original;
        const numeroCompleto = `${String(factura.puntoVenta).padStart(4, "0")}-${factura.numero}`;
        return <span className="font-mono text-xs">{numeroCompleto}</span>;
      },
    },
    {
      accessorKey: "tipo",
      header: "Tipo",
      cell: ({ row }) => {
        const tipo = row.original.tipo;
        const colors: Record<string, string> = {
          A: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
          B: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
          C: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
        };
        return (
          <Badge variant="outline" className={colors[tipo]}>
            {tipo}
          </Badge>
        );
      },
    },
    {
      accessorKey: "cliente",
      header: "Cliente",
      cell: ({ row }) => {
        const cliente = row.original.pago.contrato.cliente;
        const nombre = cliente.nombre || cliente.user.name;
        return (
          <div className="flex flex-col">
            <span className="font-medium">{nombre}</span>
            <span className="text-xs text-muted-foreground">{cliente.dni || "—"}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "moto",
      header: "Moto",
      cell: ({ row }) => {
        const moto = row.original.pago.contrato.moto;
        return (
          <div className="flex flex-col">
            <span className="font-medium">
              {moto.marca} {moto.modelo}
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              {moto.patente}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "montoTotal",
      header: "Monto Total",
      cell: ({ row }) => {
        return (
          <span className="font-semibold">
            {formatCurrency(row.original.montoTotal)}
          </span>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "Fecha",
      cell: ({ row }) => {
        return formatDate(new Date(row.original.createdAt));
      },
    },
    {
      accessorKey: "cae",
      header: "CAE",
      cell: ({ row }) => {
        const cae = row.original.cae;
        return cae ? (
          <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">
            Con CAE
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            Sin CAE
          </Badge>
        );
      },
    },
    {
      accessorKey: "emitida",
      header: "Estado",
      cell: ({ row }) => {
        const emitida = row.original.emitida;
        return emitida ? (
          <Badge className="bg-green-600 dark:bg-green-700">Emitida</Badge>
        ) : (
          <Badge variant="secondary">Pendiente</Badge>
        );
      },
    },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => {
        const factura = row.original;
        return (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onView(factura)}
              title="Ver detalle"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDownloadPDF(factura.id)}
              title="Descargar PDF"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSendEmail(factura.id)}
              title={factura.emailEnviado ? "Reenviar por email" : "Enviar por email"}
              className={factura.emailEnviado ? "text-green-600 dark:text-green-400" : ""}
            >
              <Mail className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];
}
