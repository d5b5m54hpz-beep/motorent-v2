"use client";

import { useState, useEffect } from "react";
import { Ship, Package, TrendingUp, AlertTriangle, DollarSign, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

type EmbarqueStats = {
  total: number;
  enTransito: number;
  enAduana: number;
  valorTotalFobUsd: number;
  valorTotalCifUsd: number;
};

type Embarque = {
  id: string;
  referencia: string;
  estado: string;
  totalFobUsd: number;
  cifUsd: number | null;
  fechaSalida: string | null;
  proveedor: {
    nombre: string;
  };
  createdAt: string;
};

const ESTADO_COLORS: Record<string, string> = {
  BORRADOR: "bg-gray-500",
  EN_TRANSITO: "bg-blue-500",
  EN_ADUANA: "bg-yellow-500",
  COSTO_FINALIZADO: "bg-green-500",
  RECIBIDO: "bg-teal-500",
};

const ESTADO_LABELS: Record<string, string> = {
  BORRADOR: "Borrador",
  EN_TRANSITO: "En Tránsito",
  EN_ADUANA: "En Aduana",
  COSTO_FINALIZADO: "Costo Finalizado",
  RECIBIDO: "Recibido",
};

export function ResumenTab() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<EmbarqueStats>({
    total: 0,
    enTransito: 0,
    enAduana: 0,
    valorTotalFobUsd: 0,
    valorTotalCifUsd: 0,
  });
  const [ultimosEmbarques, setUltimosEmbarques] = useState<Embarque[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch all embarques to calculate stats
      const res = await fetch("/api/embarques?limit=100");
      if (!res.ok) throw new Error("Error al cargar embarques");

      const data = await res.json();
      const embarques = data.data || [];

      // Calculate stats
      const newStats: EmbarqueStats = {
        total: embarques.length,
        enTransito: embarques.filter((e: Embarque) => e.estado === "EN_TRANSITO").length,
        enAduana: embarques.filter((e: Embarque) => e.estado === "EN_ADUANA").length,
        valorTotalFobUsd: embarques.reduce((sum: number, e: Embarque) => sum + e.totalFobUsd, 0),
        valorTotalCifUsd: embarques.reduce(
          (sum: number, e: Embarque) => sum + (e.cifUsd || 0),
          0
        ),
      };

      setStats(newStats);

      // Get last 5 embarques
      setUltimosEmbarques(embarques.slice(0, 5));
    } catch (error) {
      toast.error("Error al cargar estadísticas");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Embarques Activos</CardTitle>
            <Ship className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total === 0 ? "Sin embarques registrados" : "total en sistema"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Tránsito</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.enTransito}</div>
            <p className="text-xs text-muted-foreground">
              {stats.enTransito === 0 ? "Sin embarques en tránsito" : "embarques navegando"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Aduana</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.enAduana}</div>
            <p className="text-xs text-muted-foreground">
              {stats.enAduana === 0 ? "Sin embarques en aduana" : "pendientes despacho"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total FOB</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              USD {stats.valorTotalFobUsd.toLocaleString("es-AR", { minimumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground">
              CIF: USD{" "}
              {stats.valorTotalCifUsd.toLocaleString("es-AR", { minimumFractionDigits: 0 })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Últimos Embarques */}
      <Card>
        <CardHeader>
          <CardTitle>Últimos Embarques</CardTitle>
          <CardDescription>
            {ultimosEmbarques.length === 0
              ? "No hay embarques registrados aún"
              : "Embarques más recientes"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : ultimosEmbarques.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                Crea tu primer embarque en la pestaña &quot;Embarques&quot;
              </p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Referencia</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">FOB USD</TableHead>
                    <TableHead className="text-right">CIF USD</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ultimosEmbarques.map((embarque) => (
                    <TableRow key={embarque.id}>
                      <TableCell className="font-medium">{embarque.referencia}</TableCell>
                      <TableCell>{embarque.proveedor.nombre}</TableCell>
                      <TableCell>
                        <Badge className={ESTADO_COLORS[embarque.estado]}>
                          {ESTADO_LABELS[embarque.estado]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {embarque.totalFobUsd.toLocaleString("es-AR", {
                          minimumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        {embarque.cifUsd
                          ? embarque.cifUsd.toLocaleString("es-AR", { minimumFractionDigits: 2 })
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {new Date(embarque.createdAt).toLocaleDateString("es-AR")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Flujo de Costeo</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="flex items-start gap-2">
              <div className="h-6 w-6 rounded-full bg-gray-500 text-white flex items-center justify-center text-xs">
                1
              </div>
              <div>
                <p className="font-medium">Crear Embarque</p>
                <p className="text-xs text-muted-foreground">
                  Registra proveedor, items, FOB, flete y seguro
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="h-6 w-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs">
                2
              </div>
              <div>
                <p className="font-medium">Marcar En Tránsito</p>
                <p className="text-xs text-muted-foreground">Embarque navegando hacia destino</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="h-6 w-6 rounded-full bg-yellow-500 text-white flex items-center justify-center text-xs">
                3
              </div>
              <div>
                <p className="font-medium">Calcular Costos Landed</p>
                <p className="text-xs text-muted-foreground">
                  CIF + Aranceles + Impuestos + Logística
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="h-6 w-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs">
                4
              </div>
              <div>
                <p className="font-medium">Confirmar Costos</p>
                <p className="text-xs text-muted-foreground">
                  Aplica costos al inventario (promedio ponderado)
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="h-6 w-6 rounded-full bg-teal-500 text-white flex items-center justify-center text-xs">
                5
              </div>
              <div>
                <p className="font-medium">Recibir Stock</p>
                <p className="text-xs text-muted-foreground">
                  Stock actualizado, listo para venta
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fórmula de Costo Landed</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="font-mono text-xs bg-muted p-3 rounded">
              <p>CIF = FOB + Flete + Seguro</p>
              <p className="mt-2">Derechos = CIF × %Arancel</p>
              <p>Tasa Est. = CIF × 3%</p>
              <p className="mt-2">Base = CIF + Derechos + Tasa Est.</p>
              <p className="mt-2">IVA = Base × 21% (recuperable)</p>
              <p>Ganancias = Base × 6% (recuperable)</p>
              <p>IIBB = Base × 3% (recuperable)</p>
              <p className="mt-2 font-bold">
                Costo Inventario = FOB + Flete + Seguro + Derechos + Tasas + Logística
              </p>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Los impuestos recuperables (IVA, Ganancias, IIBB) afectan el cash flow pero NO se
              suman al costo del inventario. El costo promedio se calcula con fórmula de promedio
              ponderado.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
