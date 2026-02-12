"use client";

import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type MotoRent = {
  id: string;
  marca: string;
  modelo: string;
  patente: string;
  estado: string;
  precioMensual: number;
  ingresos: number;
  gastos: number;
  rentabilidad: number;
  rentabilidadMensual: number;
  costoPorKm: number;
  diasAlquilada: number;
  diasParada: number;
  roi: number;
};

export default function RentabilidadPage() {
  const [data, setData] = useState<MotoRent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortKey, setSortKey] = useState<"rentabilidad" | "ingresos" | "gastos" | "roi">("rentabilidad");

  useEffect(() => {
    fetch("/api/finanzas/rentabilidad")
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((d) => setData(d.data ?? []))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const sorted = [...data].sort((a, b) => b[sortKey] - a[sortKey]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold">Rentabilidad por Moto</h1></div>
        <Skeleton className="h-80 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Rentabilidad por Moto</h1>
        <p className="text-muted-foreground">Análisis de ingresos vs gastos por unidad</p>
      </div>

      {/* Bar Chart */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h3 className="mb-4 font-semibold">Ranking de Rentabilidad</h3>
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">Sin datos disponibles</p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(300, sorted.length * 40)}>
            <BarChart data={sorted.slice(0, 15)} layout="vertical" margin={{ left: 100 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="patente" className="text-xs" width={90} />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
              />
              <Bar dataKey="rentabilidad" name="Rentabilidad" fill="#23e0ff" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Moto</TableHead>
              <TableHead className="cursor-pointer" onClick={() => setSortKey("ingresos")}>
                Ingresos {sortKey === "ingresos" && "↓"}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => setSortKey("gastos")}>
                Gastos {sortKey === "gastos" && "↓"}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => setSortKey("rentabilidad")}>
                Rentabilidad {sortKey === "rentabilidad" && "↓"}
              </TableHead>
              <TableHead>Costo/Km</TableHead>
              <TableHead>Días Alquilada</TableHead>
              <TableHead className="cursor-pointer" onClick={() => setSortKey("roi")}>
                ROI % {sortKey === "roi" && "↓"}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Sin datos</TableCell>
              </TableRow>
            ) : (
              sorted.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{m.marca} {m.modelo}</p>
                      <p className="text-xs text-muted-foreground font-mono">{m.patente}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-[#23e0ff] font-medium">{formatCurrency(m.ingresos)}</TableCell>
                  <TableCell className="text-red-500 font-medium">{formatCurrency(m.gastos)}</TableCell>
                  <TableCell>
                    <span className={`font-bold ${m.rentabilidad >= 0 ? "text-teal-600 dark:text-teal-400" : "text-red-600 dark:text-red-400"}`}>
                      {formatCurrency(m.rentabilidad)}
                    </span>
                  </TableCell>
                  <TableCell>{formatCurrency(m.costoPorKm)}/km</TableCell>
                  <TableCell>
                    <span>{m.diasAlquilada}d</span>
                    <span className="text-muted-foreground text-xs ml-1">/ {m.diasParada}d parada</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={m.roi >= 0 ? "default" : "destructive"} className={m.roi >= 0 ? "bg-teal-50 text-teal-800 dark:bg-teal-900 dark:text-teal-300" : ""}>
                      {m.roi}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
