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
import { GastoForm } from "./gasto-form";
import { DeleteGastoDialog } from "./delete-gasto-dialog";
import { formatCurrency } from "@/lib/utils";
import { categoriasGasto, categoriaGastoLabels } from "@/lib/validations";
import type { Gasto, GastosApiResponse } from "./types";
import type { GastoInput } from "@/lib/validations";

const PAGE_SIZE = 15;

export default function GastosPage() {
  const [data, setData] = useState<Gasto[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [categoriaFilter, setCategoriaFilter] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Gasto | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Gasto | null>(null);
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
      if (categoriaFilter) params.set("categoria", categoriaFilter);
      const res = await fetch(`/api/gastos?${params}`, { signal });
      if (!res.ok) throw new Error("Error");
      const json: GastosApiResponse = await res.json();
      setData(json.data);
      setTotal(json.total);
      setTotalPages(json.totalPages);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      toast.error("Error al cargar gastos");
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, sorting, categoriaFilter]);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  const handleSubmit = async (formData: GastoInput) => {
    setIsSubmitting(true);
    try {
      const url = selectedItem ? `/api/gastos/${selectedItem.id}` : "/api/gastos";
      const method = selectedItem ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al guardar");
      toast.success(selectedItem ? "Gasto actualizado" : "Gasto registrado");
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
      const res = await fetch(`/api/gastos/${itemToDelete.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al eliminar");
      toast.success("Gasto eliminado");
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
    onEdit: (g) => { setSelectedItem(g); setDialogOpen(true); },
    onDelete: (g) => { setItemToDelete(g); setDeleteDialogOpen(true); },
  }), []);

  const table = useReactTable({
    data, columns, getCoreRowModel: getCoreRowModel(),
    manualPagination: true, manualSorting: true, pageCount: totalPages,
    onSortingChange: (updater) => { setSorting(updater); setPage(1); },
    state: { sorting, pagination: { pageIndex: page - 1, pageSize: PAGE_SIZE } },
  });

  const totalMostrado = data.reduce((s, g) => s + g.monto, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gastos</h1>
          <p className="text-muted-foreground">Registro y control de gastos operativos</p>
        </div>
        <Button onClick={() => { setSelectedItem(null); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Gasto
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por concepto..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={categoriaFilter} onValueChange={(v) => { setCategoriaFilter(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {categoriasGasto.map((c) => (
              <SelectItem key={c} value={c}>{categoriaGastoLabels[c]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">{total} gasto{total !== 1 ? "s" : ""}</p>
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
                  No hay gastos registrados.
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
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedItem ? "Editar gasto" : "Nuevo gasto"}</DialogTitle>
            <DialogDescription>{selectedItem ? "Modificá los datos del gasto" : "Completá los datos para registrar un gasto"}</DialogDescription>
          </DialogHeader>
          <GastoForm key={selectedItem?.id ?? "new"} gasto={selectedItem} onSubmit={handleSubmit} isLoading={isSubmitting} />
        </DialogContent>
      </Dialog>

      <DeleteGastoDialog
        gasto={itemToDelete}
        open={deleteDialogOpen}
        onOpenChange={(open) => { setDeleteDialogOpen(open); if (!open) setItemToDelete(null); }}
        onConfirm={handleDelete}
        isLoading={isDeleting}
      />
    </div>
  );
}
