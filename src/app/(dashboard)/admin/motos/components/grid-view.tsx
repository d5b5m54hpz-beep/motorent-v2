"use client";

import Image from "next/image";
import { Eye, Pencil, Trash2, MoreVertical } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Moto } from "../types";

const estadoBadgeMap: Record<string, { label: string; className: string }> = {
  disponible: {
    label: "Disponible",
    className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  },
  alquilada: {
    label: "Alquilada",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  },
  mantenimiento: {
    label: "Mantenimiento",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  },
  baja: {
    label: "Baja",
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  },
};

type GridViewProps = {
  motos: Moto[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onView: (moto: Moto) => void;
  onEdit: (moto: Moto) => void;
  onDelete: (moto: Moto) => void;
};

export function GridView({
  motos,
  selectedIds,
  onToggleSelect,
  onView,
  onEdit,
  onDelete,
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
            className={`overflow-hidden transition-all ${
              isSelected ? "ring-2 ring-cyan-500" : ""
            }`}
          >
            <CardContent className="p-0">
              {/* Imagen */}
              <div className="relative h-48 w-full overflow-hidden bg-muted">
                {moto.imagen ? (
                  <Image
                    src={moto.imagen}
                    alt={`${moto.marca} ${moto.modelo}`}
                    fill
                    className="object-cover"
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

                {/* Actions Menu */}
                <div className="absolute bottom-2 right-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8 bg-background/80 backdrop-blur-sm"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onView(moto)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Ver
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(moto)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDelete(moto)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Info */}
              <div className="space-y-3 p-4">
                {/* Marca y Modelo */}
                <div>
                  <h3 className="truncate text-lg font-semibold">
                    {moto.marca} {moto.modelo}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Año {moto.anio}
                  </p>
                </div>

                {/* Detalles */}
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

                {/* Color */}
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
