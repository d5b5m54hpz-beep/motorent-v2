"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";

type Props = {
  tipo: string;
  datosAnalisis: Record<string, unknown> | null;
};

function renderField(label: string, value: unknown) {
  if (value === null || value === undefined) return null;

  let displayValue: string;
  if (typeof value === "number") {
    // If it looks like money (> 100 and has no % sign in label)
    if (label.toLowerCase().includes("monto") || label.toLowerCase().includes("ingreso") ||
        label.toLowerCase().includes("egreso") || label.toLowerCase().includes("gasto") ||
        label.toLowerCase().includes("promedio") || label.toLowerCase().includes("costo") ||
        label.toLowerCase().includes("precio") || label.toLowerCase().includes("saldo")) {
      displayValue = formatMoney(value);
    } else if (label.toLowerCase().includes("margen") || label.toLowerCase().includes("porcentaje") ||
               label.toLowerCase().includes("desviacion") || label.toLowerCase().includes("ratio")) {
      displayValue = `${value.toFixed(1)}%`;
    } else {
      displayValue = value.toLocaleString("es-AR");
    }
  } else if (typeof value === "boolean") {
    displayValue = value ? "Sí" : "No";
  } else {
    displayValue = String(value);
  }

  return (
    <div key={label} className="flex justify-between py-1.5 border-b last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{displayValue}</span>
    </div>
  );
}

const FIELD_LABELS: Record<string, Record<string, string>> = {
  GASTO_INUSUAL: {
    gastoId: "ID Gasto",
    montoGasto: "Monto del Gasto",
    categoria: "Categoría",
    promedioCategoria: "Promedio Categoría",
    desviacion: "Desviación",
    multiplicador: "Multiplicador vs Promedio",
  },
  PAGO_DUPLICADO: {
    pagoOriginalId: "Pago Original",
    pagoDuplicadoId: "Pago Duplicado",
    montoPago: "Monto",
    contratoId: "Contrato",
    diferenciaHoras: "Diferencia (horas)",
  },
  FACTURA_SIN_PAGO: {
    facturaId: "ID Factura",
    montoFactura: "Monto Factura",
    diasVencida: "Días Vencida",
    clienteNombre: "Cliente",
    clienteId: "ID Cliente",
  },
  MARGEN_BAJO: {
    motoId: "ID Moto",
    patente: "Patente",
    ingresos: "Ingresos",
    gastos: "Gastos",
    margen: "Margen",
  },
  STOCK_CRITICO: {
    repuestoId: "ID Repuesto",
    nombre: "Repuesto",
    stockActual: "Stock Actual",
    stockMinimo: "Stock Mínimo",
    diasHastaAgotamiento: "Días hasta Agotamiento",
    consumoMensual: "Consumo Mensual",
  },
  DESVIO_PRESUPUESTO: {
    categoriaId: "ID Categoría",
    categoriaNombre: "Categoría",
    montoPresupuestado: "Presupuestado",
    montoReal: "Real",
    desviacion: "Desviación",
  },
  FLUJO_CAJA_NEGATIVO: {
    saldoActual: "Saldo Actual",
    ingresosEsperados: "Ingresos Esperados",
    egresosComprometidos: "Egresos Comprometidos",
    proyeccion30dias: "Proyección 30 días",
  },
  VENCIMIENTO_PROXIMO: {
    motoId: "ID Moto",
    patente: "Patente",
    tipoDocumento: "Tipo Documento",
    fechaVencimiento: "Fecha Vencimiento",
    diasRestantes: "Días Restantes",
  },
  PATRON_SOSPECHOSO: {
    tipo: "Tipo Patrón",
    descripcion: "Descripción",
    cantidad: "Cantidad",
    clienteId: "ID Cliente",
    clienteNombre: "Cliente",
  },
  CONCILIACION_PENDIENTE: {
    conciliacionId: "ID Conciliación",
    montoPendiente: "Monto Pendiente",
    diasPendiente: "Días Pendiente",
  },
};

export function AnalisisDataCard({ tipo, datosAnalisis }: Props) {
  if (!datosAnalisis) return null;

  const fieldLabels = FIELD_LABELS[tipo] || {};
  const data = datosAnalisis as Record<string, unknown>;

  // Get ordered entries: known fields first, then unknown ones
  const knownKeys = Object.keys(fieldLabels);
  const unknownKeys = Object.keys(data).filter((k) => !knownKeys.includes(k));
  const orderedEntries = [
    ...knownKeys.filter((k) => data[k] !== undefined).map((k) => [k, data[k]] as const),
    ...unknownKeys.map((k) => [k, data[k]] as const),
  ];

  if (orderedEntries.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Datos del Análisis</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="divide-y">
          {orderedEntries.map(([key, value]) => {
            const label = fieldLabels[key] || key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
            return renderField(label, value);
          })}
        </div>
      </CardContent>
    </Card>
  );
}
