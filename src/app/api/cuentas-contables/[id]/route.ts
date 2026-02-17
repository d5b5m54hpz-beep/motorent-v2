import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";
import { cuentaContableSchema } from "@/lib/validations";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _req: NextRequest,
  context: RouteContext
) {
  const { error } = await requirePermission(OPERATIONS.accounting.account.view, "view", ["CONTADOR", "OPERADOR"]);
  if (error) return error;

  const { id } = await context.params;

  try {
    const cuenta = await prisma.cuentaContable.findUnique({
      where: { id },
    });

    if (!cuenta) {
      return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
    }

    return NextResponse.json(cuenta);
  } catch (err: unknown) {
    console.error("Error fetching cuenta contable:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  context: RouteContext
) {
  const { error, userId } = await requirePermission(OPERATIONS.accounting.account.update, "execute", ["CONTADOR"]);
  if (error) return error;

  const { id } = await context.params;

  try {
    const body = await req.json();
    const parsed = cuentaContableSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { codigo, nombre, tipo, padre, nivel, imputable, activa, descripcion } = parsed.data;

    // Check if cuenta exists
    const existing = await prisma.cuentaContable.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
    }

    // If changing codigo, check it's not taken
    if (codigo !== existing.codigo) {
      const codigoTaken = await prisma.cuentaContable.findUnique({ where: { codigo } });
      if (codigoTaken) {
        return NextResponse.json({ error: "El código ya existe" }, { status: 400 });
      }
    }

    // If has padre, verify it exists
    if (padre) {
      const padreCuenta = await prisma.cuentaContable.findUnique({ where: { codigo: padre } });
      if (!padreCuenta) {
        return NextResponse.json({ error: "La cuenta padre no existe" }, { status: 400 });
      }
    }

    const cuenta = await prisma.cuentaContable.update({
      where: { id },
      data: {
        codigo,
        nombre,
        tipo,
        padre,
        nivel,
        imputable,
        activa,
        descripcion,
      },
    });

    eventBus.emit(OPERATIONS.accounting.account.update, "CuentaContable", id, { codigo, nombre }, userId).catch(err => console.error("[Events] accounting.account.update error:", err));

    return NextResponse.json(cuenta);
  } catch (err: unknown) {
    console.error("Error updating cuenta contable:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  context: RouteContext
) {
  const { error: deleteError, userId: deleteUserId } = await requirePermission(OPERATIONS.accounting.account.update, "execute", ["CONTADOR"]);
  if (deleteError) return deleteError;

  const { id } = await context.params;

  try {
    // Check if cuenta exists
    const cuenta = await prisma.cuentaContable.findUnique({
      where: { id },
      include: {
        lineas: true,
      },
    });

    if (!cuenta) {
      return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
    }

    // Check if has related lineas
    if (cuenta.lineas.length > 0) {
      return NextResponse.json(
        { error: "No se puede eliminar: tiene líneas de asiento asociadas" },
        { status: 400 }
      );
    }

    await prisma.cuentaContable.delete({ where: { id } });

    eventBus.emit(OPERATIONS.accounting.account.update, "CuentaContable", id, { action: "delete" }, deleteUserId).catch(err => console.error("[Events] accounting.account.update error:", err));

    return NextResponse.json({ message: "Cuenta eliminada correctamente" });
  } catch (err: unknown) {
    console.error("Error deleting cuenta contable:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
