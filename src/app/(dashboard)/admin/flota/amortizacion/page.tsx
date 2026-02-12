"use client";

import { useState, useEffect } from "react";
import {
  TrendingDown,
  DollarSign,
  Calendar,
  Percent,
  Filter,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

type AmortizacionMoto = {
  moto: {
    id: string;
    marca: string;
    modelo: string;
    patente: string | null;
    estado: string;
  };
  financiero: {
    valorCompra: number;
    valorResidual: number;
    valorLibros: number;
  };
  amortizacion: {
    metodo: string;
    vidaUtilAnios: number;
    vidaUtilMeses: number;
    cuotaMensual: number;
    mesesTranscurridos: number;
    mesesRestantes: number;
    aniosRestantes: number;
    amortizacionAcumulada: number;
    porcentajeAmortizado: number;
    estadoAmortizacion: "NUEVA" | "EN_PROCESO" | "TOTALMENTE_AMORTIZADA";
  };
  fechas: {
    fechaInicio: string;
    fechaFinEstimada: string;
  };
};

type AmortizacionData = {
  resumen: {
    totalMotos: number;
    totalValorCompra: number;
    totalAmortizacionAcumulada: number;
    totalValorLibros: number;
    totalValorResidual: number;
    porcentajeAmortizadoPromedio: number;
    motosNuevas: number;
    motosEnProceso: number;
    motosTotalmenteAmortizadas: number;
  };
  amortizaciones: AmortizacionMoto[];
};

export default function AmortizacionPage() {
  const [data, setData] = useState<AmortizacionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [soloActivas, setSoloActivas] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/flota/amortizacion?soloActivas=${soloActivas}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [soloActivas]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Amortización de Flota</h1>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-lg" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Amortización de Flota</h1>
        <p className="text-muted-foreground">Error al cargar datos.</p>
      </div>
    );
  }

  const kpis = [
    {
      label: "Valor de Compra Total",
      value: formatCurrency(data.resumen.totalValorCompra),
      icon: DollarSign,
      iconClass: "text-[#23e0ff]",
      subtitle: `${data.resumen.totalMotos} motos`,
    },
    {
      label: "Amortización Acumulada",
      value: formatCurrency(data.resumen.totalAmortizacionAcumulada),
      icon: TrendingDown,
      iconClass: "text-red-500",
      subtitle: `${data.resumen.porcentajeAmortizadoPromedio.toFixed(1)}% promedio`,
    },
    {
      label: "Valor en Libros",
      value: formatCurrency(data.resumen.totalValorLibros),
      icon: DollarSign,
      iconClass: "text-teal-500",
      subtitle: "Valor contable actual",
    },
    {
      label: "Totalmente Amortizadas",
      value: data.resumen.motosTotalmenteAmortizadas,
      icon: Calendar,
      iconClass: "text-yellow-500",
      subtitle: `${data.resumen.motosEnProceso} en proceso`,
    },
  ];

  // Datos para gráfico de evolución (proyección simple)
  const evolucionData = [];
  for (let mes = 0; mes <= 60; mes += 6) {
    const valorLibros = data.amortizaciones.reduce((sum, a) => {
      const cuota = a.amortizacion.cuotaMensual;
      const amortEnMes = Math.min(
        cuota * mes,
        a.financiero.valorCompra - a.financiero.valorResidual
      );
      return sum + (a.financiero.valorCompra - amortEnMes);
    }, 0);

    evolucionData.push({
      mes,
      anio: (mes / 12).toFixed(1),
      valorLibros,
    });
  }

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "NUEVA":
        return <Badge className="bg-blue-500">Nueva</Badge>;
      case "EN_PROCESO":
        return <Badge className="bg-yellow-500">En Proceso</Badge>;
      case "TOTALMENTE_AMORTIZADA":
        return <Badge className="bg-gray-500">Amortizada</Badge>;
      default:
        return <Badge>{estado}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Amortización de Flota</h1>
        <p className="text-muted-foreground">
          Depreciación según método lineal AFIP (5 años vida útil)
        </p>
      </div>

      {/* Filtros */}
      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Switch
            id="activas"
            checked={soloActivas}
            onCheckedChange={setSoloActivas}
          />
          <Label htmlFor="activas" className="cursor-pointer">
            Solo motos activas
          </Label>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">{kpi.label}</p>
              <kpi.icon className={`h-5 w-5 ${kpi.iconClass}`} />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight">{kpi.value}</p>
            <p className="text-xs text-muted-foreground">{kpi.subtitle}</p>
          </div>
        ))}
      </div>

      {/* Gráfico de Evolución */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h3 className="mb-4 font-semibold">Evolución Valor en Libros (Proyección 5 años)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={evolucionData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="anio" className="text-xs" label={{ value: "Años", position: "insideBottom", offset: -5 }} />
            <YAxis
              className="text-xs"
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="valorLibros"
              name="Valor en Libros"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Tabla de Amortización */}
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="p-6 border-b">
          <h3 className="font-semibold">Detalle por Moto</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium">Moto</th>
                <th className="px-4 py-3 text-right text-xs font-medium">Valor Compra</th>
                <th className="px-4 py-3 text-right text-xs font-medium">Amort. Acum.</th>
                <th className="px-4 py-3 text-right text-xs font-medium">Valor Libros</th>
                <th className="px-4 py-3 text-center text-xs font-medium">% Amortizado</th>
                <th className="px-4 py-3 text-center text-xs font-medium">Años Restantes</th>
                <th className="px-4 py-3 text-center text-xs font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.amortizaciones.map((item) => (
                <tr key={item.moto.id} className="hover:bg-muted/50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">
                        {item.moto.marca} {item.moto.modelo}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.moto.patente || "Sin patente"}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    {formatCurrency(item.financiero.valorCompra)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-red-600 dark:text-red-400">
                    -{formatCurrency(item.amortizacion.amortizacionAcumulada)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-semibold text-teal-600 dark:text-teal-400">
                    {formatCurrency(item.financiero.valorLibros)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <Progress
                        value={item.amortizacion.porcentajeAmortizado}
                        className="h-2"
                      />
                      <p className="text-xs text-center text-muted-foreground">
                        {item.amortizacion.porcentajeAmortizado.toFixed(1)}%
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-center">
                    {item.amortizacion.aniosRestantes} años
                  </td>
                  <td className="px-4 py-3 text-center">
                    {getEstadoBadge(item.amortizacion.estadoAmortizacion)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Nota explicativa */}
      <div className="rounded-lg border bg-muted/50 p-4">
        <p className="text-sm text-muted-foreground">
          <strong>Método de Amortización:</strong> Lineal según AFIP. Vida útil: 5 años
          (60 meses). Cuota mensual = (Valor Compra - Valor Residual) / 60. El valor residual
          por defecto es 10% del valor de compra. La amortización comienza desde la fecha de compra.
        </p>
      </div>
    </div>
  );
}
