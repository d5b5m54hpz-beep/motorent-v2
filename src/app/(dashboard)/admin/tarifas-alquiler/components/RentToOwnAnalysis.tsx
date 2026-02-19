"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Home, TrendingUp, DollarSign } from "lucide-react";

const ARS = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

type Props = {
  costoLandedARS: number;
  cuotaMensual: number;
  costoTotal24Meses: number;
  diferenciaVsLanded: number;
  teaImplicita: number;
  modeloMoto?: string;
};

export function RentToOwnAnalysis({
  costoLandedARS,
  cuotaMensual,
  costoTotal24Meses,
  diferenciaVsLanded,
  teaImplicita,
  modeloMoto,
}: Props) {
  const pctSobre = costoLandedARS > 0 ? ((diferenciaVsLanded / costoLandedARS) * 100).toFixed(1) : "0";

  return (
    <Card className="border-cyan-400/30 bg-cyan-950/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Home className="h-4 w-4 text-cyan-400" />
          Análisis Rent-to-Own
          {modeloMoto && (
            <Badge variant="outline" className="ml-auto text-xs border-cyan-400/50 text-cyan-400">
              {modeloMoto}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              Costo Landed
            </p>
            <p className="text-lg font-bold font-mono">{ARS(costoLandedARS)}</p>
            <p className="text-xs text-muted-foreground">Valor de la moto</p>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Total 24 cuotas</p>
            <p className="text-lg font-bold font-mono text-cyan-400">{ARS(costoTotal24Meses)}</p>
            <p className="text-xs text-muted-foreground">{ARS(cuotaMensual)}/mes</p>
          </div>

          <div className="space-y-1 col-span-2 sm:col-span-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Diferencial
            </p>
            <p className="text-lg font-bold font-mono text-orange-400">{ARS(diferenciaVsLanded)}</p>
            <p className="text-xs text-muted-foreground">+{pctSobre}% sobre el valor</p>
          </div>
        </div>

        <div className="mt-4 rounded-lg bg-muted/30 p-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">TEA Implícita</p>
            <p className="text-xl font-bold text-orange-400">{teaImplicita.toFixed(1)}%</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Al completar 24 pagos</p>
            <p className="text-sm font-semibold text-cyan-400">Transferencia de propiedad</p>
          </div>
        </div>

        <div className="mt-3 text-xs text-muted-foreground bg-muted/20 rounded-md p-2">
          El cliente paga {ARS(cuotaMensual)}/mes × 24 meses y se convierte en propietario de la moto sin valor residual.
          La diferencia de {ARS(diferenciaVsLanded)} ({pctSobre}%) cubre el costo de oportunidad del capital.
        </div>
      </CardContent>
    </Card>
  );
}
