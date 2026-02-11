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
import { CuentaForm } from "./cuenta-form";
import { DeleteCuentaDialog } from "./delete-cuenta-dialog";
import type { CuentaContable, CuentaContableFormData } from "./types";

type CuentasApiResponse = {
  data: CuentaContable[];
  total: number;
  totalPages: number;
  page: number;
  limit: number;
};

const PAGE_SIZE = 50; // Higher for chart of accounts

export default function CuentasContablesPage() {
  const [data, setData] = useState<CuentaContable[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [tipoFilter, setTipoFilter] = useState("");
  const [nivelFilter, setNivelFilter] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CuentaContable | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<CuentaContable | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    try {
      const sortBy = sorting[0]?.id ?? "codigo";
      const sortOrder = sorting[0]?.desc === false ? "asc" : "desc";
      const params = new URLSearchParams({
        page: String(page), limit: String(PAGE_SIZE), search: debouncedSearch, sortBy, sortOrder,
      });
      if (tipoFilter) params.set("tipo", tipoFilter);
      if (nivelFilter) params.set("nivel", nivelFilter);
      const res = await fetch(`/api/cuentas-contables?${params}`, { signal });
      if (!res.ok) throw new Error("Error");
      const json: CuentasApiResponse = await res.json();
      setData(json.data);
      setTotal(json.total);
      setTotalPages(json.totalPages);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      toast.error("Error al cargar cuentas contables");
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, sorting, tipoFilter, nivelFilter]);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  const handleSubmit = async (formData: CuentaContableFormData) => {
    setIsSubmitting(true);
    try {
      const url = selectedItem ? `/api/cuentas-contables/${selectedItem.id}` : "/api/cuentas-contables";
      const method = selectedItem ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al guardar");
      toast.success(selectedItem ? "Cuenta actualizada" : "Cuenta creada");
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
      const res = await fetch(`/api/cuentas-contables/${itemToDelete.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al eliminar");
      toast.success("Cuenta eliminada");
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
    onEdit: (cuenta) => { setSelectedItem(cuenta); setDialogOpen(true); },
    onDelete: (cuenta) => { setItemToDelete(cuenta); setDeleteDialogOpen(true); },
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
          <h1 className="text-2xl font-bold tracking-tight">Plan de Cuentas</h1>
          <p className="text-muted-foreground">Estructura jerárquica de cuentas contables</p>
        </div>
        <Button onClick={() => { setSelectedItem(null); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Cuenta
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por código o nombre..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={tipoFilter} onValueChange={(v) => { setTipoFilter(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="ACTIVO">Activo</SelectItem>
            <SelectItem value="PASIVO">Pasivo</SelectItem>
            <SelectItem value="PATRIMONIO">Patrimonio</SelectItem>
            <SelectItem value="INGRESO">Ingreso</SelectItem>
            <SelectItem value="EGRESO">Egreso</SelectItem>
          </SelectContent>
        </Select>
        <Select value={nivelFilter} onValueChange={(v) => { setNivelFilter(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Nivel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="1">Nivel 1</SelectItem>
            <SelectItem value="2">Nivel 2</SelectItem>
            <SelectItem value="3">Nivel 3</SelectItem>
            <SelectItem value="4">Nivel 4</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">{total} cuenta{total !== 1 ? "s" : ""}</p>
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
                  No hay cuentas registradas.
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

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setSelectedItem(null); }}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedItem ? "Editar cuenta contable" : "Nueva cuenta contable"}</DialogTitle>
            <DialogDescription>{selectedItem ? "Modificá los datos de la cuenta" : "Completá los datos para crear una cuenta"}</DialogDescription>
          </DialogHeader>
          <CuentaForm key={selectedItem?.id ?? "new"} cuenta={selectedItem} onSubmit={handleSubmit} isLoading={isSubmitting} />
        </DialogContent>
      </Dialog>

      <DeleteCuentaDialog
        cuenta={itemToDelete}
        open={deleteDialogOpen}
        onOpenChange={(open) => { setDeleteDialogOpen(open); if (!open) setItemToDelete(null); }}
        onConfirm={handleDelete}
        isLoading={isDeleting}
      />
    </div>
  );
}
