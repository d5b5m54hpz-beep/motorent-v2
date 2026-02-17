import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { OPERATIONS } from "@/lib/events";
import * as XLSX from "xlsx";

export async function GET() {
  const { error } = await requirePermission(OPERATIONS.system.export.execute, "view", ["OPERADOR", "CONTADOR"]);
  if (error) return error;

  try {
    const clientes = await prisma.cliente.findMany({
      include: {
        user: {
          select: {
            email: true,
            name: true,
            phone: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Transform data for Excel
    const data = clientes.map((cliente) => ({
      ID: cliente.id,
      Nombre: cliente.nombre,
      Email: cliente.email,
      Teléfono: cliente.telefono || "",
      DNI: cliente.dni || "",
      "DNI Verificado": cliente.dniVerificado ? "Sí" : "No",
      Licencia: cliente.licencia || "",
      "Licencia Vencimiento": cliente.licenciaVencimiento
        ? cliente.licenciaVencimiento.toISOString().split("T")[0]
        : "",
      "Licencia Verificada": cliente.licenciaVerificada ? "Sí" : "No",
      Dirección: cliente.direccion || "",
      Ciudad: cliente.ciudad || "",
      Provincia: cliente.provincia || "",
      "Código Postal": cliente.codigoPostal || "",
      "Fecha Nacimiento": cliente.fechaNacimiento
        ? cliente.fechaNacimiento.toISOString().split("T")[0]
        : "",
      Estado: cliente.estado,
      "Usuario Email": cliente.user?.email || "",
      "Usuario Rol": cliente.user?.role || "",
      Notas: cliente.notas || "",
      "Fecha Creación": cliente.createdAt.toISOString().split("T")[0],
    }));

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Clientes");

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    // Return file
    const today = new Date().toISOString().split("T")[0];
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="clientes_${today}.xlsx"`,
      },
    });
  } catch (error: unknown) {
    console.error("Error exporting clientes:", error);
    return NextResponse.json(
      { error: "Error al exportar clientes" },
      { status: 500 }
    );
  }
}
