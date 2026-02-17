import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { OPERATIONS } from "@/lib/events";

export async function GET(req: NextRequest) {
  const { error } = await requirePermission(OPERATIONS.pricing.parts.batch.view, "view", ["OPERADOR"]);
  if (error) return error;

  try {
    const lotes = await prisma.loteCambioPrecio.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json(lotes);
  } catch (err: unknown) {
    console.error("Error fetching lotes:", err);
    return NextResponse.json({ error: "Error al cargar lotes" }, { status: 500 });
  }
}
