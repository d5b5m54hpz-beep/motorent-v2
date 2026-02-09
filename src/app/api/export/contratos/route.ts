import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import * as XLSX from "xlsx";

export async function GET() {
  const { error } = await requireRole(["ADMIN", "OPERADOR"]);
  if (error) return error;

  try {
    const contratos = await prisma.contrato.findMany({
      include: {
        cliente: {
          select: {
            nombre: true,
            email: true,
            dni: true,
          },
        },
        moto: {
          select: {
            marca: true,
            modelo: true,
            patente: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Transform data for Excel
    const data = contratos.map((contrato) => ({
      ID: contrato.id,
      Cliente: contrato.cliente.nombre,
      "Cliente Email": contrato.cliente.email,
      "Cliente DNI": contrato.cliente.dni || "",
      Moto: `${contrato.moto.marca} ${contrato.moto.modelo}`,
      Patente: contrato.moto.patente,
      "Fecha Inicio": contrato.fechaInicio.toISOString().split("T")[0],
      "Fecha Fin": contrato.fechaFin.toISOString().split("T")[0],
      "Frecuencia Pago": contrato.frecuenciaPago,
      "Monto Período": contrato.montoPeriodo,
      "Monto Total": contrato.montoTotal,
      Depósito: contrato.deposito,
      "Descuento %": contrato.descuentoAplicado,
      Estado: contrato.estado,
      "Renovación Auto": contrato.renovacionAuto ? "Sí" : "No",
      Notas: contrato.notas || "",
      "Fecha Creación": contrato.createdAt.toISOString().split("T")[0],
    }));

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Contratos");

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    // Return file
    const today = new Date().toISOString().split("T")[0];
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="contratos_${today}.xlsx"`,
      },
    });
  } catch (error: unknown) {
    console.error("Error exporting contratos:", error);
    return NextResponse.json(
      { error: "Error al exportar contratos" },
      { status: 500 }
    );
  }
}
