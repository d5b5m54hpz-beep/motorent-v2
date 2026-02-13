import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const miembros = await prisma.miembroGrupoCliente.findMany({
      where: { grupoId: id },
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            email: true,
            telefono: true,
          },
        },
      },
      orderBy: { cliente: { nombre: "asc" } },
    });
    return NextResponse.json(miembros);
  } catch (err: unknown) {
    console.error("Error fetching miembros:", err);
    return NextResponse.json({ error: "Error al cargar miembros" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const { clienteId } = body;

    // Check if already exists
    const existing = await prisma.miembroGrupoCliente.findFirst({
      where: { grupoId: id, clienteId },
    });

    if (existing) {
      return NextResponse.json({ error: "Cliente ya está en este grupo" }, { status: 400 });
    }

    const miembro = await prisma.miembroGrupoCliente.create({
      data: {
        grupoId: id,
        clienteId,
      },
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            email: true,
            telefono: true,
          },
        },
      },
    });

    return NextResponse.json(miembro);
  } catch (err: unknown) {
    console.error("Error creating miembro:", err);
    return NextResponse.json({ error: "Error al agregar miembro" }, { status: 500 });
  }
}
