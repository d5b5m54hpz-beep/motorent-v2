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
  FileDown,
  FileJson,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { getColumns } from "./columns";
import { RepuestoForm } from "./repuesto-form";
import { DeleteRepuestoDialog } from "./delete-repuesto-dialog";
import { DashboardTab } from "./dashboard-tab";
import { ImportDialog } from "./import-dialog";
import { AjustarStockDialog } from "./ajustar-stock-dialog";
import { MovimientosSheet } from "./movimientos-sheet";
import { OrdenesCompraTab } from "./ordenes-compra-tab";
import { RecepcionesTab } from "./recepciones-tab";
import { UbicacionesTab } from "./ubicaciones-tab";
import { printRepuestoLabel } from "./print-label";
import { exportRepuestos } from "./export-utils";
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

  // New dialogs/sheets
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [ajustarStockDialogOpen, setAjustarStockDialogOpen] = useState(false);
  const [itemToAjustar, setItemToAjustar] = useState<Repuesto | null>(null);
  const [movimientosSheetOpen, setMovimientosSheetOpen] = useState(false);
  const [itemMovimientos, setItemMovimientos] = useState<Repuesto | null>(null);

  // Filters
  const [filterCategoria, setFilterCategoria] = useState("");
  const [filterEstadoStock, setFilterEstadoStock] = useState("");
  const [filterProveedor, setFilterProveedor] = useState("");
  const [categorias, setCategorias] = useState<string[]>([]);
  const [proveedores, setProveedores] = useState<Array<{ id: string; nombre: string }>>([]);

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
      if (filterCategoria) params.append("categoria", filterCategoria);
      if (filterEstadoStock === "bajo") params.append("stockBajo", "true");
      if (filterEstadoStock === "sin") params.append("sinStock", "true");
      if (filterProveedor) params.append("proveedorId", filterProveedor);
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
  }, [page, debouncedSearch, sorting, filterCategoria, filterEstadoStock, filterProveedor]);

  useEffect(() => {
    if (activeTab === "inventario") {
      const controller = new AbortController();
      fetchData(controller.signal);
      return () => controller.abort();
    }
  }, [fetchData, activeTab]);

  // URL params support
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    const scan = params.get("scan");

    if (tab) setActiveTab(tab);
    if (scan) {
      setActiveTab("inventario");
      setSearch(scan);
    }
  }, []);

  // Load filters data
  useEffect(() => {
    fetch("/api/repuestos?limit=1000").then(res => res.json()).then(json => {
      const cats = Array.from(new Set(json.data.map((r: Repuesto) => r.categoria).filter(Boolean)));
      setCategorias(cats as string[]);
    });
    fetch("/api/proveedores?limit=100").then(res => res.json()).then(json => {
      setProveedores(json.data);
    });
  }, []);

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
      setItemToAjustar(r);
      setAjustarStockDialogOpen(true);
    },
    onVerMovimientos: (r) => {
      setItemMovimientos(r);
      setMovimientosSheetOpen(true);
    },
    onImprimirEtiqueta: (r) => {
      printRepuestoLabel(r);
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
          <DashboardTab
            onFilterStockBajo={() => {
              setActiveTab("inventario");
              // TODO: Add stock filter when filters are implemented
            }}
          />
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
              {/* Filters */}
              <Select value={filterCategoria} onValueChange={setFilterCategoria}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas</SelectItem>
                  {categorias.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterEstadoStock} onValueChange={setFilterEstadoStock}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="bajo">Stock Bajo</SelectItem>
                  <SelectItem value="sin">Sin Stock</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterProveedor} onValueChange={setFilterProveedor}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Proveedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  {proveedores.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Importar
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Exportar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => exportRepuestos("csv")}>
                    <FileDown className="mr-2 h-4 w-4" />
                    Exportar CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportRepuestos("json")}>
                    <FileJson className="mr-2 h-4 w-4" />
                    Exportar JSON
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
          <OrdenesCompraTab />
        </TabsContent>

        {/* TAB 4: RECEPCIONES */}
        <TabsContent value="recepciones" className="space-y-4">
          <RecepcionesTab />
        </TabsContent>

        {/* TAB 5: UBICACIONES */}
        <TabsContent value="ubicaciones" className="space-y-4">
          <UbicacionesTab />
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

      <ImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onSuccess={fetchData}
      />

      <AjustarStockDialog
        open={ajustarStockDialogOpen}
        onOpenChange={setAjustarStockDialogOpen}
        repuesto={itemToAjustar}
        onSuccess={fetchData}
      />

      <MovimientosSheet
        open={movimientosSheetOpen}
        onOpenChange={setMovimientosSheetOpen}
        repuesto={itemMovimientos}
      />
    </div>
  );
}
