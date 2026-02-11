"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type SortingState,
} from "@tanstack/react-table";
import { Plus, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { getColumns } from "./columns";
import { AsientoForm } from "./asiento-form";
import { DeleteAsientoDialog } from "./delete-asiento-dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { AsientoContable, AsientoContableFormData } from "./types";

type AsientosApiResponse = {
  data: AsientoContable[];
  total: number;
  totalPages: number;
  page: number;
  limit: number;
};

const PAGE_SIZE = 15;

export default function AsientosContablesPage() {
  const [data, setData] = useState<AsientoContable[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [tipoFilter, setTipoFilter] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<AsientoContable | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewItem, setViewItem] = useState<AsientoContable | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<AsientoContable | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    try {
      const sortBy = sorting[0]?.id ?? "fecha";
      const sortOrder = sorting[0]?.desc === false ? "asc" : "desc";
      const params = new URLSearchParams({
        page: String(page), limit: String(PAGE_SIZE), search: debouncedSearch, sortBy, sortOrder,
      });
      if (tipoFilter) params.set("tipo", tipoFilter);
      const res = await fetch(`/api/asientos-contables?${params}`, { signal });
      if (!res.ok) throw new Error("Error");
      const json: AsientosApiResponse = await res.json();
      setData(json.data);
      setTotal(json.total);
      setTotalPages(json.totalPages);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      toast.error("Error al cargar asientos contables");
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, sorting, tipoFilter]);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  const handleSubmit = async (formData: AsientoContableFormData) => {
    setIsSubmitting(true);
    try {
      const url = selectedItem ? `/api/asientos-contables/${selectedItem.id}` : "/api/asientos-contables";
      const method = selectedItem ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al guardar");
      toast.success(selectedItem ? "Asiento actualizado" : "Asiento creado");
      setDialogOpen(false);
      setSelectedItem(null);
      fetchData();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Error al guardar");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/asientos-contables/${itemToDelete.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al eliminar");
      toast.success("Asiento eliminado");
      setDeleteDialogOpen(false);
      setItemToDelete(null);
      fetchData();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar");
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = useMemo(() => getColumns({
    onView: (asiento) => { setViewItem(asiento); setViewDialogOpen(true); },
    onEdit: (asiento) => { setSelectedItem(asiento); setDialogOpen(true); },
    onDelete: (asiento) => { setItemToDelete(asiento); setDeleteDialogOpen(true); },
  }), []);

  const table = useReactTable({
    data, columns, getCoreRowModel: getCoreRowModel(),
    manualPagination: true, manualSorting: true, pageCount: totalPages,
    onSortingChange: (updater) => { setSorting(updater); setPage(1); },
    state: { sorting, pagination: { pageIndex: page - 1, pageSize: PAGE_SIZE } },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Asientos Contables</h1>
          <p className="text-muted-foreground">Registro de asientos con doble partida</p>
        </div>
        <Button onClick={() => { setSelectedItem(null); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Asiento
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por descripción..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={tipoFilter} onValueChange={(v) => { setTipoFilter(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="APERTURA">Apertura</SelectItem>
            <SelectItem value="COMPRA">Compra</SelectItem>
            <SelectItem value="VENTA">Venta</SelectItem>
            <SelectItem value="PAGO">Pago</SelectItem>
            <SelectItem value="COBRO">Cobro</SelectItem>
            <SelectItem value="AJUSTE">Ajuste</SelectItem>
            <SelectItem value="CIERRE">Cierre</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">{total} asiento{total !== 1 ? "s" : ""}</p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead key={h.id}>
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((_, j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No hay asientos registrados.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer: pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Página {page} de {totalPages}</p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(1)} disabled={page <= 1}><ChevronsLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}><ChevronRight className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(totalPages)} disabled={page >= totalPages}><ChevronsRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      {/* Form dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setSelectedItem(null); }}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedItem ? "Editar asiento contable" : "Nuevo asiento contable"}</DialogTitle>
            <DialogDescription>{selectedItem ? "Modificá los datos del asiento" : "Completá los datos para crear un asiento"}</DialogDescription>
          </DialogHeader>
          <AsientoForm key={selectedItem?.id ?? "new"} asiento={selectedItem} onSubmit={handleSubmit} isLoading={isSubmitting} />
        </DialogContent>
      </Dialog>

      {/* View detail dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={(open) => { setViewDialogOpen(open); if (!open) setViewItem(null); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalle del Asiento #{viewItem?.numero}</DialogTitle>
            <DialogDescription>
              {viewItem?.tipo} • {viewItem?.fecha && formatDate(viewItem.fecha)}
            </DialogDescription>
          </DialogHeader>

          {viewItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Descripción:</span>
                  <p className="font-medium">{viewItem.descripcion}</p>
                </div>
                {viewItem.notas && (
                  <div>
                    <span className="text-muted-foreground">Notas:</span>
                    <p className="font-medium">{viewItem.notas}</p>
                  </div>
                )}
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-3">Líneas del Asiento</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cuenta</TableHead>
                      <TableHead className="text-right">Debe</TableHead>
                      <TableHead className="text-right">Haber</TableHead>
                      <TableHead>Detalle</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewItem.lineas.map((linea) => (
                      <TableRow key={linea.id}>
                        <TableCell>
                          <span className="font-mono text-xs text-muted-foreground">{linea.cuenta.codigo}</span>
                          <br />
                          <span className="text-sm">{linea.cuenta.nombre}</span>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {linea.debe > 0 ? formatCurrency(linea.debe) : "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {linea.haber > 0 ? formatCurrency(linea.haber) : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {linea.descripcion || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-semibold bg-muted">
                      <TableCell>TOTALES</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(viewItem.totalDebe)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(viewItem.totalHaber)}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <DeleteAsientoDialog
        asiento={itemToDelete}
        open={deleteDialogOpen}
        onOpenChange={(open) => { setDeleteDialogOpen(open); if (!open) setItemToDelete(null); }}
        onConfirm={handleDelete}
        isLoading={isDeleting}
      />
    </div>
  );
}
