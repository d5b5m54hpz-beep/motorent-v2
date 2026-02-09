import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { clienteSchema } from "@/lib/validations";

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/clientes/[id] — get single cliente with user and contratos
export async function GET(req: NextRequest, context: RouteContext) {
  const { error } = await requireRole(["ADMIN", "OPERADOR"]);
  if (error) return error;

  const { id } = await context.params;

  const cliente = await prisma.cliente.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true, phone: true, image: true, role: true, createdAt: true } },
      contratos: {
        take: 10,
        orderBy: { createdAt: "desc" },
        include: { moto: { select: { marca: true, modelo: true, patente: true } } },
      },
      _count: { select: { contratos: true } },
    },
  });

  if (!cliente) {
    return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
  }

  return NextResponse.json(cliente);
}

// PUT /api/clientes/[id] — update cliente + user in transaction
export async function PUT(req: NextRequest, context: RouteContext) {
  const { error } = await requireRole(["ADMIN", "OPERADOR"]);
  if (error) return error;

  const { id } = await context.params;

  try {
    const body = await req.json();
    const parsed = clienteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos invalidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const existing = await prisma.cliente.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }

    const { nombre, email, telefono, fechaNacimiento, licenciaVencimiento, ...clienteData } = parsed.data;

    // Check email uniqueness (exclude current)
    if (email !== existing.email) {
      const duplicate = await prisma.user.findUnique({ where: { email } });
      if (duplicate) {
        return NextResponse.json(
          { error: "Ya existe otro usuario con ese email" },
          { status: 409 }
        );
      }
    }

    const cliente = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: existing.userId },
        data: { name: nombre, email, phone: telefono },
      });

      return tx.cliente.update({
        where: { id },
        data: {
          nombre,
          email,
          telefono,
          fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : null,
          licenciaVencimiento: licenciaVencimiento ? new Date(licenciaVencimiento) : null,
          ...clienteData,
        },
        include: {
          user: { select: { name: true, email: true, phone: true, image: true } },
          _count: { select: { contratos: true } },
        },
      });
    });

    return NextResponse.json(cliente);
  } catch (error: unknown) {
    console.error("Error updating cliente:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// DELETE /api/clientes/[id] — delete cliente + user (ADMIN only)
export async function DELETE(req: NextRequest, context: RouteContext) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  const { id } = await context.params;

  try {
    const cliente = await prisma.cliente.findUnique({
      where: { id },
      include: {
        contratos: { where: { estado: { in: ["activo", "pendiente"] } } },
      },
    });

    if (!cliente) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }

    if (cliente.contratos.length > 0) {
      return NextResponse.json(
        { error: "No se puede eliminar un cliente con contratos activos o pendientes" },
        { status: 409 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.cliente.delete({ where: { id } });
      await tx.user.delete({ where: { id: cliente.userId } });
    });

    return NextResponse.json({ message: "Cliente eliminado" });
  } catch (error: unknown) {
    console.error("Error deleting cliente:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
