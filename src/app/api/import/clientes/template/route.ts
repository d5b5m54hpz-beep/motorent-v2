import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import * as XLSX from "xlsx";

export async function GET() {
  const { error } = await requireRole(["ADMIN", "OPERADOR"]);
  if (error) return error;

  try {
    // Template data with headers and one example row
    const data = [
      {
        Nombre: "Juan Pérez",
        Email: "juan.perez@ejemplo.com",
        Teléfono: "+54 11 4567-8901",
        DNI: "35123456",
        Licencia: "B-123456",
        "Licencia Vencimiento": "2026-12-31",
        Dirección: "Av. Corrientes 1234",
        Ciudad: "Buenos Aires",
        Provincia: "CABA",
        "Código Postal": "C1043",
        "Fecha Nacimiento": "1990-05-15",
        Notas: "Cliente de ejemplo - eliminar esta fila antes de importar",
      },
    ];

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Clientes");

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    // Return file
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="plantilla_clientes.xlsx"`,
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
