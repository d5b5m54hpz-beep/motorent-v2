"use client";

import { Download, FileSpreadsheet, FileText, FileImage } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Moto } from "../types";

type ExportAdvancedDropdownProps = {
  allMotos: Moto[];
  filteredMotos: Moto[];
  selectedMotos: Moto[];
  hasFilters: boolean;
  hasSelection: boolean;
};

export function ExportAdvancedDropdown({
  allMotos,
  filteredMotos,
  selectedMotos,
  hasFilters,
  hasSelection,
}: ExportAdvancedDropdownProps) {
  const exportToExcel = (motos: Moto[], filename: string) => {
    // Preparar datos para CSV (compatible con Excel)
    const headers = [
      "Marca",
      "Modelo",
      "Año",
      "Patente",
      "Cilindrada",
      "Tipo",
      "Color",
      "Estado",
      "Kilometraje",
      "Precio Mensual",
    ];

    const rows = motos.map((moto) => [
      moto.marca,
      moto.modelo,
      moto.anio,
      moto.patente,
      moto.cilindrada || "",
      moto.tipo || "",
      moto.color || "",
      moto.estado,
      moto.kilometraje || 0,
      moto.precioMensual || 0,
    ]);

    // Crear CSV
    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${cell}"`).join(",")
      ),
    ].join("\n");

    // Descargar
    const blob = new Blob(["\ufeff" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
  };

  const exportToCSV = (motos: Moto[], filename: string) => {
    exportToExcel(motos, filename);
  };

  const exportToPDF = (_motos: Moto[], _filename: string) => {
    // Placeholder - implementar con jsPDF o similar
    alert("Exportación a PDF - próximamente");
  };

  const getExportFilename = (type: "all" | "filtered" | "selected") => {
    const date = new Date().toISOString().split("T")[0];
    return `motos_${type}_${date}`;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Exportar motos</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Export seleccionadas (si hay selección) */}
        {hasSelection && (
          <>
            <DropdownMenuItem
              onClick={() =>
                exportToExcel(
                  selectedMotos,
                  getExportFilename("selected")
                )
              }
            >
              <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />
              <div className="flex flex-col">
                <span>Excel - Seleccionadas</span>
                <span className="text-xs text-muted-foreground">
                  {selectedMotos.length} moto{selectedMotos.length !== 1 ? "s" : ""}
                </span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                exportToCSV(selectedMotos, getExportFilename("selected"))
              }
            >
              <FileText className="mr-2 h-4 w-4" />
              CSV - Seleccionadas
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                exportToPDF(selectedMotos, getExportFilename("selected"))
              }
            >
              <FileImage className="mr-2 h-4 w-4" />
              PDF - Seleccionadas
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Export filtradas (si hay filtros activos y no hay selección) */}
        {hasFilters && !hasSelection && (
          <>
            <DropdownMenuItem
              onClick={() =>
                exportToExcel(
                  filteredMotos,
                  getExportFilename("filtered")
                )
              }
            >
              <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />
              <div className="flex flex-col">
                <span>Excel - Filtradas</span>
                <span className="text-xs text-muted-foreground">
                  {filteredMotos.length} moto{filteredMotos.length !== 1 ? "s" : ""}
                </span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                exportToCSV(filteredMotos, getExportFilename("filtered"))
              }
            >
              <FileText className="mr-2 h-4 w-4" />
              CSV - Filtradas
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                exportToPDF(filteredMotos, getExportFilename("filtered"))
              }
            >
              <FileImage className="mr-2 h-4 w-4" />
              PDF - Filtradas
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Export todas */}
        <DropdownMenuItem
          onClick={() => exportToExcel(allMotos, getExportFilename("all"))}
        >
          <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />
          <div className="flex flex-col">
            <span>Excel - Todas</span>
            <span className="text-xs text-muted-foreground">
              {allMotos.length} moto{allMotos.length !== 1 ? "s" : ""}
            </span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => exportToCSV(allMotos, getExportFilename("all"))}
        >
          <FileText className="mr-2 h-4 w-4" />
          CSV - Todas
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => exportToPDF(allMotos, getExportFilename("all"))}
        >
          <FileImage className="mr-2 h-4 w-4" />
          PDF - Todas
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
