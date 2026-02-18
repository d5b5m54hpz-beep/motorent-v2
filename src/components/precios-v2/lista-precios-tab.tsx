"use client";

import { useState, useEffect } from "react";
import { Search, Download, Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

type Repuesto = {
  id: string;
  nombre: string;
  codigo: string | null;
  codigoFabricante: string | null;
  categoria: string | null;
  costoPromedioUsd: number;
  costoPromedioArs: number;
  precioVenta: number;
  stock: number;
  stockMinimo: number;
  margen: number | null;
  margenMinimo: number;
  estadoStock: string;
  proveedor: { id: string; nombre: string } | null;
};

export function ListaPreciosTab() {
  const [repuestos, setRepuestos] = useState<Repuesto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("todos");
  const [margenFiltro, setMargenFiltro] = useState("todos");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 25;

  useEffect(() => {
    fetchRepuestos();
  }, [page, search, categoriaFiltro, margenFiltro]);

  const fetchRepuestos = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search,
        categoria: categoriaFiltro,
        margen: margenFiltro,
      });

      const res = await fetch(`/api/pricing-repuestos/lista?${params}`);
      if (!res.ok) throw new Error("Error al cargar repuestos");
      const data = await res.json();
      setRepuestos(data.data || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar lista de precios");
    } finally {
      setIsLoading(false);
    }
  };

  const actualizarPrecio = async (repuestoId: string, nuevoPrecio: number) => {
    try {
      const res = await fetch(`/api/pricing-repuestos/${repuestoId}/precio`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ precio: nuevoPrecio }),
      });

      if (!res.ok) throw new Error("Error al actualizar precio");

      const result = await res.json();
      toast.success(
        `Precio actualizado: ${result.repuesto.nombre} - ${result.precioAnterior.toLocaleString("es-AR", { style: "currency", currency: "ARS" })} → ${result.precioNuevo.toLocaleString("es-AR", { style: "currency", currency: "ARS" })}`
      );

      // Refrescar lista
      fetchRepuestos();
      setEditingId(null);
      setEditingValue("");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al actualizar precio");
    }
  };

  const handleEditStart = (repuesto: Repuesto) => {
    setEditingId(repuesto.id);
    setEditingValue(repuesto.precioVenta.toString());
  };

  const handleEditSave = (repuestoId: string) => {
    const nuevoPrecio = parseFloat(editingValue);
    if (isNaN(nuevoPrecio) || nuevoPrecio < 0) {
      toast.error("Precio inválido");
      return;
    }
    actualizarPrecio(repuestoId, nuevoPrecio);
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditingValue("");
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === repuestos.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(repuestos.map((r) => r.id)));
    }
  };

  const getMargenColor = (margen: number | null) => {
    if (!margen) return "text-muted-foreground";
    if (margen < 0.10) return "text-red-600";
    if (margen < 0.25) return "text-yellow-600";
    if (margen < 0.45) return "text-green-600";
    if (margen < 0.60) return "text-emerald-600";
    return "text-blue-600";
  };

  const getEstadoStockBadge = (estado: string) => {
    switch (estado) {
      case "OK":
        return <Badge variant="default" className="bg-green-600">Stock OK</Badge>;
      case "BAJO":
        return <Badge variant="default" className="bg-yellow-600">Stock Bajo</Badge>;
      case "CRITICO":
        return <Badge variant="destructive">Stock Crítico</Badge>;
      case "SIN_STOCK":
        return <Badge variant="secondary">Sin Stock</Badge>;
      default:
        return <Badge variant="secondary">{estado}</Badge>;
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código o nombre..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Select value={categoriaFiltro} onValueChange={(val) => { setCategoriaFiltro(val); setPage(1); }}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas las categorías</SelectItem>
            <SelectItem value="FRENOS">Frenos</SelectItem>
            <SelectItem value="FILTROS">Filtros</SelectItem>
            <SelectItem value="ACEITES">Aceites</SelectItem>
            <SelectItem value="ELECTRICIDAD">Electricidad</SelectItem>
            <SelectItem value="TRANSMISION">Transmisión</SelectItem>
          </SelectContent>
        </Select>
        <Select value={margenFiltro} onValueChange={(val) => { setMargenFiltro(val); setPage(1); }}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Margen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los márgenes</SelectItem>
            <SelectItem value="critico">Crítico (&lt;10%)</SelectItem>
            <SelectItem value="bajo">Bajo (10-25%)</SelectItem>
            <SelectItem value="aceptable">Aceptable (25-45%)</SelectItem>
            <SelectItem value="optimo">Óptimo (45-60%)</SelectItem>
            <SelectItem value="alto">Alto (&gt;60%)</SelectItem>
            <SelectItem value="sin-precio">Sin precio definido</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Exportar Excel
        </Button>
      </div>

      {/* Barra de acciones (si hay selección) */}
      {selectedIds.size > 0 && (
        <Card className="bg-primary/10 border-primary">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">{selectedIds.size} items seleccionados</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline">
                  Subir %
                </Button>
                <Button size="sm" variant="outline">
                  Bajar %
                </Button>
                <Button size="sm" variant="outline">
                  Precio fijo
                </Button>
                <Button size="sm" variant="outline">
                  Aplicar Regla
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
                  Deseleccionar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabla */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedIds.size === repuestos.length && repuestos.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-right">Costo USD</TableHead>
                  <TableHead className="text-right">Costo ARS</TableHead>
                  <TableHead className="text-right">Precio Venta</TableHead>
                  <TableHead className="text-right">Margen %</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {repuestos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      No se encontraron repuestos con los filtros seleccionados
                    </TableCell>
                  </TableRow>
                ) : (
                  repuestos.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(r.id)}
                          onCheckedChange={() => toggleSelection(r.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{r.codigo || "SIN-COD"}</div>
                        {r.codigoFabricante && (
                          <div className="text-xs text-muted-foreground">
                            {r.codigoFabricante}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{r.nombre}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{r.categoria || "Sin categoría"}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        ${r.costoPromedioUsd.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        ${r.costoPromedioArs.toLocaleString("es-AR")}
                      </TableCell>
                      <TableCell className="text-right">
                        {editingId === r.id ? (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleEditSave(r.id);
                                if (e.key === "Escape") handleEditCancel();
                              }}
                              className="w-24 h-8"
                              autoFocus
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditSave(r.id)}
                              className="h-8 w-8 p-0"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleEditCancel}
                              className="h-8 w-8 p-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEditStart(r)}
                            className="hover:bg-muted px-2 py-1 rounded"
                          >
                            ${r.precioVenta.toLocaleString("es-AR")}
                          </button>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={getMargenColor(r.margen)}>
                          {r.margen ? `${(r.margen * 100).toFixed(1)}%` : "N/A"}
                        </span>
                      </TableCell>
                      <TableCell>{getEstadoStockBadge(r.estadoStock)}</TableCell>
                    </TableRow>
                  ))
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
            repuestos
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
