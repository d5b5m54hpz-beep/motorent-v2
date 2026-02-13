import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const grupos = await prisma.grupoCliente.findMany({
      include: {
        listaPrecio: true,
        _count: { select: { miembros: true } },
      },
      orderBy: { nombre: "asc" },
    });
    return NextResponse.json(grupos);
  } catch (err: unknown) {
    console.error("Error fetching grupos:", err);
    return NextResponse.json({ error: "Error al cargar grupos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const grupo = await prisma.grupoCliente.create({ data: body });
    return NextResponse.json(grupo);
  } catch (err: unknown) {
    console.error("Error creating grupo:", err);
    return NextResponse.json({ error: "Error al crear grupo" }, { status: 500 });
  }
}
