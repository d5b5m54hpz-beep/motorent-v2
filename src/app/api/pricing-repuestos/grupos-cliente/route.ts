import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";

export async function GET(req: NextRequest) {
  const { error } = await requirePermission(OPERATIONS.pricing.parts.customer_group.view, "view", ["OPERADOR"]);
  if (error) return error;

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
  const { error, userId } = await requirePermission(OPERATIONS.pricing.parts.customer_group.create, "create", ["OPERADOR"]);
  if (error) return error;

  try {
    const body = await req.json();
    const grupo = await prisma.grupoCliente.create({ data: body });

    eventBus.emit(OPERATIONS.pricing.parts.customer_group.create, "GrupoCliente", grupo.id, { nombre: body.nombre }, userId).catch(err => console.error("Error emitting pricing.parts.customer_group.create event:", err));

    return NextResponse.json(grupo);
  } catch (err: unknown) {
    console.error("Error creating grupo:", err);
    return NextResponse.json({ error: "Error al crear grupo" }, { status: 500 });
  }
}
