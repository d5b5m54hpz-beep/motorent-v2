import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/require-permission";
import { OPERATIONS } from "@/lib/events";
import * as XLSX from "xlsx";

export async function GET() {
  const { error } = await requirePermission(OPERATIONS.system.import.execute, "view", ["OPERADOR"]);
  if (error) return error;

  try {
    // Template data with headers and one example row
    const data = [
      {
        Marca: "Honda",
        Modelo: "CB125F",
        Patente: "AA123BB",
        Año: 2023,
        Color: "Negro",
        Kilometraje: 12000,
        "Precio Mensual": 180000,
        Cilindrada: 125,
        Tipo: "naked",
        Estado: "disponible",
        Descripción: "Moto de ejemplo - eliminar esta fila antes de importar",
      },
    ];

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Motos");

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    // Return file
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="plantilla_motos.xlsx"`,
      },
    });
  } catch (error: unknown) {
    console.error("Error generating template:", error);
    return NextResponse.json(
      { error: "Error al generar plantilla" },
      { status: 500 }
    );
  }
}
