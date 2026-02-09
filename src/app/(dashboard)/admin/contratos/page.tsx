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
import { Badge } from "@/components/ui/badge";
import { getColumns } from "./columns";
import { ContratoForm } from "./contrato-form";
import { CancelContratoDialog } from "./cancel-contrato-dialog";
import { ViewContratoDialog } from "./view-contrato-dialog";
import { ExportButton } from "@/components/import-export/export-button";
import type { Contrato, ContratosApiResponse } from "./types";
import type { ContratoInput } from "@/lib/validations";

const PAGE_SIZE = 15;

const ESTADO_TABS = [
  { label: "Todos", value: "" },
  { label: "Pendiente", value: "pendiente" },
  { label: "Activo", value: "activo" },
  { label: "Finalizado", value: "finalizado" },
  { label: "Cancelado", value: "cancelado" },
];

export default function ContratosPage() {
  // Data state
  const [data, setData] = useState<Contrato[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [estadoFilter, setEstadoFilter] = useState("");

  // Pagination & search
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);

  // Create/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedContrato, setSelectedContrato] = useState<Contrato | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cancel dialog
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [contratoToCancel, setContratoToCancel] = useState<Contrato | null>(null);
  const [isCanceling, setIsCanceling] = useState(false);

  // View dialog
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [contratoToView, setContratoToView] = useState<Contrato | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [estadoFilter]);

  // Fetch contratos
  const fetchContratos = useCallback(
    async (signal?: AbortSignal) => {
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

        if (estadoFilter) {
          params.append("estado", estadoFilter);
        }

        const res = await fetch(`/api/contratos?${params}`, { signal });
        if (!res.ok) throw new Error("Error fetching contratos");
        const json: ContratosApiResponse = await res.json();
        setData(json.data);
        setTotal(json.total);
        setTotalPages(json.totalPages);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        toast.error("Error al cargar los contratos");
      } finally {
        setIsLoading(false);
      }
    },
    [page, debouncedSearch, sorting, estadoFilter]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchContratos(controller.signal);
    return () => controller.abort();
  }, [fetchContratos]);

  // CRUD handlers
  const handleSubmit = async (formData: ContratoInput) => {
    setIsSubmitting(true);
    try {
      const url = selectedContrato
        ? `/api/contratos/${selectedContrato.id}`
        : "/api/contratos";
      const method = selectedContrato ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al guardar");

      toast.success(
        selectedContrato ? "Contrato actualizado" : "Contrato creado y pagos generados"
      );
      setDialogOpen(false);
      setSelectedContrato(null);
      fetchContratos();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error al guardar";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!contratoToCancel) return;
    setIsCanceling(true);
    try {
      const res = await fetch(`/api/contratos/${contratoToCancel.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al cancelar");

      toast.success("Contrato cancelado");
      setCancelDialogOpen(false);
      setContratoToCancel(null);
      fetchContratos();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error al cancelar";
      toast.error(message);
    } finally {
      setIsCanceling(false);
    }
  };

  // Column actions
  const columns = useMemo(
    () =>
      getColumns({
        onView: (contrato) => {
          setContratoToView(contrato);
          setViewDialogOpen(true);
        },
        onEdit: (contrato) => {
          setSelectedContrato(contrato);
          setDialogOpen(true);
        },
        onCancel: (contrato) => {
          setContratoToCancel(contrato);
          setCancelDialogOpen(true);
        },
      }),
    []
  );

  // TanStack Table (manual pagination + sorting)
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contratos</h1>
          <p className="text-muted-foreground">
            Gestion de contratos de alquiler
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton module="contratos" />
          <Button
            onClick={() => {
              setSelectedContrato(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Contrato
          </Button>
        </div>
      </div>

      {/* Estado tabs */}
      <div className="flex items-center gap-2">
        {ESTADO_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setEstadoFilter(tab.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              estadoFilter === tab.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, moto o ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {total} contrato{total !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Table */}
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
                  No hay contratos registrados.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

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
          if (!open) setSelectedContrato(null);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedContrato ? "Editar contrato" : "Nuevo contrato"}
            </DialogTitle>
            <DialogDescription>
              {selectedContrato
                ? "Modifica los datos del contrato"
                : "Completa los datos para crear un nuevo contrato. Los pagos se generaran automaticamente."}
            </DialogDescription>
          </DialogHeader>
          <ContratoForm
            key={selectedContrato?.id ?? "new"}
            contrato={selectedContrato}
            onSubmit={handleSubmit}
            isLoading={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <ViewContratoDialog
        contrato={contratoToView}
        open={viewDialogOpen}
        onOpenChange={(open) => {
          setViewDialogOpen(open);
          if (!open) setContratoToView(null);
        }}
      />

      {/* Cancel Dialog */}
      <CancelContratoDialog
        contrato={contratoToCancel}
        open={cancelDialogOpen}
        onOpenChange={(open) => {
          setCancelDialogOpen(open);
          if (!open) setContratoToCancel(null);
        }}
        onConfirm={handleCancel}
        isLoading={isCanceling}
      />
    </div>
  );
}
