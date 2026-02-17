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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getColumns } from "./columns";
import type { AsientoContable, LineaAsiento } from "@prisma/client";

type AsientoContableWithLineas = AsientoContable & {
  lineas: (LineaAsiento & {
    cuenta: { codigo: string; nombre: string };
  })[];
};

type ApiResponse = {
  data: AsientoContableWithLineas[];
  total: number;
  totalPages: number;
  page: number;
  limit: number;
};

const PAGE_SIZE = 20;

const TIPOS = [
  { value: "", label: "Todos los tipos" },
  { value: "APERTURA", label: "Apertura" },
  { value: "COMPRA", label: "Compra" },
  { value: "VENTA", label: "Venta" },
  { value: "PAGO", label: "Pago" },
  { value: "COBRO", label: "Cobro" },
  { value: "AJUSTE", label: "Ajuste" },
  { value: "CIERRE", label: "Cierre" },
];

export default function AsientosContablesPage() {
  const [data, setData] = useState<AsientoContableWithLineas[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [tipo, setTipo] = useState("");

  // Detail sheet
  const [viewAsiento, setViewAsiento] = useState<AsientoContableWithLineas | null>(null);

  // Delete dialog
  const [deleteAsiento, setDeleteAsiento] = useState<AsientoContableWithLineas | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: PAGE_SIZE.toString(),
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (tipo) params.set("tipo", tipo);
      if (sorting.length > 0) {
        params.set("sortBy", sorting[0].id);
        params.set("sortOrder", sorting[0].desc ? "desc" : "asc");
      }

      const res = await fetch(`/api/asientos-contables?${params}`);
      if (!res.ok) throw new Error("Error fetching data");
      const json: ApiResponse = await res.json();

      setData(json.data);
      setTotal(json.total);
      setTotalPages(json.totalPages);
    } catch (error) {
      console.error(error);
      toast.error("Error al cargar asientos contables");
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, sorting, tipo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, tipo]);

  const handleDelete = async () => {
    if (!deleteAsiento) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/asientos-contables/${deleteAsiento.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error");
      }
      toast.success("Asiento eliminado");
      setDeleteAsiento(null);
      fetchData();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Error al eliminar";
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  const columns = useMemo(
    () =>
      getColumns({
        onView: (a) => setViewAsiento(a),
        onEdit: () => toast.info("Edición de asientos: próximamente"),
        onDelete: (a) => setDeleteAsiento(a),
      }),
    []
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    onSortingChange: setSorting,
    state: { sorting },
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Asientos Contables</h1>
          <p className="text-sm text-muted-foreground">
            Libro diario — {total} asiento{total !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por descripción..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={tipo || "all"} onValueChange={(v) => setTipo(v === "all" ? "" : v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            {TIPOS.map((t) => (
              <SelectItem key={t.value || "all"} value={t.value || "all"}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
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
                  {columns.map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No se encontraron asientos contables
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setViewAsiento(row.original)}
                >
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
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Página {page} de {totalPages} ({total} registros)
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage(1)}>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" disabled={page >= totalPages} onClick={() => setPage(totalPages)}>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail Sheet */}
      <Sheet open={!!viewAsiento} onOpenChange={(open) => !open && setViewAsiento(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              Asiento #{viewAsiento?.numero}
            </SheetTitle>
          </SheetHeader>
          {viewAsiento && (
            <div className="mt-6 space-y-6">
              {/* Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Fecha</p>
                  <p className="font-medium">{formatDate(viewAsiento.fecha)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tipo</p>
                  <Badge variant="outline">{viewAsiento.tipo}</Badge>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Descripción</p>
                  <p className="font-medium">{viewAsiento.descripcion}</p>
                </div>
                {viewAsiento.notas && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Notas</p>
                    <p className="text-sm">{viewAsiento.notas}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground">Estado</p>
                  <Badge variant={viewAsiento.cerrado ? "secondary" : "outline"}>
                    {viewAsiento.cerrado ? "Cerrado" : "Abierto"}
                  </Badge>
                </div>
              </div>

              {/* Totals */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground">Total Debe</p>
                    <p className="text-lg font-bold font-mono">{formatCurrency(viewAsiento.totalDebe)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground">Total Haber</p>
                    <p className="text-lg font-bold font-mono">{formatCurrency(viewAsiento.totalHaber)}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Lines */}
              <div>
                <h3 className="mb-3 text-sm font-semibold">Líneas del asiento</h3>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">#</TableHead>
                        <TableHead>Cuenta</TableHead>
                        <TableHead className="text-right">Debe</TableHead>
                        <TableHead className="text-right">Haber</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewAsiento.lineas.map((linea) => (
                        <TableRow key={linea.id}>
                          <TableCell className="text-muted-foreground">{linea.orden}</TableCell>
                          <TableCell>
                            <p className="font-mono text-xs">{linea.cuenta.codigo}</p>
                            <p className="text-sm">{linea.cuenta.nombre}</p>
                            {linea.descripcion && (
                              <p className="text-xs text-muted-foreground">{linea.descripcion}</p>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {linea.debe > 0 ? formatCurrency(linea.debe) : "-"}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {linea.haber > 0 ? formatCurrency(linea.haber) : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteAsiento} onOpenChange={(open) => !open && setDeleteAsiento(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar asiento #{deleteAsiento?.numero}</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará el asiento y todas sus líneas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
