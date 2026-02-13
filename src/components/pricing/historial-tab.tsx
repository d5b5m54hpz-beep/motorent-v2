"use client";

import { useState, useEffect } from "react";
import { TrendingUp, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from "recharts";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type HistorialPrecio = {
  id: string;
  repuesto: { nombre: string };
  precioAnterior: number | null;
  precioNuevo: number;
  tipoCambio: string;
  motivo: string | null;
  createdAt: string;
  loteId: string | null;
};

type HistorialCosto = {
  id: string;
  repuesto: { nombre: string };
  costoAnteriorArs: number | null;
  costoNuevoArs: number;
  motivo: string | null;
  createdAt: string;
};

export function HistorialTab() {
  const [tipoHistorial, setTipoHistorial] = useState<"precios" | "costos" | "ambos">("precios");
  const [loading, setLoading] = useState(true);
  const [historialPrecios, setHistorialPrecios] = useState<HistorialPrecio[]>([]);
  const [historialCostos, setHistorialCostos] = useState<HistorialCosto[]>([]);
  const [repuestoFiltro, setRepuestoFiltro] = useState("");

  useEffect(() => {
    fetchHistorial();
  }, [tipoHistorial]);

  const fetchHistorial = async () => {
    try {
      setLoading(true);

      if (tipoHistorial === "precios" || tipoHistorial === "ambos") {
        const resPrecios = await fetch("/api/pricing-repuestos/historial?limit=50");
        if (resPrecios.ok) {
          const dataPrecios = await resPrecios.json();
          setHistorialPrecios(dataPrecios.data || []);
        }
      }

      if (tipoHistorial === "costos" || tipoHistorial === "ambos") {
        const resCostos = await fetch("/api/repuestos/historial-costos?limit=50");
        if (resCostos.ok) {
          const dataCostos = await resCostos.json();
          setHistorialCostos(dataCostos.data || []);
        }
      }
    } catch (error) {
      toast.error("Error al cargar historial");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const historialPreciosFiltrado = historialPrecios.filter((h) =>
    h.repuesto.nombre.toLowerCase().includes(repuestoFiltro.toLowerCase())
  );

  const historialCostosFiltrado = historialCostos.filter((h) =>
    h.repuesto.nombre.toLowerCase().includes(repuestoFiltro.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Controles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Historial de Cambios
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-6">
            <Label>Mostrar:</Label>
            <RadioGroup
              value={tipoHistorial}
              onValueChange={(val: any) => setTipoHistorial(val)}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="precios" id="precios" />
                <Label htmlFor="precios" className="font-normal cursor-pointer">
                  Precios
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="costos" id="costos" />
                <Label htmlFor="costos" className="font-normal cursor-pointer">
                  Costos
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="ambos" id="ambos" />
                <Label htmlFor="ambos" className="font-normal cursor-pointer">
                  Ambos
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por repuesto..."
              value={repuestoFiltro}
              onChange={(e) => setRepuestoFiltro(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Historial de Precios */}
      {(tipoHistorial === "precios" || tipoHistorial === "ambos") && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Historial de Precios</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Cargando...</div>
            ) : historialPreciosFiltrado.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay cambios de precio registrados
              </div>
            ) : (
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Repuesto</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Anterior</TableHead>
                      <TableHead className="text-right">Nuevo</TableHead>
                      <TableHead className="text-right">Variación</TableHead>
                      <TableHead>Motivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historialPreciosFiltrado.map((h) => {
                      const cambio =
                        h.precioAnterior && h.precioAnterior > 0
                          ? ((h.precioNuevo - h.precioAnterior) / h.precioAnterior) * 100
                          : 0;

                      return (
                        <TableRow key={h.id}>
                          <TableCell className="font-medium">{h.repuesto.nombre}</TableCell>
                          <TableCell className="text-sm">
                            {format(new Date(h.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                          </TableCell>
                          <TableCell className="text-right">
                            ${(h.precioAnterior || 0).toLocaleString("es-AR")}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ${h.precioNuevo.toLocaleString("es-AR")}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={cambio > 0 ? "default" : "secondary"}>
                              {cambio > 0 ? "+" : ""}
                              {cambio.toFixed(1)}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {h.tipoCambio}
                            {h.loteId && <span className="text-muted-foreground ml-1">(Bulk)</span>}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabla de Historial de Costos */}
      {(tipoHistorial === "costos" || tipoHistorial === "ambos") && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Historial de Costos</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Cargando...</div>
            ) : historialCostosFiltrado.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay cambios de costo registrados
              </div>
            ) : (
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Repuesto</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Anterior</TableHead>
                      <TableHead className="text-right">Nuevo</TableHead>
                      <TableHead className="text-right">Variación</TableHead>
                      <TableHead>Motivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historialCostosFiltrado.map((h) => {
                      const cambio =
                        h.costoAnteriorArs && h.costoAnteriorArs > 0
                          ? ((h.costoNuevoArs - h.costoAnteriorArs) / h.costoAnteriorArs) * 100
                          : 0;

                      return (
                        <TableRow key={h.id}>
                          <TableCell className="font-medium">{h.repuesto.nombre}</TableCell>
                          <TableCell className="text-sm">
                            {format(new Date(h.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                          </TableCell>
                          <TableCell className="text-right">
                            ${(h.costoAnteriorArs || 0).toLocaleString("es-AR")}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ${h.costoNuevoArs.toLocaleString("es-AR")}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={cambio > 0 ? "destructive" : "default"}>
                              {cambio > 0 ? "+" : ""}
                              {cambio.toFixed(1)}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {h.motivo || "-"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Gráfico de evolución (placeholder para implementación futura) */}
      {repuestoFiltro && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evolución de Precio y Costo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center py-8">
              Gráfico de evolución disponible cuando se selecciona un repuesto específico
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
