"use client";

import { useState, useEffect, useCallback } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type SortingState,
} from "@tanstack/react-table";
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  BarChart3,
  Package,
  ShoppingCart,
  PackageCheck,
  MapPin,
  Download,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { getColumns } from "./columns";
import { RepuestoForm } from "./repuesto-form";
import { DeleteRepuestoDialog } from "./delete-repuesto-dialog";
import type { Repuesto, RepuestosApiResponse } from "./types";
import type { RepuestoInput } from "@/lib/validations";

const PAGE_SIZE = 15;

export default function RepuestosPage() {
  const [activeTab, setActiveTab] = useState("inventario");

  // Tab Inventario - state
  const [data, setData] = useState<Repuesto[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Repuesto | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Repuesto | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch data
  const fetchData = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    try {
      const sortBy = sorting[0]?.id ?? "nombre";
      const sortOrder = sorting[0]?.desc === false ? "asc" : "desc";
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        search: debouncedSearch,
        sortBy,
        sortOrder,
      });
      const res = await fetch(`/api/repuestos?${params}`, { signal });
      if (!res.ok) throw new Error("Error fetching repuestos");
      const json: RepuestosApiResponse = await res.json();
      setData(json.data);
      setTotal(json.total);
      setTotalPages(json.totalPages);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      toast.error("Error al cargar repuestos");
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, sorting]);

  useEffect(() => {
    if (activeTab === "inventario") {
      const controller = new AbortController();
      fetchData(controller.signal);
      return () => controller.abort();
    }
  }, [fetchData, activeTab]);

  const handleSubmit = async (formData: RepuestoInput) => {
    setIsSubmitting(true);
    try {
      const url = selectedItem
        ? `/api/repuestos/${selectedItem.id}`
        : "/api/repuestos";
      const method = selectedItem ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al guardar");

      toast.success(selectedItem ? "Repuesto actualizado" : "Repuesto creado");
      setDialogOpen(false);
      setSelectedItem(null);
      fetchData();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error al guardar";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/repuestos/${itemToDelete.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al eliminar");

      toast.success("Repuesto eliminado");
      setDeleteDialogOpen(false);
      setItemToDelete(null);
      fetchData();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error al eliminar";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = getColumns({
    onEdit: (r) => {
      setSelectedItem(r);
      setDialogOpen(true);
    },
    onDelete: (r) => {
      setItemToDelete(r);
      setDeleteDialogOpen(true);
    },
    onAjustarStock: (r) => {
      toast.info("Ajustar stock - Por implementar");
    },
    onVerMovimientos: (r) => {
      toast.info("Ver movimientos - Por implementar");
    },
    onImprimirEtiqueta: (r) => {
      toast.info("Imprimir etiqueta - Por implementar");
    },
  });

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Repuestos</h1>
        <p className="text-muted-foreground">
          Gestión de inventario de repuestos y piezas
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="inventario" className="gap-2">
            <Package className="h-4 w-4" />
            Inventario
          </TabsTrigger>
          <TabsTrigger value="ordenes-compra" className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            Órdenes de Compra
          </TabsTrigger>
          <TabsTrigger value="recepciones" className="gap-2">
            <PackageCheck className="h-4 w-4" />
            Recepciones
          </TabsTrigger>
          <TabsTrigger value="ubicaciones" className="gap-2">
            <MapPin className="h-4 w-4" />
            Ubicaciones
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: DASHBOARD */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Repuestos</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">—</div>
                <p className="text-xs text-muted-foreground">
                  Use API: /api/repuestos/dashboard
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
                <Package className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">—</div>
                <p className="text-xs text-muted-foreground">Requiere atención</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sin Stock</CardTitle>
                <Package className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">—</div>
                <p className="text-xs text-muted-foreground">Crítico</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Valor Inventario</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">—</div>
                <p className="text-xs text-muted-foreground">Precio de compra</p>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Dashboard de Stock</CardTitle>
              <CardDescription>
                Consumir API /api/repuestos/dashboard para mostrar KPIs completos, gráficos y alertas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Implementación pendiente: gráficos con Recharts, alertas de stock bajo, top consumidos
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: INVENTARIO */}
        <TabsContent value="inventario" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-1 items-center gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar repuestos..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => toast.info("Importar - Por implementar")}>
                <Upload className="mr-2 h-4 w-4" />
                Importar
              </Button>
              <Button variant="outline" size="sm" onClick={() => toast.info("Exportar - Por implementar")}>
                <Download className="mr-2 h-4 w-4" />
                Exportar
              </Button>
              <Button
                onClick={() => {
                  setSelectedItem(null);
                  setDialogOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Repuesto
              </Button>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {columns.map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-8 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : table.getRowModel().rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      No se encontraron repuestos.
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Mostrando {data.length} de {total} repuestos
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(1)}
                disabled={page === 1 || isLoading}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || isLoading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Página {page} de {totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || isLoading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages || isLoading}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* TAB 3: ÓRDENES DE COMPRA */}
        <TabsContent value="ordenes-compra" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Órdenes de Compra</CardTitle>
              <CardDescription>
                Use API /api/ordenes-compra para listar, crear y gestionar OCs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Implementación pendiente: Lista de OCs, formulario para crear/editar, cambiar estados, vincular recepciones
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: RECEPCIONES */}
        <TabsContent value="recepciones" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recepción de Mercadería</CardTitle>
              <CardDescription>
                Use API /api/recepciones para registrar llegadas y actualizar stock
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Implementación pendiente: Lista de recepciones, formulario para registrar (con/sin OC), actualización transaccional de stock
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 5: UBICACIONES */}
        <TabsContent value="ubicaciones" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ubicaciones de Depósito</CardTitle>
              <CardDescription>
                Use API /api/ubicaciones-deposito para gestionar ubicaciones físicas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Implementación pendiente: Grilla visual (estante/fila/posición), CRUD de ubicaciones, mapa con /api/ubicaciones-deposito/mapa
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedItem ? "Editar Repuesto" : "Nuevo Repuesto"}
            </DialogTitle>
            <DialogDescription>
              Complete los campos del formulario
            </DialogDescription>
          </DialogHeader>
          <RepuestoForm
            repuesto={selectedItem}
            onSubmit={handleSubmit}
            isLoading={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      <DeleteRepuestoDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        repuesto={itemToDelete}
        onConfirm={handleDelete}
        isLoading={isDeleting}
      />
    </div>
  );
}
