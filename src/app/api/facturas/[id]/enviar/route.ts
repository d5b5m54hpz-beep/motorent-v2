import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";
import { enviarFacturaEmail } from "@/lib/email";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/facturas/[id]/enviar
 * Envía (o reenvía) una factura por email al cliente
 */
export async function POST(req: NextRequest, context: RouteContext) {
  const { error, userId } = await requirePermission(
    OPERATIONS.invoice.sale.send,
    "execute",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const { id } = await context.params;

  try {
    const result = await enviarFacturaEmail(id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Error al enviar email" },
        { status: 500 }
      );
    }

    // Emit event for invoice sent
    eventBus.emit(
      OPERATIONS.invoice.sale.send,
      "Factura",
      id,
      { success: true },
      userId
    ).catch((err) => {
      console.error("Error emitting invoice.sale.send event:", err);
    });

    return NextResponse.json({
      success: true,
      message: "Factura enviada por email correctamente",
    });
  } catch (error: unknown) {
    console.error("Error in POST /api/facturas/[id]/enviar:", error);
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
