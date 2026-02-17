import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/require-permission";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error } = await requirePermission(
      OPERATIONS.invoice.purchase.view,
      "execute",
      ["ADMIN", "OPERADOR", "CONTADOR"]
    );
    if (error) return error;

    const { id } = await params;

    const factura = await prisma.facturaCompra.findUnique({
      where: { id },
    });

    if (!factura) {
      return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 });
    }

    if (!factura.cae) {
      return NextResponse.json({ error: "La factura no tiene CAE registrado" }, { status: 400 });
    }

    // IMPORTANTE: La verificación real con AFIP requiere certificado digital
    // Por ahora, implementamos una verificación básica de formato
    // Para producción, se debería integrar con AFIP Web Services usando @afipsdk/afip.js

    let caeVerificado = false;
    const ahora = new Date();

    try {
      // Validación básica de formato CAE (14 dígitos)
      const caeNumerico = factura.cae.replace(/\D/g, "");
      if (caeNumerico.length !== 14) {
        caeVerificado = false;
      } else {
        // Verificar si el CAE no está vencido
        if (factura.caeVencimiento && factura.caeVencimiento > ahora) {
          caeVerificado = true;
        } else {
          caeVerificado = false;
        }
      }

      // TODO: Integración real con AFIP
      // const afip = new Afip({ CUIT: empresaCuit });
      // const result = await afip.ElectronicBilling.getVoucher(...);
      // caeVerificado = result.CodAutorizacion === factura.cae;

    } catch (error) {
      console.error("Error verificando CAE:", error);
      // Si hay error en la verificación, marcamos como no verificado
      caeVerificado = false;
    }

    // Actualizar factura con resultado de verificación
    const updated = await prisma.facturaCompra.update({
      where: { id },
      data: {
        caeVerificado,
        caeVerificadoFecha: ahora,
      },
    });

    return NextResponse.json({
      data: {
        caeVerificado,
        verificadoFecha: ahora,
        mensaje: caeVerificado
          ? "CAE verificado correctamente"
          : "No se pudo verificar el CAE. Verifique el formato y vencimiento.",
      },
    });
  } catch (error: unknown) {
    console.error("Error verificando CAE:", error);
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Error al verificar CAE" }, { status: 500 });
  }
}
