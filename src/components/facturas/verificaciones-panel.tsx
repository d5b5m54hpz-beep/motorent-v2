"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, XCircle, AlertTriangle, Loader2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type Verificacion = {
  id: string;
  label: string;
  estado: "validando" | "ok" | "warning" | "error" | "info";
  mensaje?: string;
  detalles?: string[];
};

type Props = {
  data: {
    cuit?: string;
    tipo?: string;
    numero?: string;
    puntoVenta?: string;
    subtotal?: number;
    iva21?: number;
    iva105?: number;
    iva27?: number;
    percepcionIVA?: number;
    percepcionIIBB?: number;
    impInterno?: number;
    noGravado?: number;
    exento?: number;
    total?: number;
    fecha?: string;
    vencimiento?: string;
    caeVencimiento?: string;
    cae?: string;
  };
  onValidationChange?: (tieneErrores: boolean) => void;
};

export function VerificacionesPanel({ data, onValidationChange }: Props) {
  const [verificaciones, setVerificaciones] = useState<Verificacion[]>([]);

  useEffect(() => {
    validarTodo();
  }, [data]);

  useEffect(() => {
    const tieneErrores = verificaciones.some((v) => v.estado === "error");
    onValidationChange?.(tieneErrores);
  }, [verificaciones, onValidationChange]);

  const validarTodo = async () => {
    const nuevasVerificaciones: Verificacion[] = [];

    // 1. VALIDAR CUIT
    if (data.cuit) {
      const clean = data.cuit.replace(/[-\s]/g, "");
      if (clean.length === 11 && /^\d+$/.test(clean)) {
        const mult = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
        let sum = 0;
        for (let i = 0; i < 10; i++) sum += parseInt(clean[i]) * mult[i];
        const mod = sum % 11;
        const verificador = mod === 0 ? 0 : mod === 1 ? 9 : 11 - mod;
        const digitoVerificador = parseInt(clean[10]);

        if (verificador === digitoVerificador) {
          nuevasVerificaciones.push({
            id: "cuit",
            label: "CUIT válido",
            estado: "ok",
            mensaje: `${data.cuit} ✓`,
          });
        } else {
          nuevasVerificaciones.push({
            id: "cuit",
            label: "CUIT inválido",
            estado: "error",
            mensaje: `Dígito verificador incorrecto`,
          });
        }
      } else {
        nuevasVerificaciones.push({
          id: "cuit",
          label: "CUIT formato incorrecto",
          estado: "error",
          mensaje: "Debe tener 11 dígitos",
        });
      }
    } else {
      nuevasVerificaciones.push({
        id: "cuit",
        label: "CUIT no ingresado",
        estado: "info",
      });
    }

    // 2. VALIDAR MONTOS
    if (
      data.subtotal !== undefined &&
      data.total !== undefined &&
      data.iva21 !== undefined &&
      data.iva105 !== undefined &&
      data.iva27 !== undefined
    ) {
      const totalCalculado =
        (data.subtotal || 0) +
        (data.iva21 || 0) +
        (data.iva105 || 0) +
        (data.iva27 || 0) +
        (data.percepcionIVA || 0) +
        (data.percepcionIIBB || 0) +
        (data.impInterno || 0) +
        (data.noGravado || 0) +
        (data.exento || 0);

      const diferencia = Math.abs(totalCalculado - data.total);

      if (diferencia <= 0.99) {
        nuevasVerificaciones.push({
          id: "montos",
          label: "Montos cuadran",
          estado: "ok",
          mensaje: `Total: $${data.total.toFixed(2)}`,
        });
      } else {
        nuevasVerificaciones.push({
          id: "montos",
          label: "Montos no cuadran",
          estado: "error",
          mensaje: `Diferencia: $${diferencia.toFixed(2)}`,
          detalles: [
            `Calculado: $${totalCalculado.toFixed(2)}`,
            `Declarado: $${data.total.toFixed(2)}`,
          ],
        });
      }
    }

    // 3. VALIDAR FECHAS
    if (data.fecha) {
      const fechaEmision = new Date(data.fecha);
      const ahora = new Date();

      if (fechaEmision > ahora) {
        nuevasVerificaciones.push({
          id: "fecha",
          label: "Fecha de emisión",
          estado: "error",
          mensaje: "No puede ser futura",
        });
      } else {
        const hace12Meses = new Date();
        hace12Meses.setMonth(hace12Meses.getMonth() - 12);

        if (fechaEmision < hace12Meses) {
          nuevasVerificaciones.push({
            id: "fecha",
            label: "Fecha de emisión",
            estado: "warning",
            mensaje: "Factura muy antigua (>12 meses)",
          });
        } else {
          nuevasVerificaciones.push({
            id: "fecha",
            label: "Fecha válida",
            estado: "ok",
          });
        }
      }
    }

    // 4. DETECTAR DUPLICADOS
    if (data.cuit && data.tipo && data.numero) {
      nuevasVerificaciones.push({
        id: "duplicados",
        label: "Verificando duplicados",
        estado: "validando",
      });

      try {
        const res = await fetch("/api/facturas-compra/detectar-duplicados", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cuit: data.cuit,
            tipo: data.tipo,
            numero: data.numero,
            puntoVenta: data.puntoVenta,
            total: data.total,
            fecha: data.fecha,
            cae: data.cae,
          }),
        });

        if (res.ok) {
          const result = await res.json();

          if (result.bloqueado) {
            nuevasVerificaciones.push({
              id: "duplicados",
              label: "DUPLICADO DETECTADO",
              estado: "error",
              mensaje: "Esta factura ya existe",
              detalles: result.duplicados
                .filter((d: { severidad: string }) => d.severidad === "CRITICO")
                .map((d: { mensajes: string[] }) => d.mensajes.join(", ")),
            });
          } else if (result.resumen.sospechosos > 0) {
            nuevasVerificaciones.push({
              id: "duplicados",
              label: "Posible duplicado",
              estado: "warning",
              mensaje: `${result.resumen.sospechosos} factura(s) similar(es)`,
            });
          } else {
            nuevasVerificaciones.push({
              id: "duplicados",
              label: "Sin duplicados",
              estado: "ok",
            });
          }
        }
      } catch (err) {
        nuevasVerificaciones.push({
          id: "duplicados",
          label: "Error verificando duplicados",
          estado: "warning",
          mensaje: "No se pudo verificar",
        });
      }
    }

    // 5. VALIDAR CAE (si existe)
    if (data.cae) {
      const caeNumerico = data.cae.replace(/\D/g, "");
      if (caeNumerico.length === 14) {
        nuevasVerificaciones.push({
          id: "cae",
          label: "CAE formato válido",
          estado: "ok",
          mensaje: data.cae,
        });
      } else {
        nuevasVerificaciones.push({
          id: "cae",
          label: "CAE formato inválido",
          estado: "warning",
          mensaje: "Debe tener 14 dígitos",
        });
      }
    }

    setVerificaciones(nuevasVerificaciones);
  };

  const getIcon = (estado: Verificacion["estado"]) => {
    switch (estado) {
      case "ok":
        return <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />;
      case "validando":
        return <Loader2 className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-spin" />;
      case "info":
        return <Info className="h-4 w-4 text-gray-400" />;
    }
  };

  const estadoGeneral = verificaciones.some((v) => v.estado === "error")
    ? "error"
    : verificaciones.some((v) => v.estado === "warning")
    ? "warning"
    : verificaciones.some((v) => v.estado === "validando")
    ? "validando"
    : "ok";

  return (
    <Card className="p-4 sticky top-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Verificaciones</h3>
          <Badge
            variant="outline"
            className={cn(
              estadoGeneral === "ok" && "border-green-600 text-green-600",
              estadoGeneral === "warning" && "border-yellow-600 text-yellow-600",
              estadoGeneral === "error" && "border-red-600 text-red-600",
              estadoGeneral === "validando" && "border-blue-600 text-blue-600"
            )}
          >
            {estadoGeneral === "ok" && "Todo OK"}
            {estadoGeneral === "warning" && "Con Warnings"}
            {estadoGeneral === "error" && "Con Errores"}
            {estadoGeneral === "validando" && "Verificando..."}
          </Badge>
        </div>

        <Separator />

        <div className="space-y-2">
          {verificaciones.map((v) => (
            <div key={v.id} className="space-y-1">
              <div className="flex items-start gap-2">
                {getIcon(v.estado)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight">{v.label}</p>
                  {v.mensaje && (
                    <p className="text-xs text-muted-foreground">{v.mensaje}</p>
                  )}
                  {v.detalles && v.detalles.length > 0 && (
                    <ul className="mt-1 space-y-0.5">
                      {v.detalles.map((d, i) => (
                        <li key={i} className="text-xs text-muted-foreground ml-4">
                          • {d}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          ))}

          {verificaciones.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Completá los campos para validar
            </p>
          )}
        </div>

        {estadoGeneral === "error" && (
          <>
            <Separator />
            <div className="rounded-lg bg-red-50 dark:bg-red-950 p-3">
              <p className="text-xs text-red-800 dark:text-red-200 font-medium">
                ⛔ No se puede guardar la factura con errores
              </p>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
