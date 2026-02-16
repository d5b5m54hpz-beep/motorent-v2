"use client";

import { useState, useEffect } from "react";
import { Search, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type HistorialItem = {
  id: string;
  repuesto: {
    id: string;
    nombre: string;
    categoria: string | null;
  };
  precioAnterior: number | null;
  precioNuevo: number;
  costoAlMomento: number | null;
  margenAlMomento: number | null;
  tipoCambio: string;
  motivo: string | null;
  usuario: string;
  createdAt: string;
};

export function HistorialTab() {
  const [historial, setHistorial] = useState<HistorialItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;

  useEffect(() => {
    fetchHistorial();
  }, [page, search]);

  const fetchHistorial = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (search) {
        // En producción real, agregar búsqueda por repuesto
        // params.append("search", search);
      }

      const res = await fetch(`/api/pricing-repuestos/historial?${params}`);
      if (!res.ok) throw new Error("Error al cargar historial");
      const data = await res.json();
      setHistorial(data.data || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar historial");
    } finally {
      setIsLoading(false);
    }
  };

  const getTipoCambioBadge = (tipo: string) => {
    switch (tipo) {
      case "MANUAL":
        return <Badge variant="default">Manual</Badge>;
      case "BULK_UPDATE":
        return <Badge variant="default" className="bg-purple-600">Bulk</Badge>;
      case "SUGERENCIA_IA":
        return <Badge variant="default" className="bg-primary">Sugerencia IA</Badge>;
      case "IMPORTACION":
        return <Badge variant="default" className="bg-blue-600">Importación</Badge>;
      case "RECALCULO_COSTO":
        return <Badge variant="default" className="bg-orange-600">Recálculo</Badge>;
      case "REGLA_MARKUP":
        return <Badge variant="default" className="bg-green-600">Regla</Badge>;
      default:
        return <Badge variant="secondary">{tipo}</Badge>;
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar repuesto..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
      </div>

      {/* Tabla */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha/Hora</TableHead>
                  <TableHead>Repuesto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Precio Anterior</TableHead>
                  <TableHead className="text-right">Precio Nuevo</TableHead>
                  <TableHead className="text-right">Cambio %</TableHead>
                  <TableHead className="text-right">Margen Anterior</TableHead>
                  <TableHead className="text-right">Margen Nuevo</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historial.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                      No hay historial de cambios de precios
                    </TableCell>
                  </TableRow>
                ) : (
                  historial.map((h) => {
                    const cambio =
                      h.precioAnterior && h.precioAnterior > 0
                        ? ((h.precioNuevo - h.precioAnterior) / h.precioAnterior) * 100
                        : 0;

                    // Calcular margen anterior si tenemos datos
                    const margenAnterior =
                      h.precioAnterior &&
                      h.precioAnterior > 0 &&
                      h.costoAlMomento &&
                      h.costoAlMomento > 0
                        ? ((h.precioAnterior - h.costoAlMomento) / h.precioAnterior) * 100
                        : null;

                    const margenNuevo = h.margenAlMomento
                      ? h.margenAlMomento * 100
                      : null;

                    return (
                      <TableRow key={h.id}>
                        <TableCell>
                          <div className="text-sm">
                            {format(new Date(h.createdAt), "dd/MM/yyyy", { locale: es })}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(h.createdAt), "HH:mm", { locale: es })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{h.repuesto.nombre}</div>
                          {h.repuesto.categoria && (
                            <div className="text-xs text-muted-foreground">
                              {h.repuesto.categoria}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{getTipoCambioBadge(h.tipoCambio)}</TableCell>
                        <TableCell className="text-right">
                          {h.precioAnterior
                            ? `$${h.precioAnterior.toLocaleString("es-AR")}`
                            : "N/A"}
                        </TableCell>
                        <TableCell className="text-right">
                          ${h.precioNuevo.toLocaleString("es-AR")}
                        </TableCell>
                        <TableCell className="text-right">
                          {cambio !== 0 ? (
                            <span
                              className={`flex items-center justify-end gap-1 ${cambio > 0 ? "text-green-600" : "text-red-600"}`}
                            >
                              {cambio > 0 ? (
                                <TrendingUp className="h-3 w-3" />
                              ) : (
                                <TrendingDown className="h-3 w-3" />
                              )}
                              {cambio > 0 ? "+" : ""}
                              {cambio.toFixed(1)}%
                            </span>
                          ) : (
                            "N/A"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {margenAnterior !== null
                            ? `${margenAnterior.toFixed(1)}%`
                            : "N/A"}
                        </TableCell>
                        <TableCell className="text-right">
                          {margenNuevo !== null ? `${margenNuevo.toFixed(1)}%` : "N/A"}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{h.usuario}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground max-w-xs truncate">
                            {h.motivo || "Sin motivo"}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Mostrando {(page - 1) * limit + 1}-{Math.min(page * limit, total)} de {total}{" "}
            cambios
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage(1)}
              disabled={page === 1}
            >
              Primera
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Anterior
            </Button>
            <span className="flex items-center px-4 text-sm">
              Página {page} de {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Siguiente
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
            >
              Última
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
