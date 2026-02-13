"use client";

import { useState, useEffect } from "react";
import { DollarSign, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

type Repuesto = {
  id: string;
  nombre: string;
  categoria: string | null;
  costoPromedioArs: number;
  precioVenta: number;
};

type PrecioResuelto = {
  repuestoId: string;
  precioFinalArs: number;
  margenResultante: number;
  alertaMargen: string;
};

export function PreciosTab() {
  const [repuestos, setRepuestos] = useState<Repuesto[]>([]);
  const [preciosB2C, setPreciosB2C] = useState<Map<string, number>>(new Map());
  const [preciosRider, setPreciosRider] = useState<Map<string, number>>(new Map());
  const [preciosTaller, setPreciosTaller] = useState<Map<string, number>>(new Map());
  const [preciosInterno, setPreciosInterno] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch primeros 20 repuestos
      const resRepuestos = await fetch("/api/repuestos?limit=20&activo=true");
      if (!resRepuestos.ok) throw new Error();
      const dataRepuestos = await resRepuestos.json();
      const reps = dataRepuestos.data || [];
      setRepuestos(reps);

      // Resolver precios para cada lista
      const repuestoIds = reps.map((r: Repuesto) => r.id);

      const [b2c, rider, taller, interno] = await Promise.all([
        resolverBulk(repuestoIds, "B2C"),
        resolverBulk(repuestoIds, "RIDER"),
        resolverBulk(repuestoIds, "TALLER"),
        resolverBulk(repuestoIds, "INTERNO"),
      ]);

      setPreciosB2C(b2c);
      setPreciosRider(rider);
      setPreciosTaller(taller);
      setPreciosInterno(interno);
    } catch (error) {
      toast.error("Error al cargar precios");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const resolverBulk = async (
    repuestoIds: string[],
    listaCodigo: string
  ): Promise<Map<string, number>> => {
    try {
      const res = await fetch("/api/pricing-repuestos/resolver-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repuestoIds, listaPrecioCodigo: listaCodigo }),
      });

      if (!res.ok) return new Map();

      const data = await res.json();
      const map = new Map<string, number>();

      data.precios?.forEach((p: PrecioResuelto) => {
        map.set(p.repuestoId, p.precioFinalArs);
      });

      return map;
    } catch (error) {
      console.error(`Error resolviendo ${listaCodigo}:`, error);
      return new Map();
    }
  };

  const getMargenColor = (costo: number, precio: number): string => {
    if (precio === 0 || costo === 0) return "";
    const margen = (precio - costo) / precio;
    if (margen >= 0.35) return "bg-green-50";
    if (margen >= 0.25) return "bg-yellow-50";
    return "bg-red-50";
  };

  const calcularMargen = (costo: number, precio: number): string => {
    if (precio === 0 || costo === 0) return "-";
    const margen = ((precio - costo) / precio) * 100;
    return `${margen.toFixed(0)}%`;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Matriz de Precios
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Precios por lista para cada repuesto (primeros 20)
              </p>
            </div>
            <Button onClick={fetchData} disabled={loading} variant="outline">
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Recalcular
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando precios...</div>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Repuesto</TableHead>
                    <TableHead className="text-right">Costo Prom.</TableHead>
                    <TableHead className="text-right">B2C Retail</TableHead>
                    <TableHead className="text-right">Rider Activo</TableHead>
                    <TableHead className="text-right">Taller Externo</TableHead>
                    <TableHead className="text-right">Uso Interno</TableHead>
                    <TableHead className="text-center">Margen B2C</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {repuestos.map((rep) => {
                    const precioB2C = preciosB2C.get(rep.id) || rep.precioVenta || 0;
                    const precioRider = preciosRider.get(rep.id) || 0;
                    const precioTaller = preciosTaller.get(rep.id) || 0;
                    const precioInterno = preciosInterno.get(rep.id) || 0;
                    const margen = calcularMargen(rep.costoPromedioArs, precioB2C);
                    const margenColor = getMargenColor(rep.costoPromedioArs, precioB2C);

                    return (
                      <TableRow key={rep.id}>
                        <TableCell className="font-medium">
                          <div>
                            <div>{rep.nombre}</div>
                            {rep.categoria && (
                              <div className="text-xs text-muted-foreground">
                                {rep.categoria}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          ${rep.costoPromedioArs.toLocaleString("es-AR")}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${precioB2C.toLocaleString("es-AR")}
                        </TableCell>
                        <TableCell className="text-right">
                          ${precioRider.toLocaleString("es-AR")}
                        </TableCell>
                        <TableCell className="text-right">
                          ${precioTaller.toLocaleString("es-AR")}
                        </TableCell>
                        <TableCell className="text-right">
                          ${precioInterno.toLocaleString("es-AR")}
                        </TableCell>
                        <TableCell className={`text-center ${margenColor}`}>
                          <Badge variant="outline">{margen}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="mt-4 p-3 bg-muted rounded-lg text-xs space-y-1">
            <p>
              <strong>🟢 Verde:</strong> Margen ≥ 35% (objetivo alcanzado)
            </p>
            <p>
              <strong>🟡 Amarillo:</strong> Margen 25-35% (por debajo del objetivo)
            </p>
            <p>
              <strong>🔴 Rojo:</strong> Margen &lt; 25% (por debajo del mínimo)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
