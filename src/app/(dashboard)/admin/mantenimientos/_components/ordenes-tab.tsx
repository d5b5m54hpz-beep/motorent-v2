"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, Eye } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { OrdenDetailSheet } from "./orden-detail-sheet";

type OrdenTrabajo = {
  id: string;
  numero: string;
  tipoOT: string;
  tipoService: string;
  estado: string;
  kmAlIngreso: number;
  costoTotal: number;
  fechaIngreso: string;
  moto: {
    patente: string;
    marca: string;
    modelo: string;
  };
  taller: {
    nombre: string;
  } | null;
};

export function OrdenesTab() {
  const [ordenes, setOrdenes] = useState<OrdenTrabajo[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("all");
  const [tipoFilter, setTipoFilter] = useState("all");

  const [selectedOrdenId, setSelectedOrdenId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchOrdenes = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (estadoFilter !== "all") params.set("estado", estadoFilter);
      if (tipoFilter !== "all") params.set("tipoOT", tipoFilter);

      const res = await fetch(`/api/mantenimientos/ordenes?${params}`);
      if (!res.ok) throw new Error("Error al cargar órdenes");

      const json = await res.json();
      setOrdenes(json.data || []);
      setTotal(json.total || 0);
    } catch (error) {
      console.error("Error fetching ordenes:", error);
      toast.error("Error al cargar órdenes de trabajo");
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, estadoFilter, tipoFilter]);

  useEffect(() => {
    fetchOrdenes();
  }, [fetchOrdenes]);

  const estadoBadge = (estado: string) => {
    const colors: Record<string, string> = {
      PENDIENTE: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
      EN_EJECUCION: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      COMPLETADA: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300",
      CANCELADA: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    };
    return colors[estado] || "";
  };

  const handleViewDetail = (ordenId: string) => {
    setSelectedOrdenId(ordenId);
    setSheetOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Órdenes de Trabajo</CardTitle>
          <CardDescription>
            Historial completo de órdenes de mantenimiento y reparación
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por patente, número OT..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={estadoFilter} onValueChange={setEstadoFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                <SelectItem value="EN_EJECUCION">En Ejecución</SelectItem>
                <SelectItem value="COMPLETADA">Completada</SelectItem>
                <SelectItem value="CANCELADA">Cancelada</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="PREVENTIVO">Preventivo</SelectItem>
                <SelectItem value="CORRECTIVO">Correctivo</SelectItem>
                <SelectItem value="URGENTE">Urgente</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {total} registro{total !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Moto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>KM Ingreso</TableHead>
                  <TableHead>Costo</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 9 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : ordenes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                      No hay órdenes de trabajo
                    </TableCell>
                  </TableRow>
                ) : (
                  ordenes.map((orden) => (
                    <TableRow key={orden.id}>
                      <TableCell className="font-mono text-xs">{orden.numero}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {orden.moto.marca} {orden.moto.modelo}
                          </p>
                          <p className="text-xs text-muted-foreground">{orden.moto.patente}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{orden.tipoOT}</Badge>
                      </TableCell>
                      <TableCell>{orden.tipoService}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={estadoBadge(orden.estado)}>
                          {orden.estado.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>{orden.kmAlIngreso.toLocaleString()}</TableCell>
                      <TableCell className="font-medium">
                        ${orden.costoTotal.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(orden.fechaIngreso).toLocaleDateString("es-AR")}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewDetail(orden.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {total > 20 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Página {page} de {Math.ceil(total / 20)}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= Math.ceil(total / 20)}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <OrdenDetailSheet
        ordenId={selectedOrdenId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </>
  );
}
