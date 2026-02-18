import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Bike, Calendar, CreditCard, TrendingDown } from "lucide-react";
import { calcularPreciosContrato } from "@/lib/contratos";

type Moto = {
  id: string;
  marca: string;
  modelo: string;
  anio: number;
  tipo?: string | null;
  imagen?: string | null;
  patente?: string;
};

type Plan = {
  fechaInicio: Date;
  duracion: number; // months
  frecuencia: "SEMANAL" | "QUINCENAL" | "MENSUAL";
};

type Props = {
  moto: Moto;
  plan: Plan;
  pricing: ReturnType<typeof calcularPreciosContrato>;
  showPaymentSchedule?: boolean;
};

export function RentalSummary({ moto, plan, pricing, showPaymentSchedule = false }: Props) {
  const tipoBadgeColors: Record<string, string> = {
    naked: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    touring: "bg-teal-50 text-teal-800 dark:bg-teal-900 dark:text-teal-300",
    sport: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    scooter: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    custom: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  };

  const fechaFin = new Date(plan.fechaInicio);
  fechaFin.setMonth(fechaFin.getMonth() + plan.duracion);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bike className="h-5 w-5" />
          Resumen del Alquiler
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Moto */}
        <div className="flex items-start gap-4">
          {moto.imagen ? (
            <img
              src={moto.imagen}
              alt={`${moto.marca} ${moto.modelo}`}
              className="h-20 w-20 rounded-lg object-cover"
            />
          ) : (
            <div className="h-20 w-20 rounded-lg bg-muted flex items-center justify-center">
              <Bike className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1">
            <h3 className="font-semibold">
              {moto.marca} {moto.modelo}
            </h3>
            <p className="text-sm text-muted-foreground">Año {moto.anio}</p>
            {moto.tipo && (
              <Badge variant="outline" className={`mt-1 text-xs ${tipoBadgeColors[moto.tipo] || ""}`}>
                {moto.tipo}
              </Badge>
            )}
          </div>
        </div>

        <Separator />

        {/* Fechas */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Período de Alquiler</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-muted-foreground">Inicio:</p>
              <p className="font-medium">{formatDate(plan.fechaInicio)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Fin:</p>
              <p className="font-medium">{formatDate(fechaFin)}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Duración: {plan.duracion} {plan.duracion === 1 ? "mes" : "meses"}
          </p>
        </div>

        <Separator />

        {/* Plan de Pagos */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Plan de Pagos</span>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Frecuencia:</span>
              <span className="font-medium capitalize">{plan.frecuencia}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Número de pagos:</span>
              <span className="font-medium">{pricing.periodos}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Monto por pago:</span>
              <span className="font-semibold">{formatCurrency(pricing.montoPeriodo)}</span>
            </div>
          </div>
        </div>

        {/* Descuentos */}
        {pricing.descuentoTotal > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-teal-600 dark:text-teal-400">
                <TrendingDown className="h-4 w-4" />
                <span className="font-medium">Descuentos Aplicados</span>
              </div>
              <div className="space-y-1 text-sm">
                {pricing.descuentoDuracion > 0 && (
                  <div className="flex justify-between pl-6">
                    <span className="text-muted-foreground">Por duración ({pricing.meses} meses):</span>
                    <span className="text-teal-600 dark:text-teal-400 font-medium">
                      -{pricing.descuentoDuracion}%
                    </span>
                  </div>
                )}
                {pricing.descuentoFrecuencia > 0 && (
                  <div className="flex justify-between pl-6">
                    <span className="text-muted-foreground">Por frecuencia {plan.frecuencia}:</span>
                    <span className="text-teal-600 dark:text-teal-400 font-medium">
                      -{pricing.descuentoFrecuencia}%
                    </span>
                  </div>
                )}
                <div className="flex justify-between pl-6 pt-1 border-t">
                  <span className="text-muted-foreground">Descuento total:</span>
                  <span className="text-teal-600 dark:text-teal-400 font-semibold">
                    -{pricing.descuentoTotal}%
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        <Separator />

        {/* Total */}
        <div className="flex justify-between items-center pt-2">
          <span className="text-lg font-semibold">TOTAL A PAGAR:</span>
          <span className="text-2xl font-bold text-primary">
            {formatCurrency(pricing.montoTotal)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
