"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal, Pencil, Trash2, Package, History, QrCode, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/lib/utils";
import type { Repuesto } from "./types";
import Image from "next/image";

type ColumnActions = {
  onEdit: (r: Repuesto) => void;
  onDelete: (r: Repuesto) => void;
  onAjustarStock?: (r: Repuesto) => void;
  onVerMovimientos?: (r: Repuesto) => void;
  onImprimirEtiqueta?: (r: Repuesto) => void;
};

const CATEGORIA_COLORS: Record<string, string> = {
  FRENOS: "bg-red-500/10 text-red-700 border-red-200",
  MOTOR: "bg-blue-500/10 text-blue-700 border-blue-200",
  SUSPENSION: "bg-purple-500/10 text-purple-700 border-purple-200",
  ELECTRICO: "bg-yellow-500/10 text-yellow-700 border-yellow-200",
  TRANSMISION: "bg-green-500/10 text-green-700 border-green-200",
  NEUMATICOS: "bg-gray-500/10 text-gray-700 border-gray-200",
  FILTROS: "bg-orange-500/10 text-orange-700 border-orange-200",
  ACEITES: "bg-amber-500/10 text-amber-700 border-amber-200",
  GENERAL: "bg-slate-500/10 text-slate-700 border-slate-200",
};

export function getColumns(actions: ColumnActions): ColumnDef<Repuesto>[] {
  return [
    {
      id: "imagen",
      header: "",
      cell: ({ row }) => {
        const r = row.original;
        if (r.imagenUrl) {
          return (
            <div className="relative h-10 w-10 rounded overflow-hidden bg-muted">
              <Image
                src={r.imagenUrl}
                alt={r.nombre}
                fill
                className="object-cover"
                sizes="40px"
              />
            </div>
          );
        }
        return (
          <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
            <Package className="h-5 w-5 text-muted-foreground" />
          </div>
        );
      },
    },
    {
      accessorKey: "nombre",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Nombre
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const r = row.original;
        return (
          <div className="flex flex-col">
            <span className="font-medium">{r.nombre}</span>
            {r.codigo && (
              <span className="text-xs text-muted-foreground font-mono">{r.codigo}</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "categoria",
      header: "Categoría",
      cell: ({ row }) => {
        const cat = row.getValue("categoria") as string | null;
        if (!cat) return "—";
        const colorClass = CATEGORIA_COLORS[cat] || CATEGORIA_COLORS.GENERAL;
        return (
          <Badge variant="outline" className={`${colorClass} text-xs`}>
            {cat}
          </Badge>
        );
      },
    },
    {
      accessorKey: "ubicacion",
      header: () => (
        <div className="flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          Ubicación
        </div>
      ),
      cell: ({ row }) => {
        const ub = row.original.ubicacion;
        if (!ub) return <span className="text-muted-foreground">—</span>;
        return (
          <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded border">
            {ub}
          </span>
        );
      },
    },
    {
      accessorKey: "stock",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Stock
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const stock = row.original.stock;
        const minimo = row.original.stockMinimo;
        const isCritico = stock === 0;
        const isBajo = stock > 0 && stock <= minimo;
        const isOk = stock > minimo;

        let badge = null;
        if (isCritico) {
          badge = (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
              🔴 Crítico
            </Badge>
          );
        } else if (isBajo) {
          badge = (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-yellow-50 text-yellow-700 border-yellow-300">
              🟡 Bajo
            </Badge>
          );
        } else {
          badge = (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-green-50 text-green-700 border-green-300">
              🟢 OK
            </Badge>
          );
        }

        return (
          <div className="flex items-center gap-2">
            <span className={isCritico ? "text-destructive font-bold" : isBajo ? "text-yellow-700 font-semibold" : ""}>
              {stock}
            </span>
            {badge}
          </div>
        );
      },
    },
    {
      accessorKey: "stockMinimo",
      header: "Mín",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">{row.original.stockMinimo}</span>
      ),
    },
    {
      accessorKey: "precioCompra",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          P. Compra
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="text-sm">{formatCurrency(row.original.precioCompra ?? 0)}</span>
      ),
    },
    {
      accessorKey: "precioVenta",
      header: "P. Venta",
      cell: ({ row }) => (
        <span className="text-sm font-medium">{formatCurrency(row.original.precioVenta ?? 0)}</span>
      ),
    },
    {
      accessorKey: "proveedor",
      header: "Proveedor",
      cell: ({ row }) => {
        const prov = row.original.proveedor?.nombre;
        return prov ? (
          <span className="text-sm">{prov}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const r = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => actions.onEdit(r)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              {actions.onAjustarStock && (
                <DropdownMenuItem onClick={() => actions.onAjustarStock?.(r)}>
                  <Package className="mr-2 h-4 w-4" />
                  Ajustar stock
                </DropdownMenuItem>
              )}
              {actions.onVerMovimientos && (
                <DropdownMenuItem onClick={() => actions.onVerMovimientos?.(r)}>
                  <History className="mr-2 h-4 w-4" />
                  Ver movimientos
                </DropdownMenuItem>
              )}
              {actions.onImprimirEtiqueta && (
                <DropdownMenuItem onClick={() => actions.onImprimirEtiqueta?.(r)}>
                  <QrCode className="mr-2 h-4 w-4" />
                  Imprimir etiqueta
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => actions.onDelete(r)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
