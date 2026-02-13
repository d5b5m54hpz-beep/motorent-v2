import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

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
