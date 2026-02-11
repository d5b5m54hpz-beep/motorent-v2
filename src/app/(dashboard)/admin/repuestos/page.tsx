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
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

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

  const columns = useMemo(
    () =>
      getColumns({
        onEdit: (r) => {
          setSelectedItem(r);
          setDialogOpen(true);
        },
        onDelete: (r) => {
          setItemToDelete(r);
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
          <h1 className="text-2xl font-bold tracking-tight">Repuestos</h1>
          <p className="text-muted-foreground">
            Inventario de repuestos y piezas
          </p>
        </div>
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

      <div className="flex items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, código, categoría..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {total} repuesto{total !== 1 ? "s" : ""}
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
                  No hay repuestos registrados.
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
              {selectedItem ? "Editar repuesto" : "Nuevo repuesto"}
            </DialogTitle>
            <DialogDescription>
              {selectedItem
                ? "Modificá los datos del repuesto"
                : "Completá los datos para registrar un nuevo repuesto"}
            </DialogDescription>
          </DialogHeader>
          <RepuestoForm
            key={selectedItem?.id ?? "new"}
            repuesto={selectedItem}
            onSubmit={handleSubmit}
            isLoading={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <DeleteRepuestoDialog
        repuesto={itemToDelete}
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
