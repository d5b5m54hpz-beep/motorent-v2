"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { X } from "lucide-react";

type Filters = {
  tipo: string;
  precioMin: string;
  precioMax: string;
  cilindradaMin: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
};

type Props = {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
};

export function CatalogFilters({ filters, onFiltersChange }: Props) {
  const [tipos, setTipos] = useState<string[]>([]);

  useEffect(() => {
    // Fetch unique tipos from API
    fetch('/api/motos/tipos')
      .then(r => r.json())
      .then(data => setTipos(data.tipos || []))
      .catch(() => {});
  }, []);

  const handleChange = (key: keyof Filters, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const handleReset = () => {
    onFiltersChange({
      tipo: "todos",
      precioMin: "",
      precioMax: "",
      cilindradaMin: "",
      sortBy: "createdAt",
      sortOrder: "desc",
    });
  };

  const hasActiveFilters =
    (filters.tipo && filters.tipo !== "todos") || filters.precioMin || filters.precioMax || filters.cilindradaMin;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold tracking-tight">Filtros</h3>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <X className="h-4 w-4 mr-1" />
            Limpiar
          </Button>
        )}
      </div>

      <Separator />

      {/* Tipo */}
      <div className="space-y-2">
        <Label htmlFor="tipo">Tipo de Moto</Label>
        <Select value={filters.tipo} onValueChange={(value) => handleChange("tipo", value)}>
          <SelectTrigger id="tipo">
            <SelectValue placeholder="Todos los tipos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los tipos</SelectItem>
            {tipos.map((tipo) => (
              <SelectItem key={tipo} value={tipo}>
                {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Precio */}
      <div className="space-y-3">
        <Label>Rango de Precio Mensual</Label>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="precioMin" className="text-xs text-muted-foreground">
              Mínimo
            </Label>
            <Input
              id="precioMin"
              type="number"
              placeholder="$0"
              value={filters.precioMin}
              onChange={(e) => handleChange("precioMin", e.target.value)}
              min="0"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="precioMax" className="text-xs text-muted-foreground">
              Máximo
            </Label>
            <Input
              id="precioMax"
              type="number"
              placeholder="Sin límite"
              value={filters.precioMax}
              onChange={(e) => handleChange("precioMax", e.target.value)}
              min="0"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Cilindrada */}
      <div className="space-y-2">
        <Label htmlFor="cilindradaMin">Cilindrada Mínima (cc)</Label>
        <Input
          id="cilindradaMin"
          type="number"
          placeholder="Ej: 150"
          value={filters.cilindradaMin}
          onChange={(e) => handleChange("cilindradaMin", e.target.value)}
          min="0"
        />
      </div>

      <Separator />

      {/* Ordenar */}
      <div className="space-y-2">
        <Label htmlFor="sortBy">Ordenar por</Label>
        <Select value={filters.sortBy} onValueChange={(value) => handleChange("sortBy", value)}>
          <SelectTrigger id="sortBy">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="precioMensual">Precio</SelectItem>
            <SelectItem value="anio">Año</SelectItem>
            <SelectItem value="cilindrada">Cilindrada</SelectItem>
            <SelectItem value="createdAt">Más recientes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="sortOrder">Orden</Label>
        <Select
          value={filters.sortOrder}
          onValueChange={(value) => handleChange("sortOrder", value as "asc" | "desc")}
        >
          <SelectTrigger id="sortOrder">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="asc">Ascendente</SelectItem>
            <SelectItem value="desc">Descendente</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
