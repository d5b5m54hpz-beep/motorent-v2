import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { OPERATIONS } from "@/lib/events";
import * as XLSX from "xlsx";

export async function GET() {
  const { error } = await requirePermission(OPERATIONS.system.export.execute, "view", ["OPERADOR", "CONTADOR"]);
  if (error) return error;

  try {
    const motos = await prisma.moto.findMany({
      orderBy: { createdAt: "desc" },
    });

    // Transform data for Excel
    const data = motos.map((moto) => ({
      ID: moto.id,
      Marca: moto.marca,
      Modelo: moto.modelo,
      Patente: moto.patente,
      Año: moto.anio,
      Color: moto.color || "",
      Kilometraje: moto.kilometraje,
      "Precio Mensual": moto.precioMensual,
      Cilindrada: moto.cilindrada || "",
      Tipo: moto.tipo || "",
      Estado: moto.estado,
      Descripción: moto.descripcion || "",
      "Fecha Creación": moto.createdAt.toISOString().split("T")[0],
    }));

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Motos");

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    // Return file
    const today = new Date().toISOString().split("T")[0];
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="motos_${today}.xlsx"`,
      },
    });
  } catch (error: unknown) {
    console.error("Error exporting motos:", error);
    return NextResponse.json(
      { error: "Error al exportar motos" },
      { status: 500 }
    );
  }
}
