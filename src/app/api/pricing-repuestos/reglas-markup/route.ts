import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";

export async function GET(req: NextRequest) {
  const { error } = await requirePermission(OPERATIONS.pricing.parts.rule_markup.view, "view", ["OPERADOR"]);
  if (error) return error;

  try {
    const reglas = await prisma.reglaMarkup.findMany({
      orderBy: [{ prioridad: "desc" }, { createdAt: "desc" }],
    });
    return NextResponse.json(reglas);
  } catch (err: unknown) {
    console.error("Error fetching reglas markup:", err);
    return NextResponse.json({ error: "Error al cargar reglas" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { error, userId } = await requirePermission(OPERATIONS.pricing.parts.rule_markup.create, "create", ["OPERADOR"]);
  if (error) return error;

  try {
    const body = await req.json();
    const regla = await prisma.reglaMarkup.create({ data: body });

    eventBus.emit(OPERATIONS.pricing.parts.rule_markup.create, "ReglaMarkup", regla.id, { nombre: body.nombre }, userId).catch(err => console.error("Error emitting pricing.parts.rule_markup.create event:", err));

    return NextResponse.json(regla);
  } catch (err: unknown) {
    console.error("Error creating regla markup:", err);
    return NextResponse.json({ error: "Error al crear regla" }, { status: 500 });
  }
}
