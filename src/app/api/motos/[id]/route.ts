import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { withEvent, OPERATIONS } from "@/lib/events";
import { motoSchema } from "@/lib/validations";

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/motos/[id] — get single moto
export async function GET(req: NextRequest, context: RouteContext) {
  const { error } = await requirePermission(
    OPERATIONS.fleet.moto.view,
    "view",
    ["OPERADOR"]
  );
  if (error) return error;

  const { id } = await context.params;

  const moto = await prisma.moto.findUnique({
    where: { id },
    include: { contratos: { take: 5, orderBy: { createdAt: "desc" } } },
  });

  if (!moto) {
    return NextResponse.json({ error: "Moto no encontrada" }, { status: 404 });
  }

  return NextResponse.json(moto);
}

// PUT /api/motos/[id] — update moto
export async function PUT(req: NextRequest, context: RouteContext) {
  const { error, userId } = await requirePermission(
    OPERATIONS.fleet.moto.update,
    "execute",
    ["OPERADOR"]
  );
  if (error) return error;

  const { id } = await context.params;

  try {
    const body = await req.json();
    const parsed = motoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos invalidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const existing = await prisma.moto.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Moto no encontrada" }, { status: 404 });
    }

    if (parsed.data.patente !== existing.patente) {
      const duplicate = await prisma.moto.findUnique({
        where: { patente: parsed.data.patente },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: "Ya existe otra moto con esa patente" },
          { status: 409 }
        );
      }
    }

    const moto = await withEvent(
      {
        operationId: OPERATIONS.fleet.moto.update,
        entityType: "Moto",
        getEntityId: (m) => m.id,
        getPayload: (m) => ({
          marca: m.marca,
          modelo: m.modelo,
          patente: m.patente,
          estado: m.estado,
        }),
        userId,
      },
      () => prisma.moto.update({ where: { id }, data: parsed.data })
    );

    return NextResponse.json(moto);
  } catch (error: unknown) {
    console.error("Error updating moto:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// DELETE /api/motos/[id] — delete moto (ADMIN only)
export async function DELETE(req: NextRequest, context: RouteContext) {
  const { error, userId } = await requirePermission(
    OPERATIONS.fleet.moto.decommission,
    "execute"
  );
  if (error) return error;

  const { id } = await context.params;

  try {
    // Verificar si tiene contratos asociados
    const contratosCount = await prisma.contrato.count({
      where: { motoId: id },
    });

    if (contratosCount > 0) {
      return NextResponse.json(
        { error: "No se puede eliminar una moto con contratos asociados. Cambia su estado a 'baja' en su lugar." },
        { status: 400 }
      );
    }

    // Verificar si tiene órdenes de trabajo y eliminarlas primero
    const ordenesCount = await prisma.ordenTrabajo.count({
      where: { motoId: id },
    }).catch(() => 0); // Si la tabla no existe, ignorar

    if (ordenesCount > 0) {
      // Eliminar órdenes de trabajo primero
      await prisma.ordenTrabajo.deleteMany({ where: { motoId: id } });
    }

    await withEvent(
      {
        operationId: OPERATIONS.fleet.moto.decommission,
        entityType: "Moto",
        getEntityId: () => id,
        getPayload: () => ({ action: "delete" }),
        userId,
      },
      () => prisma.moto.delete({ where: { id } })
    );

    return NextResponse.json({ success: true, message: "Moto eliminada" });
  } catch (error: unknown) {
    console.error("Error deleting moto:", error);
    return NextResponse.json(
      { error: "Error interno del servidor", details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
