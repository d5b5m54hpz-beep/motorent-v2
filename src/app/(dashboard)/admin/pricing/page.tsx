"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Save, Settings, Percent } from "lucide-react";

type PricingConfig = {
  precioBaseMensual: number;
  descuentoSemanal: number;
  descuentoMeses3: number;
  descuentoMeses6: number;
  descuentoMeses9: number;
  descuentoMeses12: number;
};

export default function PricingConfigPage() {
  const [config, setConfig] = useState<PricingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  async function fetchConfig() {
    setLoading(true);
    try {
      const res = await fetch("/api/pricing");
      if (!res.ok) throw new Error("Error al cargar configuración");
      const data = await res.json();
      setConfig(data);
    } catch (error) {
      console.error(error);
      toast.error("Error al cargar configuración de precios");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!config) return;
    setSaving(true);
    try {
      const res = await fetch("/api/pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al guardar");
      }
      toast.success("Configuración actualizada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  function updateField(field: keyof PricingConfig, value: string) {
    if (!config) return;
    setConfig({ ...config, [field]: parseFloat(value) || 0 });
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
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        No se pudo cargar la configuración de precios
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Configuración de Precios
          </h1>
          <p className="text-muted-foreground">
            Precio base y descuentos por duración de contrato
          </p>
        </div>
        <Settings className="h-10 w-10 text-muted-foreground" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Precio Base */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Precio Base Mensual</CardTitle>
            <CardDescription>
              Precio de referencia para motos sin precio individual asignado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="precioBase">Monto (ARS)</Label>
              <Input
                id="precioBase"
                type="number"
                value={config.precioBaseMensual}
                onChange={(e) => updateField("precioBaseMensual", e.target.value)}
                className="text-lg font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Valor actual: {formatCurrency(config.precioBaseMensual)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Descuento Semanal */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Descuento Semanal
            </CardTitle>
            <CardDescription>
              Descuento aplicado a contratos con frecuencia semanal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="descSemanal">Porcentaje (%)</Label>
              <Input
                id="descSemanal"
                type="number"
                value={config.descuentoSemanal}
                onChange={(e) => updateField("descuentoSemanal", e.target.value)}
                min={0}
                max={100}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Descuentos por duración */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Descuentos por Duración</CardTitle>
          <CardDescription>
            Porcentaje de descuento según la duración del contrato
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="desc3">3 meses (%)</Label>
              <Input
                id="desc3"
                type="number"
                value={config.descuentoMeses3}
                onChange={(e) => updateField("descuentoMeses3", e.target.value)}
                min={0}
                max={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc6">6 meses (%)</Label>
              <Input
                id="desc6"
                type="number"
                value={config.descuentoMeses6}
                onChange={(e) => updateField("descuentoMeses6", e.target.value)}
                min={0}
                max={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc9">9 meses (%)</Label>
              <Input
                id="desc9"
                type="number"
                value={config.descuentoMeses9}
                onChange={(e) => updateField("descuentoMeses9", e.target.value)}
                min={0}
                max={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc12">12 meses (%)</Label>
              <Input
                id="desc12"
                type="number"
                value={config.descuentoMeses12}
                onChange={(e) => updateField("descuentoMeses12", e.target.value)}
                min={0}
                max={100}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Guardando..." : "Guardar Configuración"}
        </Button>
      </div>
    </div>
  );
}
