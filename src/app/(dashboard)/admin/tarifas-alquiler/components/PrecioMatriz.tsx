"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { MargenBadge } from "./MargenBadge";

const ARS = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

export type PrecioRow = {
  id: string;
  modeloMoto: string;
  margenPct: number | string;
  margenObjetivoPct: number | string;
  precioConDescuento: number | string;
  precioManual?: number | string | null;
  plan: { id: string; nombre: string; codigo: string };
};

type Props = {
  precios: PrecioRow[];
  onChange: (id: string, newPrecio: number | null) => void;
};

export function PrecioMatriz({ precios, onChange }: Props) {
  const [editing, setEditing] = useState<Record<string, string>>({});

  const modelos = [...new Set(precios.map((p) => p.modeloMoto))].sort();
  const planes = [...new Map(precios.map((p) => [p.plan.id, p.plan])).values()];

  const getCell = (modelo: string, planId: string) =>
    precios.find((p) => p.modeloMoto === modelo && p.plan.id === planId);

  const handleFocus = (id: string, current: number) => {
    setEditing((e) => ({ ...e, [id]: String(current) }));
  };

  const handleChange = (id: string, val: string) => {
    setEditing((e) => ({ ...e, [id]: val }));
  };

  const handleBlur = (id: string) => {
    const val = editing[id];
    if (val === undefined) return;
    const num = parseFloat(val.replace(/\./g, "").replace(",", "."));
    onChange(id, isNaN(num) ? null : num);
    setEditing((e) => {
      const next = { ...e };
      delete next[id];
      return next;
    });
  };

  if (modelos.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Sin precios configurados. Usá &quot;Recalcular Todos&quot; para generar la matriz.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Matriz de Precios — Modelo × Plan</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="sticky left-0 bg-muted/80 px-4 py-2 text-left font-medium min-w-[140px] z-10">
                  Modelo
                </th>
                {planes.map((p) => (
                  <th key={p.id} className="px-4 py-2 text-center font-medium min-w-[140px]">
                    {p.nombre}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {modelos.map((modelo) => (
                <tr key={modelo} className="border-b hover:bg-muted/20">
                  <td className="sticky left-0 bg-background px-4 py-2 font-medium z-10 border-r">{modelo}</td>
                  {planes.map((plan) => {
                    const cell = getCell(modelo, plan.id);
                    if (!cell) {
                      return (
                        <td key={plan.id} className="px-4 py-2 text-center text-muted-foreground">
                          —
                        </td>
                      );
                    }
                    const margenPct = Number(cell.margenPct);
                    const margenObj = Number(cell.margenObjetivoPct);
                    const precioActual = Number(cell.precioManual ?? cell.precioConDescuento);
                    const isEditing = editing[cell.id] !== undefined;

                    return (
                      <td key={plan.id} className="px-4 py-2 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <Input
                            value={isEditing ? editing[cell.id] : String(Math.round(precioActual))}
                            onFocus={() => handleFocus(cell.id, precioActual)}
                            onChange={(e) => handleChange(cell.id, e.target.value)}
                            onBlur={() => handleBlur(cell.id)}
                            className={cn(
                              "h-7 w-28 text-right text-xs font-mono",
                              margenPct < 10 && "border-red-400 focus-visible:ring-red-400",
                            )}
                          />
                          <div className="flex items-center gap-1">
                            <MargenBadge pct={margenPct} objetivo={margenObj} />
                            {cell.precioManual != null && (
                              <Badge variant="outline" className="text-xs">Manual</Badge>
                            )}
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
