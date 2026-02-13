import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

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
