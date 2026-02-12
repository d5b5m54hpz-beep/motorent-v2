"use client";

import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, ResponsiveContainer } from "recharts";

type Ratio = {
  valor: number;
  label: string;
  unidad: string;
  descripcion: string;
};

type IndicadoresData = {
  ratios: {
    roe: Ratio;
    roa: Ratio;
    margenOperativo: Ratio;
    rotacionActivos: Ratio;
    ratioCorriente: Ratio;
    endeudamiento: Ratio;
  };
  historico: Array<{
    mes: string;
    roe: number;
    roa: number;
    margenOperativo: number;
    rotacionActivos: number;
    ratioCorriente: number;
    endeudamiento: number;
  }>;
  benchmarks: {
    roe: { bajo: number; medio: number; alto: number };
    roa: { bajo: number; medio: number; alto: number };
    margenOperativo: { bajo: number; medio: number; alto: number };
    rotacionActivos: { bajo: number; medio: number; alto: number };
    ratioCorriente: { bajo: number; medio: number; alto: number };
    endeudamiento: { bajo: number; medio: number; alto: number };
  };
  balance: {
    activoCorriente: number;
    activoNoCorriente: number;
    totalActivos: number;
    pasivoCorriente: number;
    pasivoNoCorriente: number;
    totalPasivos: number;
    patrimonioNeto: number;
  };
};

function calcularNivelBenchmark(
  valor: number,
  benchmark: { bajo: number; medio: number; alto: number },
  invertido = false
): { nivel: "bajo" | "medio" | "alto"; color: string } {
  if (invertido) {
    // Para endeudamiento: menor es mejor
    if (valor <= benchmark.bajo) return { nivel: "alto", color: "text-teal-500" };
    if (valor <= benchmark.medio) return { nivel: "medio", color: "text-yellow-500" };
    return { nivel: "bajo", color: "text-red-500" };
  } else {
    if (valor >= benchmark.alto) return { nivel: "alto", color: "text-teal-500" };
    if (valor >= benchmark.medio) return { nivel: "medio", color: "text-yellow-500" };
    return { nivel: "bajo", color: "text-red-500" };
  }
}

export default function IndicadoresPage() {
  const [data, setData] = useState<IndicadoresData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/finanzas/indicadores")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Indicadores Económicos</h1>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Indicadores Económicos</h1>
        <p className="text-muted-foreground">Error al cargar indicadores.</p>
      </div>
    );
  }

  const ratiosArray: Array<{
    key: keyof typeof data.ratios;
    ratio: Ratio;
    invertido?: boolean;
  }> = [
    { key: "roe", ratio: data.ratios.roe },
    { key: "roa", ratio: data.ratios.roa },
    { key: "margenOperativo", ratio: data.ratios.margenOperativo },
    { key: "rotacionActivos", ratio: data.ratios.rotacionActivos },
    { key: "ratioCorriente", ratio: data.ratios.ratioCorriente },
    { key: "endeudamiento", ratio: data.ratios.endeudamiento, invertido: true },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Indicadores Económicos</h1>
        <p className="text-muted-foreground">
          Ratios financieros y análisis de rentabilidad
        </p>
      </div>

      {/* Ratios Cards con Sparklines */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ratiosArray.map(({ key, ratio, invertido }) => {
          const historico = data.historico.map((h) => ({ value: h[key] }));
          const benchmark = data.benchmarks[key];
          const { nivel, color } = calcularNivelBenchmark(
            ratio.valor,
            benchmark,
            invertido
          );

          // Calcular tendencia (comparar último vs promedio)
          const promedio =
            historico.reduce((sum, h) => sum + h.value, 0) / historico.length;
          const tendencia = ratio.valor > promedio;

          return (
            <div
              key={key}
              className="rounded-lg border bg-card p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {ratio.label}
                  </p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <p className={`text-3xl font-bold tracking-tight ${color}`}>
                      {ratio.valor}
                      <span className="text-lg ml-1">{ratio.unidad}</span>
                    </p>
                    {tendencia ? (
                      <TrendingUp className="h-4 w-4 text-teal-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
                <Activity className={`h-5 w-5 ${color}`} />
              </div>

              {/* Sparkline */}
              <div className="h-12 -mx-2 mb-3">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historico}>
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={
                        nivel === "alto"
                          ? "#10b981"
                          : nivel === "medio"
                          ? "#eab308"
                          : "#ef4444"
                      }
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Descripción y Benchmark */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">{ratio.descripcion}</p>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      nivel === "alto"
                        ? "default"
                        : nivel === "medio"
                        ? "secondary"
                        : "destructive"
                    }
                    className="text-[10px] px-2 py-0"
                  >
                    {nivel === "alto"
                      ? "Excelente"
                      : nivel === "medio"
                      ? "Normal"
                      : "Bajo"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Benchmark: {benchmark.bajo}-{benchmark.medio}-{benchmark.alto}
                    {ratio.unidad}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Balance Sheet Summary */}
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="p-6 border-b">
          <h3 className="font-semibold">Balance General (Simplificado)</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Datos utilizados para calcular los ratios
          </p>
        </div>

        <div className="p-6 grid gap-6 md:grid-cols-3">
          {/* ACTIVOS */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground">ACTIVOS</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Activo Corriente</span>
                <span className="font-medium">
                  ${data.balance.activoCorriente.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Activo No Corriente</span>
                <span className="font-medium">
                  ${data.balance.activoNoCorriente.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm font-semibold pt-2 border-t">
                <span>Total Activos</span>
                <span className="text-[#23e0ff]">
                  ${data.balance.totalActivos.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* PASIVOS */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground">PASIVOS</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Pasivo Corriente</span>
                <span className="font-medium">
                  ${data.balance.pasivoCorriente.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Pasivo No Corriente</span>
                <span className="font-medium">
                  ${data.balance.pasivoNoCorriente.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm font-semibold pt-2 border-t">
                <span>Total Pasivos</span>
                <span className="text-red-500">
                  ${data.balance.totalPasivos.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* PATRIMONIO */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground">
              PATRIMONIO NETO
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  (Activos - Pasivos)
                </span>
              </div>
              <div className="flex justify-between text-sm font-semibold pt-2 border-t">
                <span>Patrimonio Neto</span>
                <span
                  className={
                    data.balance.patrimonioNeto >= 0
                      ? "text-teal-500"
                      : "text-red-500"
                  }
                >
                  ${data.balance.patrimonioNeto.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Nota */}
      <div className="rounded-lg border bg-muted/50 p-4">
        <p className="text-sm text-muted-foreground">
          <strong>Nota:</strong> Los ratios son calculados automáticamente en base a los
          datos financieros y de flota. Los benchmarks son valores de referencia de la
          industria de alquiler de motos.
        </p>
      </div>
    </div>
  );
}
