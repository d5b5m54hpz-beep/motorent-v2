import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import { enviarFacturaEmail } from "@/lib/email";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/facturas/[id]/enviar
 * Envía (o reenvía) una factura por email al cliente
 * Solo accesible para ADMIN y OPERADOR
 */
export async function POST(req: NextRequest, context: RouteContext) {
  const { error } = await requireRole(["ADMIN", "OPERADOR"]);
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
