"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { Calculator, TrendingDown } from "lucide-react";
import { calcularPreciosContrato } from "@/lib/contratos";

type PricingConfig = {
  precioBaseMensual: number;
  descuentoSemanal: number;
  descuentoMeses3: number;
  descuentoMeses6: number;
  descuentoMeses9: number;
  descuentoMeses12: number;
};

type Props = {
  basePrice: number;
  pricingConfig: PricingConfig;
  onPlanChange?: (plan: {
    duracion: number;
    frecuencia: "semanal" | "quincenal" | "mensual";
    pricing: ReturnType<typeof calcularPreciosContrato>;
  }) => void;
};

export function PriceCalculator({ basePrice, pricingConfig, onPlanChange }: Props) {
  const [duracion, setDuracion] = useState(1);
  const [frecuencia, setFrecuencia] = useState<"semanal" | "quincenal" | "mensual">("mensual");
  const [pricing, setPricing] = useState<ReturnType<typeof calcularPreciosContrato> | null>(null);

  useEffect(() => {
    // Calculate pricing whenever duration or frequency changes
    const today = new Date();
    const endDate = new Date(today);
    endDate.setMonth(endDate.getMonth() + duracion);

    const calculated = calcularPreciosContrato(
      basePrice,
      today,
      endDate,
      frecuencia,
      pricingConfig
    );

    setPricing(calculated);

    // Notify parent if callback provided
    if (onPlanChange) {
      onPlanChange({ duracion, frecuencia, pricing: calculated });
    }
  }, [duracion, frecuencia, basePrice, pricingConfig, onPlanChange]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calculator className="h-5 w-5" />
          Calculadora de Precio
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Frecuencia de Pago */}
        <div className="space-y-2">
          <Label htmlFor="frecuencia">Frecuencia de Pago</Label>
          <Select value={frecuencia} onValueChange={(v) => setFrecuencia(v as typeof frecuencia)}>
            <SelectTrigger id="frecuencia">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semanal">
                Semanal
                {pricingConfig.descuentoSemanal > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    -{pricingConfig.descuentoSemanal}%
                  </Badge>
                )}
              </SelectItem>
              <SelectItem value="quincenal">
                Quincenal
                {pricingConfig.descuentoSemanal > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    -{pricingConfig.descuentoSemanal}%
                  </Badge>
                )}
              </SelectItem>
              <SelectItem value="mensual">Mensual</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Duración */}
        <div className="space-y-2">
          <Label htmlFor="duracion">Duración (meses)</Label>
          <Select value={duracion.toString()} onValueChange={(v) => setDuracion(parseInt(v))}>
            <SelectTrigger id="duracion">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((months) => {
                let discount = 0;
                if (months >= 12) discount = pricingConfig.descuentoMeses12;
                else if (months >= 9) discount = pricingConfig.descuentoMeses9;
                else if (months >= 6) discount = pricingConfig.descuentoMeses6;
                else if (months >= 3) discount = pricingConfig.descuentoMeses3;

                return (
                  <SelectItem key={months} value={months.toString()}>
                    {months} {months === 1 ? "mes" : "meses"}
                    {discount > 0 && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        -{discount}%
                      </Badge>
                    )}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {pricing && (
          <>
            <Separator />

            {/* Resumen de Precios */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Resumen</h4>

              {/* Base Price */}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Precio base mensual:</span>
                <span>{formatCurrency(basePrice)}</span>
              </div>

              {/* Descuentos */}
              {pricing.descuentoTotal > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                    <TrendingDown className="h-4 w-4" />
                    <span className="font-medium">Descuentos aplicados:</span>
                  </div>

                  {pricing.descuentoDuracion > 0 && (
                    <div className="flex justify-between text-sm pl-6">
                      <span className="text-muted-foreground">
                        Por {pricing.meses} meses:
                      </span>
                      <span className="text-green-600 dark:text-green-400">
                        -{pricing.descuentoDuracion}%
                      </span>
                    </div>
                  )}

                  {pricing.descuentoFrecuencia > 0 && (
                    <div className="flex justify-between text-sm pl-6">
                      <span className="text-muted-foreground">Por frecuencia {frecuencia}:</span>
                      <span className="text-green-600 dark:text-green-400">
                        -{pricing.descuentoFrecuencia}%
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-muted-foreground">Precio mensual con descuento:</span>
                    <span>{formatCurrency(pricing.precioMensualConDescuento)}</span>
                  </div>
                </div>
              )}

              <Separator />

              {/* Precio por Período */}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Pago por {frecuencia === "semanal" ? "semana" : frecuencia === "quincenal" ? "quincena" : "mes"}:
                </span>
                <span className="font-semibold">{formatCurrency(pricing.montoPeriodo)}</span>
              </div>

              {/* Número de Pagos */}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Número de pagos:</span>
                <span>{pricing.periodos}</span>
              </div>

              <Separator className="my-3" />

              {/* Total */}
              <div className="flex justify-between items-center">
                <span className="text-base font-semibold">TOTAL:</span>
                <span className="text-2xl font-bold text-primary">
                  {formatCurrency(pricing.montoTotal)}
                </span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
