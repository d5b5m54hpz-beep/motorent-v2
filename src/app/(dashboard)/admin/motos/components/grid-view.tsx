"use client";

import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { Moto } from "../types";

const estadoBadgeMap: Record<string, { label: string; className: string }> = {
  EN_DEPOSITO: {
    label: "En Depósito",
    className: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  },
  EN_PATENTAMIENTO: {
    label: "Patentando",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  },
  DISPONIBLE: {
    label: "Disponible",
    className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  },
  RESERVADA: {
    label: "Reservada",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  },
  ALQUILADA: {
    label: "Alquilada",
    className: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300",
  },
  EN_SERVICE: {
    label: "En Service",
    className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  },
  EN_REPARACION: {
    label: "En Reparación",
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  },
  INMOVILIZADA: {
    label: "Inmovilizada",
    className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  },
  RECUPERACION: {
    label: "Recuperación",
    className: "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-300",
  },
  BAJA_TEMP: {
    label: "Baja Temporal",
    className: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-300",
  },
  BAJA_DEFINITIVA: {
    label: "Baja Definitiva",
    className: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300",
  },
  TRANSFERIDA: {
    label: "Transferida",
    className: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300",
  },
};

type GridViewProps = {
  motos: Moto[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onView: (moto: Moto) => void;
};

export function GridView({
  motos,
  selectedIds,
  onToggleSelect,
  onView,
}: GridViewProps) {
  if (motos.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed">
        <p className="text-muted-foreground">No hay motos para mostrar</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {motos.map((moto) => {
        const isSelected = selectedIds.has(moto.id);
        const estadoBadge = estadoBadgeMap[moto.estado] ?? {
          label: moto.estado,
          className: "",
        };

        return (
          <Card
            key={moto.id}
            onClick={(e) => {
              const target = e.target as HTMLElement;
              if (
                target.closest('[role="checkbox"]') ||
                target.closest("button") ||
                target.closest('[role="menuitem"]')
              ) {
                return;
              }
              onView(moto);
            }}
            className={cn(
              "overflow-hidden transition-all cursor-pointer",
              "hover:ring-2 hover:ring-cyan-400/40 hover:shadow-[0_0_20px_rgba(56,178,172,0.12)]",
              isSelected
                ? "ring-2 ring-cyan-500 shadow-[0_0_20px_rgba(56,178,172,0.2)]"
                : ""
            )}
          >
            <CardContent className="p-0">
              {/* Imagen */}
              <div className="relative h-48 w-full overflow-hidden bg-muted">
                {moto.imagen ? (
                  <Image
                    src={moto.imagen}
                    alt={`${moto.marca} ${moto.modelo}`}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <span className="text-muted-foreground">Sin imagen</span>
                  </div>
                )}

                {/* Checkbox & Estado */}
                <div className="absolute left-2 top-2">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggleSelect(moto.id)}
                    className="bg-background"
                  />
                </div>
                <div className="absolute right-2 top-2">
                  <Badge variant="outline" className={estadoBadge.className}>
                    {estadoBadge.label}
                  </Badge>
                </div>

              </div>

              {/* Info */}
              <div className="space-y-3 p-4">
                <div>
                  <h3 className="truncate text-lg font-semibold">
                    {moto.marca} {moto.modelo}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Año {moto.anio}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Patente:</span>
                    <p className="font-mono font-semibold">{moto.patente}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Km:</span>
                    <p className="font-semibold">
                      {moto.kilometraje?.toLocaleString("es-AR") ?? 0}
                    </p>
                  </div>
                  {moto.cilindrada && (
                    <div>
                      <span className="text-muted-foreground">Cilindrada:</span>
                      <p className="font-semibold">{moto.cilindrada} cc</p>
                    </div>
                  )}
                  {moto.tipo && (
                    <div>
                      <span className="text-muted-foreground">Tipo:</span>
                      <p className="font-semibold">{moto.tipo}</p>
                    </div>
                  )}
                </div>

                {moto.color && (
                  <div className="flex items-center gap-2">
                    <div
                      className="h-4 w-4 rounded-full border"
                      style={{ backgroundColor: moto.color.toLowerCase() }}
                    />
                    <span className="text-sm capitalize">{moto.color}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
