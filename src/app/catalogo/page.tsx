"use client";

import { useState, useEffect } from "react";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { MotoCard } from "@/components/catalog/moto-card";
import { CatalogFilters } from "@/components/catalog/catalog-filters";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Filters = {
  tipo: string;
  precioMin: string;
  precioMax: string;
  cilindradaMin: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
};

export default function CatalogoPage() {
  const [motos, setMotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<Filters>({
    tipo: "todos",
    precioMin: "",
    precioMax: "",
    cilindradaMin: "",
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  useEffect(() => {
    const controller = new AbortController();

    async function fetchMotos() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "12",
          sortBy: filters.sortBy,
          sortOrder: filters.sortOrder,
        });

        if (filters.tipo && filters.tipo !== "todos") params.append("tipo", filters.tipo);
        if (filters.precioMin) params.append("precioMin", filters.precioMin);
        if (filters.precioMax) params.append("precioMax", filters.precioMax);
        if (filters.cilindradaMin) params.append("cilindradaMin", filters.cilindradaMin);

        const res = await fetch(`/api/public/motos?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!res.ok) throw new Error("Error al cargar motos");

        const data = await res.json();
        setMotos(data.data);
        setTotalPages(data.totalPages);
        setTotal(data.total);
      } catch (error: unknown) {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error("Error fetching motos:", error);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchMotos();

    return () => controller.abort();
  }, [page, filters]);

  const handleFiltersChange = (newFilters: Filters) => {
    setFilters(newFilters);
    setPage(1); // Reset to page 1 when filters change
  };

  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />

      <main className="flex-1">
      <div className="container px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Nuestro Catálogo</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Encontrá la moto perfecta para vos
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-4">
          {/* Filters Sidebar */}
          <aside className="lg:col-span-1">
            <div className="sticky top-20">
              <CatalogFilters filters={filters} onFiltersChange={handleFiltersChange} />
            </div>
          </aside>

          {/* Results */}
          <div className="lg:col-span-3">
            {/* Results Count */}
            <div className="mb-6 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {loading ? "Cargando..." : `${total} ${total === 1 ? "moto encontrada" : "motos encontradas"}`}
              </p>
            </div>

            {/* Grid */}
            {loading ? (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="h-48 w-full rounded-lg" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))}
              </div>
            ) : motos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-lg font-medium">No se encontraron motos</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Intentá ajustar los filtros para ver más resultados
                </p>
              </div>
            ) : (
              <>
                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {motos.map((moto) => (
                    <MotoCard key={moto.id} moto={moto} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <div className="flex items-center gap-1">
                      {[...Array(totalPages)].map((_, i) => {
                        const pageNum = i + 1;
                        // Show first, last, current, and adjacent pages
                        if (
                          pageNum === 1 ||
                          pageNum === totalPages ||
                          (pageNum >= page - 1 && pageNum <= page + 1)
                        ) {
                          return (
                            <Button
                              key={pageNum}
                              variant={page === pageNum ? "default" : "outline"}
                              size="icon"
                              onClick={() => setPage(pageNum)}
                            >
                              {pageNum}
                            </Button>
                          );
                        } else if (pageNum === page - 2 || pageNum === page + 2) {
                          return <span key={pageNum} className="px-2">...</span>;
                        }
                        return null;
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      </main>
      <PublicFooter />
    </div>
  );
}
