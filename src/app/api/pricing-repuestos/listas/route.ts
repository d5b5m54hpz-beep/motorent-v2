import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const listas = await prisma.listaPrecio.findMany({
      include: {
        _count: {
          select: { items: true, gruposCliente: true },
        },
      },
      orderBy: { prioridad: "desc" },
    });

    return NextResponse.json(listas);
  } catch (err: unknown) {
    console.error("Error fetching listas:", err);
    return NextResponse.json({ error: "Error al cargar listas" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const lista = await prisma.listaPrecio.create({ data: body });
    return NextResponse.json(lista);
  } catch (err: unknown) {
    console.error("Error creating lista:", err);
    return NextResponse.json({ error: "Error al crear lista" }, { status: 500 });
  }
}
