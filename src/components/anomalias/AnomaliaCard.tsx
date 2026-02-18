"use client";

import { Card, CardContent } from "@/components/ui/card";
import { SeveridadBadge } from "./SeveridadBadge";
import { EstadoBadge } from "./EstadoBadge";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

type AnomaliaItem = {
  id: string;
  tipo: string;
  severidad: string;
  titulo: string;
  montoInvolucrado: string | number | null;
  estado: string;
  createdAt: string;
};

const TIPO_LABELS: Record<string, string> = {
  GASTO_INUSUAL: "Gasto Inusual",
  PAGO_DUPLICADO: "Pago Duplicado",
  FACTURA_SIN_PAGO: "Factura Sin Pago",
  MARGEN_BAJO: "Margen Bajo",
  STOCK_CRITICO: "Stock Crítico",
  PATRON_SOSPECHOSO: "Patrón Sospechoso",
  DESVIO_PRESUPUESTO: "Desvío Presupuesto",
  CONCILIACION_PENDIENTE: "Conciliación Pendiente",
  VENCIMIENTO_PROXIMO: "Vencimiento Próximo",
  FLUJO_CAJA_NEGATIVO: "Flujo Caja Negativo",
};

export function AnomaliaCard({
  anomalia,
  onClick,
}: {
  anomalia: AnomaliaItem;
  onClick?: () => void;
}) {
  const monto = anomalia.montoInvolucrado ? Number(anomalia.montoInvolucrado) : null;

  return (
    <Card
      className={cn(
        "transition-colors cursor-pointer hover:border-primary/50 hover:shadow-sm",
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <SeveridadBadge severidad={anomalia.severidad} />
              <span className="text-xs text-muted-foreground">
                {TIPO_LABELS[anomalia.tipo] || anomalia.tipo}
              </span>
            </div>
            <p className="text-sm font-medium truncate">{anomalia.titulo}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(anomalia.createdAt).toLocaleString("es-AR")}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <EstadoBadge estado={anomalia.estado} />
            {monto !== null && (
              <span className="text-sm font-semibold">{formatMoney(monto)}</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
