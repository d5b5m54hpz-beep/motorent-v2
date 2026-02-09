import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import * as XLSX from "xlsx";

export async function GET() {
  const { error } = await requireRole(["ADMIN", "OPERADOR"]);
  if (error) return error;

  try {
    const pagos = await prisma.pago.findMany({
      include: {
        contrato: {
          include: {
            cliente: {
              select: {
                nombre: true,
                email: true,
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
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Transform data for Excel
    const data = pagos.map((pago) => ({
      ID: pago.id,
      Cliente: pago.contrato.cliente.nombre,
      "Cliente Email": pago.contrato.cliente.email,
      Moto: `${pago.contrato.moto.marca} ${pago.contrato.moto.modelo}`,
      Patente: pago.contrato.moto.patente,
      Monto: pago.monto,
      Método: pago.metodo,
      Estado: pago.estado,
      Referencia: pago.referencia || "",
      "MP Payment ID": pago.mpPaymentId || "",
      Comprobante: pago.comprobante || "",
      "Fecha Vencimiento": pago.vencimientoAt
        ? pago.vencimientoAt.toISOString().split("T")[0]
        : "",
      "Fecha Pago": pago.pagadoAt
        ? pago.pagadoAt.toISOString().split("T")[0]
        : "",
      Notas: pago.notas || "",
      "Fecha Creación": pago.createdAt.toISOString().split("T")[0],
    }));

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Pagos");

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    // Return file
    const today = new Date().toISOString().split("T")[0];
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="pagos_${today}.xlsx"`,
      },
    });
  } catch (error: unknown) {
    console.error("Error exporting pagos:", error);
    return NextResponse.json(
      { error: "Error al exportar pagos" },
      { status: 500 }
    );
  }
}
