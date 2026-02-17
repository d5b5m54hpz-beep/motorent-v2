import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";

export async function GET(req: NextRequest) {
  const { error } = await requirePermission(OPERATIONS.pricing.parts.list.view, "view", ["OPERADOR"]);
  if (error) return error;

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
  const { error, userId } = await requirePermission(OPERATIONS.pricing.parts.list.create, "create", ["OPERADOR"]);
  if (error) return error;

  try {
    const body = await req.json();
    const lista = await prisma.listaPrecio.create({ data: body });

    eventBus.emit(OPERATIONS.pricing.parts.list.create, "ListaPrecio", lista.id, { nombre: body.nombre, codigo: body.codigo }, userId).catch(err => console.error("Error emitting pricing.parts.list.create event:", err));

    return NextResponse.json(lista);
  } catch (err: unknown) {
    console.error("Error creating lista:", err);
    return NextResponse.json({ error: "Error al crear lista" }, { status: 500 });
  }
}
