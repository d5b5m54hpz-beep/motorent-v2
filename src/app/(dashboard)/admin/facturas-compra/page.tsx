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
import { getColumns } from "./columns";
import { FacturaCompraForm } from "./factura-compra-form";
import { DeleteFacturaCompraDialog } from "./delete-factura-compra-dialog";
import { formatCurrency } from "@/lib/utils";
import type { FacturaCompra, FacturaCompraFormData } from "./types";

type FacturasApiResponse = {
  data: FacturaCompra[];
  total: number;
  totalPages: number;
  page: number;
  limit: number;
};

const PAGE_SIZE = 15;

export default function FacturasCompraPage() {
  const [data, setData] = useState<FacturaCompra[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [tipoFilter, setTipoFilter] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FacturaCompra | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<FacturaCompra | null>(null);
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
      if (estadoFilter) params.set("estado", estadoFilter);
      const res = await fetch(`/api/facturas-compra?${params}`, { signal });
      if (!res.ok) throw new Error("Error");
      const json: FacturasApiResponse = await res.json();
      setData(json?.data ?? []);
      setTotal(json?.total ?? 0);
      setTotalPages(json?.totalPages ?? 0);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      console.error("Error fetching facturas:", err);
      setData([]);
      setTotal(0);
      setTotalPages(0);
      toast.error("Error al cargar facturas de compra");
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, sorting, tipoFilter, estadoFilter]);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  const handleSubmit = async (formData: FacturaCompraFormData) => {
    setIsSubmitting(true);
    try {
      const url = selectedItem ? `/api/facturas-compra/${selectedItem.id}` : "/api/facturas-compra";
      const method = selectedItem ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al guardar");
      toast.success(selectedItem ? "Factura actualizada" : "Factura registrada");
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
      const res = await fetch(`/api/facturas-compra/${itemToDelete.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al eliminar");
      toast.success("Factura eliminada");
      setDeleteDialogOpen(false);
      setItemToDelete(null);
      fetchData();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleGenerateAsiento = async (factura: FacturaCompra) => {
    try {
      const res = await fetch(`/api/facturas-compra/${factura.id}/generar-asiento`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al generar asiento");
      toast.success("Asiento contable generado correctamente");
      fetchData();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Error al generar asiento");
    }
  };

  const columns = useMemo(() => getColumns({
    onEdit: (factura) => { setSelectedItem(factura); setDialogOpen(true); },
    onDelete: (factura) => { setItemToDelete(factura); setDeleteDialogOpen(true); },
    onGenerateAsiento: handleGenerateAsiento,
  }), []);

  const table = useReactTable({
    data, columns, getCoreRowModel: getCoreRowModel(),
    manualPagination: true, manualSorting: true, pageCount: totalPages,
    onSortingChange: (updater) => { setSorting(updater); setPage(1); },
    state: { sorting, pagination: { pageIndex: page - 1, pageSize: PAGE_SIZE } },
  });

  const totalMostrado = data.reduce((s, f) => s + f.total, 0);
  const pendientesPago = data.filter(f => f.estado === "PENDIENTE" || f.estado === "PAGADA_PARCIAL").reduce((s, f) => s + (f.total - f.montoAbonado), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Facturas de Compra</h1>
          <p className="text-muted-foreground">Gestión de facturas y comprobantes de proveedores</p>
        </div>
        <Button onClick={() => { setSelectedItem(null); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Factura
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por razón social, CUIT, número..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={tipoFilter} onValueChange={(v) => { setTipoFilter(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="A">Tipo A</SelectItem>
            <SelectItem value="B">Tipo B</SelectItem>
            <SelectItem value="C">Tipo C</SelectItem>
            <SelectItem value="TICKET">Ticket</SelectItem>
            <SelectItem value="RECIBO">Recibo</SelectItem>
          </SelectContent>
        </Select>
        <Select value={estadoFilter} onValueChange={(v) => { setEstadoFilter(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="PENDIENTE">Pendiente</SelectItem>
            <SelectItem value="PAGADA">Pagada</SelectItem>
            <SelectItem value="PAGADA_PARCIAL">Pago Parcial</SelectItem>
            <SelectItem value="VENCIDA">Vencida</SelectItem>
            <SelectItem value="ANULADA">Anulada</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">{total} factura{total !== 1 ? "s" : ""}</p>
      </div>

      {pendientesPago > 0 && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950 p-3">
          <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
            Adeudado: <span className="text-base font-bold">{formatCurrency(pendientesPago)}</span>
          </p>
        </div>
      )}

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
                  No hay facturas registradas.
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

      {/* Footer: total + pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          Total mostrado: <span className="text-red-600 dark:text-red-400">{formatCurrency(totalMostrado)}</span>
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <span className="text-sm text-muted-foreground mr-2">Página {page} de {totalPages}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(1)} disabled={page <= 1}><ChevronsLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}><ChevronRight className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(totalPages)} disabled={page >= totalPages}><ChevronsRight className="h-4 w-4" /></Button>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setSelectedItem(null); }}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedItem ? "Editar factura de compra" : "Nueva factura de compra"}</DialogTitle>
            <DialogDescription>{selectedItem ? "Modificá los datos de la factura" : "Completá los datos para registrar una factura de compra"}</DialogDescription>
          </DialogHeader>
          <FacturaCompraForm key={selectedItem?.id ?? "new"} factura={selectedItem} onSubmit={handleSubmit} isLoading={isSubmitting} />
        </DialogContent>
      </Dialog>

      <DeleteFacturaCompraDialog
        factura={itemToDelete}
        open={deleteDialogOpen}
        onOpenChange={(open) => { setDeleteDialogOpen(open); if (!open) setItemToDelete(null); }}
        onConfirm={handleDelete}
        isLoading={isDeleting}
      />
    </div>
  );
}
