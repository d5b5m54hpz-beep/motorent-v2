"use client";

import { useEffect, useState } from "react";
import { History, Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { Repuesto } from "./types";

type Movimiento = {
  id: string;
  tipo: string;
  cantidad: number;
  motivo: string | null;
  stockAnterior: number;
  stockNuevo: number;
  createdAt: string;
  usuario: { email: string } | null;
  recepcion: { numero: string } | null;
};

type MovimientosSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repuesto: Repuesto | null;
};

const TIPO_COLORS: Record<string, string> = {
  ENTRADA_COMPRA: "bg-green-500/10 text-green-700 border-green-200",
  SALIDA_CONSUMO_OT: "bg-red-500/10 text-red-700 border-red-200",
  ENTRADA_AJUSTE: "bg-blue-500/10 text-blue-700 border-blue-200",
  SALIDA_AJUSTE: "bg-orange-500/10 text-orange-700 border-orange-200",
  SALIDA_ROTURA: "bg-red-700/10 text-red-800 border-red-300",
  IMPORTACION: "bg-cyan-500/10 text-cyan-700 border-cyan-200",
};

const PAGE_SIZE = 20;

export function MovimientosSheet({ open, onOpenChange, repuesto }: MovimientosSheetProps) {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    if (open && repuesto) {
      setPage(1);
      fetchMovimientos(1, true);
    }
  }, [open, repuesto]);

  const fetchMovimientos = async (pageNum: number, reset = false) => {
    if (!repuesto) return;

    const loadingState = pageNum === 1 ? setIsLoading : setIsLoadingMore;
    loadingState(true);

    try {
      const params = new URLSearchParams({
        page: String(pageNum),
        limit: String(PAGE_SIZE),
      });
      const res = await fetch(`/api/repuestos/${repuesto.id}/movimientos?${params}`);
      if (!res.ok) throw new Error("Error fetching movements");

      const json = await res.json();
      setMovimientos(reset ? json.data : [...movimientos, ...json.data]);
      setTotal(json.total);
    } catch (error) {
      console.error("Error fetching movements:", error);
    } finally {
      loadingState(false);
    }
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchMovimientos(nextPage, false);
  };

  const hasMore = movimientos.length < total;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        {repuesto && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Movimientos — {repuesto.nombre}
              </SheetTitle>
              <SheetDescription>
                {repuesto.codigo && (
                  <span className="font-mono text-xs">{repuesto.codigo}</span>
                )}
                {" | "}
                Stock actual: <span className="font-semibold">{repuesto.stock}</span>
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-4">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="space-y-2 pb-4 border-b">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                ))
              ) : movimientos.length > 0 ? (
                <>
                  {movimientos.map((mov) => (
                    <div key={mov.id} className="pb-4 border-b last:border-0">
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(mov.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                        </span>
                        <Badge variant="outline" className={`text-xs ${TIPO_COLORS[mov.tipo] || ""}`}>
                          {mov.tipo.replace(/_/g, " ")}
                        </Badge>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-lg font-semibold ${
                              mov.cantidad > 0 ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {mov.cantidad > 0 ? "+" : ""}
                            {mov.cantidad}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            Stock: {mov.stockAnterior} → {mov.stockNuevo}
                          </span>
                        </div>

                        {mov.motivo && (
                          <p className="text-sm text-muted-foreground">{mov.motivo}</p>
                        )}

                        {mov.recepcion && (
                          <p className="text-xs text-muted-foreground">
                            Recepción: {mov.recepcion.numero}
                          </p>
                        )}

                        {mov.usuario && (
                          <p className="text-xs text-muted-foreground">{mov.usuario.email}</p>
                        )}
                      </div>
                    </div>
                  ))}

                  {hasMore && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleLoadMore}
                      disabled={isLoadingMore}
                    >
                      {isLoadingMore && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {isLoadingMore ? "Cargando..." : "Cargar más"}
                    </Button>
                  )}

                  <p className="text-xs text-center text-muted-foreground">
                    Mostrando {movimientos.length} de {total} movimientos
                  </p>
                </>
              ) : (
                <p className="text-center text-muted-foreground py-10">
                  Sin movimientos registrados
                </p>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
