import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { asientoContableSchema } from "@/lib/validations";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _req: NextRequest,
  context: RouteContext
) {
  const { error } = await requireRole(["ADMIN", "OPERADOR"]);
  if (error) return error;

  const { id } = await context.params;

  try {
    const asiento = await prisma.asientoContable.findUnique({
      where: { id },
      include: {
        lineas: {
          include: {
            cuenta: { select: { id: true, codigo: true, nombre: true } },
          },
          orderBy: { orden: "asc" },
        },
        facturaCompra: {
          select: {
            id: true,
            visibleId: true,
            tipo: true,
            numero: true,
            razonSocial: true,
            total: true,
          },
        },
      },
    });

    if (!asiento) {
      return NextResponse.json({ error: "Asiento no encontrado" }, { status: 404 });
    }

    return NextResponse.json(asiento);
  } catch (err: unknown) {
    console.error("Error fetching asiento contable:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  context: RouteContext
) {
  const { error } = await requireRole(["ADMIN", "OPERADOR"]);
  if (error) return error;

  const { id } = await context.params;

  try {
    // Check if asiento exists and is not cerrado
    const existing = await prisma.asientoContable.findUnique({
      where: { id },
      select: { cerrado: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Asiento no encontrado" }, { status: 404 });
    }

    if (existing.cerrado) {
      return NextResponse.json(
        { error: "No se puede modificar un asiento cerrado" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const parsed = asientoContableSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { fecha, tipo, descripcion, notas, lineas } = parsed.data;

    // Calculate totals
    const totalDebe = lineas.reduce((sum, l) => sum + (l.debe || 0), 0);
    const totalHaber = lineas.reduce((sum, l) => sum + (l.haber || 0), 0);

    // Validate debe = haber
    if (Math.abs(totalDebe - totalHaber) >= 0.01) {
      return NextResponse.json(
        { error: "El total del Debe debe ser igual al total del Haber" },
        { status: 400 }
      );
    }

    // Validate all cuentas exist and are imputable
    for (const linea of lineas) {
      const cuenta = await prisma.cuentaContable.findUnique({
        where: { id: linea.cuentaId },
        select: { imputable: true, activa: true },
      });

      if (!cuenta) {
        return NextResponse.json(
          { error: `La cuenta ${linea.cuentaId} no existe` },
          { status: 400 }
        );
      }

      if (!cuenta.imputable) {
        return NextResponse.json(
          { error: `La cuenta no es imputable` },
          { status: 400 }
        );
      }
    }

    // Update asiento (delete old lineas and create new ones)
    const asiento = await prisma.asientoContable.update({
      where: { id },
      data: {
        fecha: new Date(fecha),
        tipo,
        descripcion,
        totalDebe,
        totalHaber,
        notas,
        lineas: {
          deleteMany: {}, // Delete all existing lineas
          create: lineas.map((l, idx) => ({
            orden: idx + 1,
            cuentaId: l.cuentaId,
            debe: l.debe || 0,
            haber: l.haber || 0,
            descripcion: l.descripcion,
          })),
        },
      },
      include: {
        lineas: {
          include: {
            cuenta: { select: { codigo: true, nombre: true } },
          },
          orderBy: { orden: "asc" },
        },
      },
    });

    return NextResponse.json(asiento);
  } catch (err: unknown) {
    console.error("Error updating asiento contable:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  context: RouteContext
) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  const { id } = await context.params;

  try {
    // Check if asiento exists and is not cerrado
    const asiento = await prisma.asientoContable.findUnique({
      where: { id },
      select: { cerrado: true, facturaCompraId: true },
    });

    if (!asiento) {
      return NextResponse.json({ error: "Asiento no encontrado" }, { status: 404 });
    }

    if (asiento.cerrado) {
      return NextResponse.json(
        { error: "No se puede eliminar un asiento cerrado" },
        { status: 400 }
      );
    }

    if (asiento.facturaCompraId) {
      return NextResponse.json(
        { error: "No se puede eliminar: tiene factura de compra asociada" },
        { status: 400 }
      );
    }

    // Delete asiento (lineas will be deleted by cascade)
    await prisma.asientoContable.delete({ where: { id } });

    return NextResponse.json({ message: "Asiento eliminado correctamente" });
  } catch (err: unknown) {
    console.error("Error deleting asiento contable:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
