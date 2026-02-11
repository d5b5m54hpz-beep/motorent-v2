"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, DollarSign } from "lucide-react";
import { DataTable } from "@/components/data-table/data-table";
import { ColumnDef } from "@tanstack/react-table";

type NotaCredito = {
  id: string;
  numero: string;
  tipo: string;
  clienteId: string;
  cliente: {
    id: string;
    nombre: string | null;
    email: string;
  };
  monto: number;
  motivo: string;
  estado: string;
  fechaEmision: Date;
  fechaAplicacion: Date | null;
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(value);
};

const estadoColors: Record<string, string> = {
  EMITIDA: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  APLICADA: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  REEMBOLSADA: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  ANULADA: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
};

const columns: ColumnDef<NotaCredito>[] = [
  {
    accessorKey: "numero",
    header: "Número",
  },
  {
    accessorKey: "cliente.nombre",
    header: "Cliente",
    cell: ({ row }) => row.original.cliente.nombre || row.original.cliente.email,
  },
  {
    accessorKey: "tipo",
    header: "Tipo",
    cell: ({ row }) => {
      const tipo = row.original.tipo.replace(/_/g, " ");
      return <span className="capitalize text-xs">{tipo.toLowerCase()}</span>;
    },
  },
  {
    accessorKey: "monto",
    header: "Monto",
    cell: ({ row }) => (
      <span className="font-semibold text-red-600 dark:text-red-400">
        {formatCurrency(row.original.monto)}
      </span>
    ),
  },
  {
    accessorKey: "estado",
    header: "Estado",
    cell: ({ row }) => (
      <Badge className={estadoColors[row.original.estado] || ""}>
        {row.original.estado}
      </Badge>
    ),
  },
  {
    accessorKey: "fechaEmision",
    header: "Fecha Emisión",
    cell: ({ row }) => new Date(row.original.fechaEmision).toLocaleDateString("es-AR"),
  },
];

export default function NotasCreditoPage() {
  const [notasCredito, setNotasCredito] = useState<NotaCredito[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ emitidas: 0, pendientes: 0, aplicadas: 0, totalMonto: 0 });

  useEffect(() => {
    fetchNotasCredito();
  }, []);

  const fetchNotasCredito = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/notas-credito?limit=100");
      if (res.ok) {
        const data = await res.json();
        setNotasCredito(data.data || []);

        // Calculate stats
        const emitidas = data.data.filter((nc: NotaCredito) => nc.estado === "EMITIDA").length;
        const aplicadas = data.data.filter((nc: NotaCredito) => nc.estado === "APLICADA").length;
        const totalMonto = data.data
          .filter((nc: NotaCredito) => nc.estado === "EMITIDA")
          .reduce((sum: number, nc: NotaCredito) => sum + nc.monto, 0);

        setStats({
          emitidas,
          pendientes: emitidas,
          aplicadas,
          totalMonto,
        });
      }
    } catch (err) {
      console.error("Error fetching notas de crédito:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Notas de Crédito
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestión de notas de crédito emitidas a clientes
          </p>
        </div>
        <Button size="lg">
          <Plus className="mr-2 h-5 w-5" />
          Emitir Nota de Crédito
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Emitidas</p>
              <p className="text-2xl font-bold">{stats.emitidas}</p>
            </div>
            <DollarSign className="h-8 w-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pendientes Aplicar</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pendientes}</p>
            </div>
            <FileText className="h-8 w-8 text-yellow-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Aplicadas</p>
              <p className="text-2xl font-bold text-green-600">{stats.aplicadas}</p>
            </div>
            <FileText className="h-8 w-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Monto Total Pendiente</p>
              <p className="text-xl font-bold text-red-600">{formatCurrency(stats.totalMonto)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-red-500" />
          </div>
        </Card>
      </div>

      {/* Table */}
      <Card className="p-6">
        <DataTable columns={columns} data={notasCredito} />
      </Card>
    </div>
  );
}
