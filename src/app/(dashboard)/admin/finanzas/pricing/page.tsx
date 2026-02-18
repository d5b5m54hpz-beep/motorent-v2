"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { TrendingUp, TrendingDown, Minus, DollarSign, Percent, BarChart3 } from "lucide-react";

type Moto = {
  id: string;
  marca: string;
  modelo: string;
  patente: string;
  precioMensual: number;
  estado: string;
};

type PricingConfig = {
  precioBaseMensual: number;
  descuentoSemanal: number;
  descuentoMeses3: number;
  descuentoMeses6: number;
  descuentoMeses9: number;
  descuentoMeses12: number;
};

type ContratoStats = {
  total: number;
  data: Array<{
    motoId: string;
    montoPeriodo: number | string;
    frecuenciaPago: string;
    estado: string;
  }>;
};

export default function PricingInteligentePage() {
  const [motos, setMotos] = useState<Moto[]>([]);
  const [config, setConfig] = useState<PricingConfig | null>(null);
  const [contratos, setContratos] = useState<ContratoStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [motosRes, configRes, contratosRes] = await Promise.all([
        fetch("/api/motos?limit=1000"),
        fetch("/api/pricing"),
        fetch("/api/contratos?limit=1000&estado=ACTIVO"),
      ]);

      if (motosRes.ok) {
        const d = await motosRes.json();
        setMotos(d?.data ?? []);
      }
      if (configRes.ok) setConfig(await configRes.json());
      if (contratosRes.ok) setContratos(await contratosRes.json());
    } catch (error) {
      console.error(error);
      toast.error("Error al cargar datos de pricing");
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(value);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-[300px]" />
      </div>
    );
  }

  // Compute analytics
  const motosConPrecio = motos.filter((m) => Number(m.precioMensual) > 0);
  const precioPromedio =
    motosConPrecio.length > 0
      ? motosConPrecio.reduce((sum, m) => sum + Number(m.precioMensual), 0) /
        motosConPrecio.length
      : 0;
  const precioMin = motosConPrecio.length > 0
    ? Math.min(...motosConPrecio.map((m) => Number(m.precioMensual)))
    : 0;
  const precioMax = motosConPrecio.length > 0
    ? Math.max(...motosConPrecio.map((m) => Number(m.precioMensual)))
    : 0;

  const motosDisponibles = motos.filter((m) => m.estado === "DISPONIBLE").length;
  const motosAlquiladas = motos.filter((m) => m.estado === "ALQUILADA").length;
  const tasaOcupacion = motos.length > 0 ? (motosAlquiladas / motos.length) * 100 : 0;

  const contratosActivos = contratos?.data?.length ?? 0;
  const ingresoMensualEstimado = contratos?.data?.reduce(
    (sum, c) => sum + Number(c.montoPeriodo || 0),
    0
  ) ?? 0;

  // Group motos by price range
  const rangos = [
    { label: "< $50.000", min: 0, max: 50000 },
    { label: "$50.000 - $100.000", min: 50000, max: 100000 },
    { label: "$100.000 - $200.000", min: 100000, max: 200000 },
    { label: "> $200.000", min: 200000, max: Infinity },
  ];

  const distribucion = rangos.map((r) => ({
    ...r,
    count: motosConPrecio.filter(
      (m) => Number(m.precioMensual) >= r.min && Number(m.precioMensual) < r.max
    ).length,
  }));

  // Motos sin precio asignado (using base price)
  const motosSinPrecio = motos.filter((m) => Number(m.precioMensual) === 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Pricing Inteligente
          </h1>
          <p className="text-muted-foreground">
            Análisis de precios, ocupación y rentabilidad de la flota
          </p>
        </div>
        <TrendingUp className="h-10 w-10 text-muted-foreground" />
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              Precio Promedio
            </div>
            <p className="mt-1 text-2xl font-bold font-mono">
              {formatCurrency(precioPromedio)}
            </p>
            <p className="text-xs text-muted-foreground">
              Rango: {formatCurrency(precioMin)} – {formatCurrency(precioMax)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Percent className="h-4 w-4" />
              Tasa de Ocupación
            </div>
            <p className="mt-1 text-2xl font-bold">
              {tasaOcupacion.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">
              {motosAlquiladas} alquiladas / {motos.length} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BarChart3 className="h-4 w-4" />
              Contratos Activos
            </div>
            <p className="mt-1 text-2xl font-bold">{contratosActivos}</p>
            <p className="text-xs text-muted-foreground">
              {motosDisponibles} motos disponibles
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              Ingreso Mensual Est.
            </div>
            <p className="mt-1 text-2xl font-bold font-mono">
              {formatCurrency(ingresoMensualEstimado)}
            </p>
            <p className="text-xs text-muted-foreground">
              Basado en contratos activos
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Distribución de precios */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribución de Precios</CardTitle>
            <CardDescription>
              Cantidad de motos por rango de precio mensual
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {distribucion.map((r) => {
                const pct =
                  motosConPrecio.length > 0
                    ? (r.count / motosConPrecio.length) * 100
                    : 0;
                return (
                  <div key={r.label} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{r.label}</span>
                      <span className="font-medium">
                        {r.count} moto{r.count !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-teal-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Descuentos vigentes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Descuentos Vigentes</CardTitle>
            <CardDescription>
              Tabla de descuentos por duración de contrato
            </CardDescription>
          </CardHeader>
          <CardContent>
            {config ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <span className="text-sm">Precio base mensual</span>
                  <span className="font-mono font-medium">
                    {formatCurrency(config.precioBaseMensual)}
                  </span>
                </div>
                {[
                  { label: "Semanal", value: config.descuentoSemanal },
                  { label: "3 meses", value: config.descuentoMeses3 },
                  { label: "6 meses", value: config.descuentoMeses6 },
                  { label: "9 meses", value: config.descuentoMeses9 },
                  { label: "12 meses", value: config.descuentoMeses12 },
                ].map((d) => (
                  <div
                    key={d.label}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <span className="text-sm">{d.label}</span>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={d.value > 0 ? "default" : "secondary"}
                        className="font-mono"
                      >
                        {d.value > 0 ? (
                          <TrendingDown className="mr-1 h-3 w-3" />
                        ) : (
                          <Minus className="mr-1 h-3 w-3" />
                        )}
                        {d.value}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No hay configuración de precios
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Motos sin precio */}
      {motosSinPrecio.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="text-base text-amber-800 dark:text-amber-200">
              Motos sin Precio Individual
            </CardTitle>
            <CardDescription>
              Estas motos usan el precio base ({formatCurrency(config?.precioBaseMensual ?? 0)}). Asigná un precio individual desde &quot;Precios por Moto&quot;.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {motosSinPrecio.map((m) => (
                <Badge key={m.id} variant="outline">
                  {m.marca} {m.modelo} ({m.patente})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
