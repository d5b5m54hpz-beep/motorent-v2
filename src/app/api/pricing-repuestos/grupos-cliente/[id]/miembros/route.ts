import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requirePermission(OPERATIONS.pricing.parts.customer_group.view, "view", ["OPERADOR"]);
  if (error) return error;

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
  const { error, userId } = await requirePermission(OPERATIONS.pricing.parts.customer_group.create, "execute", ["OPERADOR"]);
  if (error) return error;

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

    eventBus.emit(OPERATIONS.pricing.parts.customer_group.create, "MiembroGrupoCliente", miembro.id, { grupoId: id, clienteId }, userId).catch(err => console.error("Error emitting pricing.parts.customer_group.create event:", err));

    return NextResponse.json(miembro);
  } catch (err: unknown) {
    console.error("Error creating miembro:", err);
    return NextResponse.json({ error: "Error al agregar miembro" }, { status: 500 });
  }
}
