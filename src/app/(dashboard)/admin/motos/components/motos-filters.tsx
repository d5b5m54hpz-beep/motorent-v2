"use client";

import { useEffect, useState } from "react";
import { X, Filter, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

export type MotosFilters = {
  estado: string[];
  marca: string;
  modelo: string;
  anioMin: string;
  anioMax: string;
  color: string;
  tipo: string;
  cilindradaMin: string;
  cilindradaMax: string;
  estadoPatentamiento: string;
  estadoSeguro: string;
  seguroPorVencer: boolean;
};

type FilterOptions = {
  marcas: string[];
  modelos: string[];
  colores: string[];
  tipos: string[];
  anioMin: number;
  anioMax: number;
};

type MotosFiltersProps = {
  filters: MotosFilters;
  onFiltersChange: (filters: MotosFilters) => void;
  onClearFilters: () => void;
};

const estados = [
  { value: "DISPONIBLE", label: "Disponible" },
  { value: "ALQUILADA", label: "Alquilada" },
  { value: "MANTENIMIENTO", label: "Mantenimiento" },
  { value: "BAJA", label: "Baja" },
];

export function MotosFiltersComponent({
  filters,
  onFiltersChange,
  onClearFilters,
}: MotosFiltersProps) {
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    marcas: [],
    modelos: [],
    colores: [],
    tipos: [],
    anioMin: 2020,
    anioMax: new Date().getFullYear(),
  });
  const [isLoading, setIsLoading] = useState(true);

  // Fetch filter options
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const res = await fetch("/api/motos/filters");
        if (!res.ok) throw new Error("Error fetching filters");
        const data = await res.json();
        setFilterOptions(data);
      } catch (error) {
        console.error("Error loading filter options:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchFilterOptions();
  }, []);

  // Update modelos when marca changes
  useEffect(() => {
    const fetchModelos = async () => {
      if (!filters.marca) {
        setFilterOptions((prev) => ({ ...prev, modelos: [] }));
        return;
      }
      try {
        const res = await fetch(
          `/api/motos/filters?marca=${encodeURIComponent(filters.marca)}`
        );
        if (!res.ok) throw new Error("Error fetching modelos");
        const data = await res.json();
        setFilterOptions((prev) => ({ ...prev, modelos: data.modelos }));
      } catch (error) {
        console.error("Error loading modelos:", error);
      }
    };
    fetchModelos();
  }, [filters.marca]);

  const handleEstadoToggle = (estado: string) => {
    const newEstados = filters.estado.includes(estado)
      ? filters.estado.filter((e) => e !== estado)
      : [...filters.estado, estado];
    onFiltersChange({ ...filters, estado: newEstados });
  };

  const activeFiltersCount =
    filters.estado.length +
    (filters.marca ? 1 : 0) +
    (filters.modelo ? 1 : 0) +
    (filters.anioMin ? 1 : 0) +
    (filters.anioMax ? 1 : 0) +
    (filters.color ? 1 : 0) +
    (filters.tipo ? 1 : 0) +
    (filters.cilindradaMin ? 1 : 0) +
    (filters.cilindradaMax ? 1 : 0) +
    (filters.estadoPatentamiento ? 1 : 0) +
    (filters.estadoSeguro ? 1 : 0) +
    (filters.seguroPorVencer ? 1 : 0);

  return (
    <div className="space-y-3">
      {/* Filter Trigger */}
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              Filtros
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeFiltersCount}
                </Badge>
              )}
              <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[600px] p-4" align="start">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Filtros</h4>
                {activeFiltersCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClearFilters}
                    className="h-7 text-xs"
                  >
                    Limpiar todo
                  </Button>
                )}
              </div>

              <Separator />

              {/* Estado - Multi-select */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Estado</Label>
                <div className="grid grid-cols-2 gap-2">
                  {estados.map((estado) => (
                    <div key={estado.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`estado-${estado.value}`}
                        checked={filters.estado.includes(estado.value)}
                        onCheckedChange={() => handleEstadoToggle(estado.value)}
                      />
                      <Label
                        htmlFor={`estado-${estado.value}`}
                        className="cursor-pointer font-normal"
                      >
                        {estado.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Marca y Modelo */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Marca</Label>
                  <Select
                    value={filters.marca || "__all__"}
                    onValueChange={(value) =>
                      onFiltersChange({
                        ...filters,
                        marca: value === "__all__" ? "" : value,
                        modelo: ""
                      })
                    }
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todas</SelectItem>
                      {filterOptions.marcas?.map((marca) => (
                        <SelectItem key={marca} value={marca}>
                          {marca}
                        </SelectItem>
                      )) || []}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Modelo</Label>
                  <Select
                    value={filters.modelo || "__all__"}
                    onValueChange={(value) =>
                      onFiltersChange({
                        ...filters,
                        modelo: value === "__all__" ? "" : value
                      })
                    }
                    disabled={!filters.marca || isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todos</SelectItem>
                      {filterOptions.modelos?.map((modelo) => (
                        <SelectItem key={modelo} value={modelo}>
                          {modelo}
                        </SelectItem>
                      )) || []}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Tipo y Color */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Tipo</Label>
                  <Select
                    value={filters.tipo || "__all__"}
                    onValueChange={(value) =>
                      onFiltersChange({
                        ...filters,
                        tipo: value === "__all__" ? "" : value
                      })
                    }
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todos</SelectItem>
                      {filterOptions.tipos?.map((tipo) => (
                        <SelectItem key={tipo} value={tipo}>
                          {tipo}
                        </SelectItem>
                      )) || []}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Color</Label>
                  <Select
                    value={filters.color || "__all__"}
                    onValueChange={(value) =>
                      onFiltersChange({
                        ...filters,
                        color: value === "__all__" ? "" : value
                      })
                    }
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todos</SelectItem>
                      {filterOptions.colores?.map((color) => (
                        <SelectItem key={color} value={color}>
                          {color}
                        </SelectItem>
                      )) || []}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Año Range */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Año</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Input
                      type="number"
                      placeholder="Desde"
                      value={filters.anioMin}
                      onChange={(e) =>
                        onFiltersChange({ ...filters, anioMin: e.target.value })
                      }
                      min={filterOptions.anioMin}
                      max={filterOptions.anioMax}
                    />
                  </div>
                  <div>
                    <Input
                      type="number"
                      placeholder="Hasta"
                      value={filters.anioMax}
                      onChange={(e) =>
                        onFiltersChange({ ...filters, anioMax: e.target.value })
                      }
                      min={filterOptions.anioMin}
                      max={filterOptions.anioMax}
                    />
                  </div>
                </div>
              </div>

              {/* Cilindrada Range */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Cilindrada (cc)</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Input
                      type="number"
                      placeholder="Desde"
                      value={filters.cilindradaMin}
                      onChange={(e) =>
                        onFiltersChange({
                          ...filters,
                          cilindradaMin: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Input
                      type="number"
                      placeholder="Hasta"
                      value={filters.cilindradaMax}
                      onChange={(e) =>
                        onFiltersChange({
                          ...filters,
                          cilindradaMax: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Documentación */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Estado Patentamiento</Label>
                  <Select
                    value={filters.estadoPatentamiento || "__all__"}
                    onValueChange={(value) =>
                      onFiltersChange({
                        ...filters,
                        estadoPatentamiento: value === "__all__" ? "" : value
                      })
                    }
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todos</SelectItem>
                      <SelectItem value="SIN_PATENTAR">Sin Patentar</SelectItem>
                      <SelectItem value="EN_TRAMITE">En Trámite</SelectItem>
                      <SelectItem value="PATENTADA">Patentada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Estado Seguro</Label>
                  <Select
                    value={filters.estadoSeguro || "__all__"}
                    onValueChange={(value) =>
                      onFiltersChange({
                        ...filters,
                        estadoSeguro: value === "__all__" ? "" : value
                      })
                    }
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todos</SelectItem>
                      <SelectItem value="SIN_SEGURO">Sin Seguro</SelectItem>
                      <SelectItem value="EN_TRAMITE">En Trámite</SelectItem>
                      <SelectItem value="ASEGURADA">Asegurada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Checkbox Seguro por Vencer */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="seguro-vencer"
                  checked={filters.seguroPorVencer}
                  onCheckedChange={(checked) =>
                    onFiltersChange({ ...filters, seguroPorVencer: !!checked })
                  }
                />
                <Label
                  htmlFor="seguro-vencer"
                  className="cursor-pointer font-normal text-sm"
                >
                  Seguro vence en 30 días
                </Label>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-8"
          >
            Limpiar filtros
          </Button>
        )}
      </div>

      {/* Active Filter Badges */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Filtros activos:</span>
          {filters.estado.map((estado) => (
            <Badge key={estado} variant="secondary" className="gap-1">
              Estado: {estados.find((e) => e.value === estado)?.label}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleEstadoToggle(estado)}
              />
            </Badge>
          ))}
          {filters.marca && (
            <Badge variant="secondary" className="gap-1">
              Marca: {filters.marca}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() =>
                  onFiltersChange({ ...filters, marca: "", modelo: "" })
                }
              />
            </Badge>
          )}
          {filters.modelo && (
            <Badge variant="secondary" className="gap-1">
              Modelo: {filters.modelo}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onFiltersChange({ ...filters, modelo: "" })}
              />
            </Badge>
          )}
          {filters.tipo && (
            <Badge variant="secondary" className="gap-1">
              Tipo: {filters.tipo}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onFiltersChange({ ...filters, tipo: "" })}
              />
            </Badge>
          )}
          {filters.color && (
            <Badge variant="secondary" className="gap-1">
              Color: {filters.color}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onFiltersChange({ ...filters, color: "" })}
              />
            </Badge>
          )}
          {filters.anioMin && (
            <Badge variant="secondary" className="gap-1">
              Año desde: {filters.anioMin}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onFiltersChange({ ...filters, anioMin: "" })}
              />
            </Badge>
          )}
          {filters.anioMax && (
            <Badge variant="secondary" className="gap-1">
              Año hasta: {filters.anioMax}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onFiltersChange({ ...filters, anioMax: "" })}
              />
            </Badge>
          )}
          {filters.cilindradaMin && (
            <Badge variant="secondary" className="gap-1">
              Cilindrada desde: {filters.cilindradaMin} cc
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() =>
                  onFiltersChange({ ...filters, cilindradaMin: "" })
                }
              />
            </Badge>
          )}
          {filters.cilindradaMax && (
            <Badge variant="secondary" className="gap-1">
              Cilindrada hasta: {filters.cilindradaMax} cc
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() =>
                  onFiltersChange({ ...filters, cilindradaMax: "" })
                }
              />
            </Badge>
          )}
          {filters.estadoPatentamiento && (
            <Badge variant="secondary" className="gap-1">
              Patentamiento: {
                filters.estadoPatentamiento === "SIN_PATENTAR" ? "Sin Patentar" :
                filters.estadoPatentamiento === "EN_TRAMITE" ? "En Trámite" : "Patentada"
              }
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onFiltersChange({ ...filters, estadoPatentamiento: "" })}
              />
            </Badge>
          )}
          {filters.estadoSeguro && (
            <Badge variant="secondary" className="gap-1">
              Seguro: {
                filters.estadoSeguro === "SIN_SEGURO" ? "Sin Seguro" :
                filters.estadoSeguro === "EN_TRAMITE" ? "En Trámite" : "Asegurada"
              }
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onFiltersChange({ ...filters, estadoSeguro: "" })}
              />
            </Badge>
          )}
          {filters.seguroPorVencer && (
            <Badge variant="secondary" className="gap-1">
              ⚠️ Seguro por vencer (30 días)
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onFiltersChange({ ...filters, seguroPorVencer: false })}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
