"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type SortingState,
} from "@tanstack/react-table";
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { getColumns } from "./columns";
import { RegistrarPagoDialog } from "./registrar-pago-dialog";
import { ViewPagoDialog } from "./view-pago-dialog";
import { ExportButton } from "@/components/import-export/export-button";
import type { Pago, PagosApiResponse } from "./types";

const PAGE_SIZE = 15;

const ESTADO_TABS = [
  { label: "Todos", value: "" },
  { label: "Pendiente", value: "pendiente" },
  { label: "Aprobado", value: "aprobado" },
  { label: "Rechazado", value: "rechazado" },
  { label: "Vencido", value: "vencido" },
];

export default function PagosPage() {
  // Data state
  const [data, setData] = useState<Pago[]>([]);
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

  // Registrar dialog
  const [registrarDialogOpen, setRegistrarDialogOpen] = useState(false);
  const [pagoToRegistrar, setPagoToRegistrar] = useState<Pago | null>(null);
  const [isRegistrando, setIsRegistrando] = useState(false);

  // View dialog
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [pagoToView, setPagoToView] = useState<Pago | null>(null);

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

  // Fetch pagos
  const fetchPagos = useCallback(
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

        // Filtro especial para vencidos
        if (estadoFilter === "vencido") {
          params.append("estado", "pendiente");
        } else if (estadoFilter) {
          params.append("estado", estadoFilter);
        }

        const res = await fetch(`/api/pagos?${params}`, { signal });
        if (!res.ok) throw new Error("Error fetching pagos");
        const json: PagosApiResponse = await res.json();

        // Filtrar vencidos en cliente si es necesario
        let pagosFinales = json.data;
        if (estadoFilter === "vencido") {
          const hoy = new Date();
          pagosFinales = json.data.filter((p) => {
            if (!p.vencimientoAt) return false;
            return new Date(p.vencimientoAt) < hoy;
          });
        }

        setData(pagosFinales);
        setTotal(estadoFilter === "vencido" ? pagosFinales.length : json.total);
        setTotalPages(estadoFilter === "vencido" ? 1 : json.totalPages);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        toast.error("Error al cargar los pagos");
      } finally {
        setIsLoading(false);
      }
    },
    [page, debouncedSearch, sorting, estadoFilter]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchPagos(controller.signal);
    return () => controller.abort();
  }, [fetchPagos]);

  // Registrar pago handler
  const handleRegistrar = async (formData: {
    metodo: string;
    mpPaymentId?: string;
    comprobante?: string;
    notas?: string;
  }) => {
    if (!pagoToRegistrar) return;
    setIsRegistrando(true);
    try {
      const res = await fetch(`/api/pagos/${pagoToRegistrar.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estado: "aprobado",
          ...formData,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al registrar pago");

      toast.success("Pago registrado correctamente");
      setRegistrarDialogOpen(false);
      setPagoToRegistrar(null);
      fetchPagos();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error al registrar pago";
      toast.error(message);
    } finally {
      setIsRegistrando(false);
    }
  };

  // Column actions
  const columns = useMemo(
    () =>
      getColumns({
        onView: (pago) => {
          setPagoToView(pago);
          setViewDialogOpen(true);
        },
        onRegistrar: (pago) => {
          setPagoToRegistrar(pago);
          setRegistrarDialogOpen(true);
        },
      }),
    []
  );

  // TanStack Table
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
          <h1 className="text-2xl font-bold tracking-tight">Pagos</h1>
          <p className="text-muted-foreground">
            Gestión de pagos y cobros de contratos
          </p>
        </div>
        <ExportButton module="pagos" />
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
            placeholder="Buscar por cliente, moto, ID pago o contrato..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {total} pago{total !== 1 ? "s" : ""}
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
                  No hay pagos registrados.
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

      {/* Registrar Pago Dialog */}
      <RegistrarPagoDialog
        pago={pagoToRegistrar}
        open={registrarDialogOpen}
        onOpenChange={(open) => {
          setRegistrarDialogOpen(open);
          if (!open) setPagoToRegistrar(null);
        }}
        onConfirm={handleRegistrar}
        isLoading={isRegistrando}
      />

      {/* View Dialog */}
      <ViewPagoDialog
        pago={pagoToView}
        open={viewDialogOpen}
        onOpenChange={(open) => {
          setViewDialogOpen(open);
          if (!open) setPagoToView(null);
        }}
      />
    </div>
  );
}
