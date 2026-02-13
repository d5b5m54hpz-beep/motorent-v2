import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const reglas = await prisma.reglaDescuento.findMany({
      include: { listaPrecio: true },
      orderBy: [{ prioridad: "desc" }, { createdAt: "desc" }],
    });
    return NextResponse.json(reglas);
  } catch (err: unknown) {
    console.error("Error fetching reglas descuento:", err);
    return NextResponse.json({ error: "Error al cargar reglas" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const regla = await prisma.reglaDescuento.create({ data: body });
    return NextResponse.json(regla);
  } catch (err: unknown) {
    console.error("Error creating regla descuento:", err);
    return NextResponse.json({ error: "Error al crear regla" }, { status: 500 });
  }
}
