import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";

export async function GET(req: NextRequest) {
  const { error } = await requirePermission(OPERATIONS.pricing.parts.rule_discount.view, "view", ["OPERADOR"]);
  if (error) return error;

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
  const { error, userId } = await requirePermission(OPERATIONS.pricing.parts.rule_discount.create, "create", ["OPERADOR"]);
  if (error) return error;

  try {
    const body = await req.json();
    const regla = await prisma.reglaDescuento.create({ data: body });

    eventBus.emit(OPERATIONS.pricing.parts.rule_discount.create, "ReglaDescuento", regla.id, { nombre: body.nombre }, userId).catch(err => console.error("Error emitting pricing.parts.rule_discount.create event:", err));

    return NextResponse.json(regla);
  } catch (err: unknown) {
    console.error("Error creating regla descuento:", err);
    return NextResponse.json({ error: "Error al crear regla" }, { status: 500 });
  }
}
