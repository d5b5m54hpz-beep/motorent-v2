"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
import { MantenimientoForm } from "./mantenimiento-form";
import { DeleteMantenimientoDialog } from "./delete-mantenimiento-dialog";
import type { Mantenimiento, MantenimientosApiResponse } from "./types";
import type { MantenimientoInput } from "@/lib/validations";

const PAGE_SIZE = 15;

const estadoOptions = [
  { value: "all", label: "Todos los estados" },
  { value: "PENDIENTE", label: "Pendiente" },
  { value: "PROGRAMADO", label: "Programado" },
  { value: "EN_PROCESO", label: "En Proceso" },
  { value: "ESPERANDO_REPUESTO", label: "Esperando Repuesto" },
  { value: "COMPLETADO", label: "Completado" },
  { value: "CANCELADO", label: "Cancelado" },
];

const tipoOptions = [
  { value: "all", label: "Todos los tipos" },
  { value: "SERVICE_PREVENTIVO", label: "Service Preventivo" },
  { value: "REPARACION", label: "Reparación" },
  { value: "CAMBIO_ACEITE", label: "Cambio de Aceite" },
  { value: "CAMBIO_NEUMATICOS", label: "Cambio Neumáticos" },
  { value: "FRENOS", label: "Frenos" },
  { value: "ELECTRICA", label: "Eléctrica" },
  { value: "CHAPA_PINTURA", label: "Chapa y Pintura" },
  { value: "OTRO", label: "Otro" },
];

export default function MantenimientosPage() {
  const [data, setData] = useState<Mantenimiento[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [estadoFilter, setEstadoFilter] = useState("all");
  const [tipoFilter, setTipoFilter] = useState("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Mantenimiento | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Mantenimiento | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [itemToView, setItemToView] = useState<Mantenimiento | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    try {
      const sortBy = sorting[0]?.id ?? "createdAt";
      const sortOrder = sorting[0]?.desc === false ? "asc" : "desc";
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        search: debouncedSearch,
        sortBy,
        sortOrder,
      });
      if (estadoFilter !== "all") params.set("estado", estadoFilter);
      if (tipoFilter !== "all") params.set("tipo", tipoFilter);

      const res = await fetch(`/api/mantenimientos?${params}`, { signal });
      if (!res.ok) throw new Error("Error fetching mantenimientos");
      const json: MantenimientosApiResponse = await res.json();
      setData(json.data);
      setTotal(json.total);
      setTotalPages(json.totalPages);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      toast.error("Error al cargar mantenimientos");
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, sorting, estadoFilter, tipoFilter]);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  const handleSubmit = async (formData: MantenimientoInput) => {
    setIsSubmitting(true);
    try {
      const url = selectedItem
        ? `/api/mantenimientos/${selectedItem.id}`
        : "/api/mantenimientos";
      const method = selectedItem ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al guardar");

      toast.success(selectedItem ? "Mantenimiento actualizado" : "Mantenimiento creado");
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
      const res = await fetch(`/api/mantenimientos/${itemToDelete.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al eliminar");

      toast.success("Mantenimiento eliminado");
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

  const columns = useMemo(
    () =>
      getColumns({
        onView: (m) => {
          setItemToView(m);
          setViewDialogOpen(true);
        },
        onEdit: (m) => {
          setSelectedItem(m);
          setDialogOpen(true);
        },
        onDelete: (m) => {
          setItemToDelete(m);
          setDeleteDialogOpen(true);
        },
      }),
    []
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    pageCount: totalPages,
    onSortingChange: (updater) => {
      setSorting(updater);
      setPage(1);
    },
    state: {
      sorting,
      pagination: { pageIndex: page - 1, pageSize: PAGE_SIZE },
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mantenimientos</h1>
          <p className="text-muted-foreground">
            Gestión de mantenimientos y reparaciones
          </p>
        </div>
        <Button
          onClick={() => {
            setSelectedItem(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Mantenimiento
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por patente, marca, modelo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={estadoFilter} onValueChange={(v) => { setEstadoFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {estadoOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={tipoFilter} onValueChange={(v) => { setTipoFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {tipoOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          {total} registro{total !== 1 ? "s" : ""}
        </p>
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
                      : flexRender(header.column.columnDef.header, header.getContext())}
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
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No hay mantenimientos registrados.
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

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(1)} disabled={page <= 1}>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(totalPages)} disabled={page >= totalPages}>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setSelectedItem(null);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedItem ? "Editar mantenimiento" : "Nuevo mantenimiento"}
            </DialogTitle>
            <DialogDescription>
              {selectedItem
                ? "Modificá los datos del mantenimiento"
                : "Completá los datos para registrar un nuevo mantenimiento"}
            </DialogDescription>
          </DialogHeader>
          <MantenimientoForm
            key={selectedItem?.id ?? "new"}
            mantenimiento={selectedItem}
            onSubmit={handleSubmit}
            isLoading={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog
        open={viewDialogOpen}
        onOpenChange={(open) => {
          setViewDialogOpen(open);
          if (!open) setItemToView(null);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle del Mantenimiento</DialogTitle>
            <DialogDescription>
              {itemToView?.moto.marca} {itemToView?.moto.modelo} ({itemToView?.moto.patente})
            </DialogDescription>
          </DialogHeader>
          {itemToView && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="font-medium">Tipo:</span> {itemToView.tipo}</div>
                <div><span className="font-medium">Estado:</span> {itemToView.estado}</div>
                <div><span className="font-medium">Costo Total:</span> ${itemToView.costoTotal.toLocaleString()}</div>
                <div><span className="font-medium">Proveedor:</span> {itemToView.proveedor?.nombre ?? "—"}</div>
              </div>
              {itemToView.descripcion && (
                <div><span className="font-medium">Descripción:</span> {itemToView.descripcion}</div>
              )}
              {itemToView.diagnostico && (
                <div><span className="font-medium">Diagnóstico:</span> {itemToView.diagnostico}</div>
              )}
              {itemToView.solucion && (
                <div><span className="font-medium">Solución:</span> {itemToView.solucion}</div>
              )}
              {itemToView.notas && (
                <div><span className="font-medium">Notas:</span> {itemToView.notas}</div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <DeleteMantenimientoDialog
        mantenimiento={itemToDelete}
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setItemToDelete(null);
        }}
        onConfirm={handleDelete}
        isLoading={isDeleting}
      />
    </div>
  );
}
