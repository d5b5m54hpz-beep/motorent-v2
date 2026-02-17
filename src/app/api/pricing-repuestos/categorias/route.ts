import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { OPERATIONS } from "@/lib/events";

export async function GET() {
  const { error } = await requirePermission(OPERATIONS.pricing.parts.category.view, "view", ["OPERADOR"]);
  if (error) return error;

  try {
    const categorias = await prisma.categoriaRepuestoConfig.findMany({
      orderBy: { categoria: "asc" },
    });

    return NextResponse.json(categorias);
  } catch (err: unknown) {
    console.error("Error fetching categorias:", err);
    return NextResponse.json(
      { error: "Error al cargar categorías" },
      { status: 500 }
    );
  }
}
