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
import { MotoForm } from "./moto-form";
import { DeleteMotoDialog } from "./delete-moto-dialog";
import { ViewMotoDialog } from "./view-moto-dialog";
import { ExportButton } from "@/components/import-export/export-button";
import { ImportDialog } from "@/components/import-export/import-dialog";
import { StatsCards } from "./components/stats-cards";
import { BulkActionsToolbar } from "./components/bulk-actions-toolbar";
import { BulkStateDialog } from "./components/bulk-state-dialog";
import { BulkDeleteConfirm } from "./components/bulk-delete-confirm";
import {
  MotosFiltersComponent,
  type MotosFilters,
} from "./components/motos-filters";
import { GridView } from "./components/grid-view";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { LayoutGrid, TableIcon } from "lucide-react";
import type { Moto, MotosApiResponse } from "./types";
import type { MotoInput } from "@/lib/validations";

const PAGE_SIZE = 15;

export default function MotosPage() {
  // Data state
  const [data, setData] = useState<Moto[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Pagination & search
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);

  // Create/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMoto, setSelectedMoto] = useState<Moto | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [motoToDelete, setMotoToDelete] = useState<Moto | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // View dialog
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [motoToView, setMotoToView] = useState<Moto | null>(null);

  // Selection & bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStateDialogOpen, setBulkStateDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);

  // Filters & view mode
  const [filters, setFilters] = useState<MotosFilters>({
    estado: [],
    marca: "",
    modelo: "",
    anioMin: "",
    anioMax: "",
    color: "",
    tipo: "",
    cilindradaMin: "",
    cilindradaMax: "",
  });
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch motos
  const fetchMotos = useCallback(async (signal?: AbortSignal) => {
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
      const res = await fetch(`/api/motos?${params}`, { signal });
      if (!res.ok) throw new Error("Error fetching motos");
      const json: MotosApiResponse = await res.json();
      setData(json.data);
      setTotal(json.total);
      setTotalPages(json.totalPages);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      toast.error("Error al cargar las motos");
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, sorting]);

  useEffect(() => {
    const controller = new AbortController();
    fetchMotos(controller.signal);
    return () => controller.abort();
  }, [fetchMotos]);

  // CRUD handlers
  const handleSubmit = async (formData: MotoInput) => {
    setIsSubmitting(true);
    try {
      const url = selectedMoto
        ? `/api/motos/${selectedMoto.id}`
        : "/api/motos";
      const method = selectedMoto ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al guardar");

      toast.success(selectedMoto ? "Moto actualizada" : "Moto creada");
      setDialogOpen(false);
      setSelectedMoto(null);
      fetchMotos();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error al guardar";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!motoToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/motos/${motoToDelete.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al eliminar");

      toast.success("Moto eliminada");
      setDeleteDialogOpen(false);
      setMotoToDelete(null);
      fetchMotos();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error al eliminar";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Bulk actions handlers
  const handleBulkStateChange = async (newState: string) => {
    setIsBulkActionLoading(true);
    try {
      const res = await fetch("/api/motos/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          updates: { estado: newState },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al actualizar");

      toast.success(`${selectedIds.size} moto(s) actualizada(s)`);
      setBulkStateDialogOpen(false);
      setSelectedIds(new Set());
      fetchMotos();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error al actualizar";
      toast.error(message);
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    setIsBulkActionLoading(true);
    try {
      const res = await fetch("/api/motos/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al eliminar");

      const { deleted, skipped } = json;
      if (deleted > 0) {
        toast.success(`${deleted} moto(s) eliminada(s)`);
      }
      if (skipped > 0) {
        toast.warning(`${skipped} moto(s) con contratos no fueron eliminadas`);
      }
      setBulkDeleteDialogOpen(false);
      setSelectedIds(new Set());
      fetchMotos();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error al eliminar";
      toast.error(message);
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.size === data.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.map((m) => m.id)));
    }
  };

  const handleExportSelected = () => {
    toast.info("Exportación de seleccionadas - próximamente");
  };

  // Column actions
  const columns = useMemo(
    () =>
      getColumns({
        onView: (moto) => {
          setMotoToView(moto);
          setViewDialogOpen(true);
        },
        onEdit: (moto) => {
          setSelectedMoto(moto);
          setDialogOpen(true);
        },
        onDelete: (moto) => {
          setMotoToDelete(moto);
          setDeleteDialogOpen(true);
        },
        selectedIds,
        onToggleSelect: handleToggleSelect,
        onToggleSelectAll: handleToggleSelectAll,
      }),
    [selectedIds]
  );

  // Calculate stats
  const stats = useMemo(() => {
    const disponibles = data.filter((m) => m.estado === "disponible").length;
    const alquiladas = data.filter((m) => m.estado === "alquilada").length;
    const mantenimiento = data.filter((m) => m.estado === "mantenimiento").length;
    const baja = data.filter((m) => m.estado === "baja").length;

    return { disponibles, alquiladas, mantenimiento, baja };
  }, [data]);

  // Apply client-side filters
  const filteredData = useMemo(() => {
    return data.filter((moto) => {
      // Estado filter
      if (filters.estado.length > 0 && !filters.estado.includes(moto.estado)) {
        return false;
      }
      // Marca filter
      if (filters.marca && moto.marca !== filters.marca) {
        return false;
      }
      // Modelo filter
      if (filters.modelo && moto.modelo !== filters.modelo) {
        return false;
      }
      // Año filter
      if (filters.anioMin && moto.anio < parseInt(filters.anioMin)) {
        return false;
      }
      if (filters.anioMax && moto.anio > parseInt(filters.anioMax)) {
        return false;
      }
      // Color filter
      if (filters.color && moto.color !== filters.color) {
        return false;
      }
      // Tipo filter
      if (filters.tipo && moto.tipo !== filters.tipo) {
        return false;
      }
      // Cilindrada filter
      if (
        filters.cilindradaMin &&
        moto.cilindrada &&
        moto.cilindrada < parseInt(filters.cilindradaMin)
      ) {
        return false;
      }
      if (
        filters.cilindradaMax &&
        moto.cilindrada &&
        moto.cilindrada > parseInt(filters.cilindradaMax)
      ) {
        return false;
      }
      return true;
    });
  }, [data, filters]);

  const handleClearFilters = () => {
    setFilters({
      estado: [],
      marca: "",
      modelo: "",
      anioMin: "",
      anioMax: "",
      color: "",
      tipo: "",
      cilindradaMin: "",
      cilindradaMax: "",
    });
  };

  // TanStack Table (manual pagination + sorting)
  const table = useReactTable({
    data: filteredData,
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Motos</h1>
          <p className="text-muted-foreground">
            Gestión del inventario de motos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton module="motos" />
          <ImportDialog module="motos" onSuccess={fetchMotos} />
          <Button
            onClick={() => {
              setSelectedMoto(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nueva Moto
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <StatsCards
        total={total}
        disponibles={stats.disponibles}
        alquiladas={stats.alquiladas}
        mantenimiento={stats.mantenimiento}
        baja={stats.baja}
      />

      {/* Search & View Toggle */}
      <div className="flex items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por marca, modelo o patente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(value) => {
            if (value) setViewMode(value as "table" | "grid");
          }}
        >
          <ToggleGroupItem value="table" aria-label="Vista tabla">
            <TableIcon className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="grid" aria-label="Vista grilla">
            <LayoutGrid className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
        <p className="text-sm text-muted-foreground">
          {filteredData.length} de {total} moto{total !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Filters */}
      <MotosFiltersComponent
        filters={filters}
        onFiltersChange={setFilters}
        onClearFilters={handleClearFilters}
      />

      {/* Bulk Actions Toolbar */}
      {selectedIds.size > 0 && (
        <BulkActionsToolbar
          selectedCount={selectedIds.size}
          onChangeState={() => setBulkStateDialogOpen(true)}
          onChangeImage={() => toast.info("Cambiar imagen - próximamente")}
          onDelete={() => setBulkDeleteDialogOpen(true)}
          onExport={handleExportSelected}
          onDeselect={() => setSelectedIds(new Set())}
        />
      )}

      {/* Table / Grid View */}
      {viewMode === "table" ? (
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
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No hay motos registradas.
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => {
                  const isSelected = selectedIds.has(row.original.id);
                  return (
                    <TableRow
                      key={row.id}
                      className={isSelected ? "bg-cyan-500/5" : ""}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      ) : (
        <GridView
          motos={filteredData}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onView={(moto) => {
            setMotoToView(moto);
            setViewDialogOpen(true);
          }}
          onEdit={(moto) => {
            setSelectedMoto(moto);
            setDialogOpen(true);
          }}
          onDelete={(moto) => {
            setMotoToDelete(moto);
            setDeleteDialogOpen(true);
          }}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Pagina {page} de {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(1)}
              disabled={page <= 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage((p) => p - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(totalPages)}
              disabled={page >= totalPages}
            >
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
          if (!open) setSelectedMoto(null);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedMoto ? "Editar moto" : "Nueva moto"}
            </DialogTitle>
            <DialogDescription>
              {selectedMoto
                ? "Modifica los datos de la moto"
                : "Completa los datos para agregar una nueva moto"}
            </DialogDescription>
          </DialogHeader>
          <MotoForm
            key={selectedMoto?.id ?? "new"}
            moto={selectedMoto}
            onSubmit={handleSubmit}
            isLoading={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <ViewMotoDialog
        moto={motoToView}
        open={viewDialogOpen}
        onOpenChange={(open) => {
          setViewDialogOpen(open);
          if (!open) setMotoToView(null);
        }}
      />

      {/* Delete Dialog */}
      <DeleteMotoDialog
        moto={motoToDelete}
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setMotoToDelete(null);
        }}
        onConfirm={handleDelete}
        isLoading={isDeleting}
      />

      {/* Bulk State Dialog */}
      <BulkStateDialog
        open={bulkStateDialogOpen}
        onOpenChange={setBulkStateDialogOpen}
        selectedCount={selectedIds.size}
        onConfirm={handleBulkStateChange}
        isLoading={isBulkActionLoading}
      />

      {/* Bulk Delete Dialog */}
      <BulkDeleteConfirm
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        selectedCount={selectedIds.size}
        onConfirm={handleBulkDelete}
        isLoading={isBulkActionLoading}
      />
    </div>
  );
}
