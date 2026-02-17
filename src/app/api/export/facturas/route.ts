import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { OPERATIONS } from "@/lib/events";
import * as XLSX from "xlsx";

export async function GET() {
  const { error } = await requirePermission(OPERATIONS.system.export.execute, "view", ["OPERADOR", "CONTADOR"]);
  if (error) return error;

  try {
    const facturas = await prisma.factura.findMany({
      include: {
        pago: {
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
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Transform data for Excel
    const data = facturas.map((factura) => ({
      ID: factura.id,
      Número: factura.numero,
      Tipo: factura.tipo,
      "Punto Venta": factura.puntoVenta,
      Cliente: factura.pago.contrato.cliente.nombre,
      "Cliente Email": factura.pago.contrato.cliente.email,
      Moto: `${factura.pago.contrato.moto.marca} ${factura.pago.contrato.moto.modelo}`,
      "Monto Neto": factura.montoNeto,
      "Monto IVA": factura.montoIva,
      "Monto Total": factura.montoTotal,
      CAE: factura.cae || "",
      "CAE Vencimiento": factura.caeVencimiento || "",
      "Razón Social": factura.razonSocial || "",
      CUIT: factura.cuit || "",
      Emitida: factura.emitida ? "Sí" : "No",
      "Fecha Creación": factura.createdAt.toISOString().split("T")[0],
    }));

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Facturas");

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    // Return file
    const today = new Date().toISOString().split("T")[0];
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="facturas_${today}.xlsx"`,
      },
    });
  } catch (error: unknown) {
    console.error("Error exporting facturas:", error);
    return NextResponse.json(
      { error: "Error al exportar facturas" },
      { status: 500 }
    );
  }
}
