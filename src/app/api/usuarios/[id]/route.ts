import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { updateUsuarioSchema } from "@/lib/validations";
import bcrypt from "bcryptjs";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/usuarios/[id]
 * Obtener detalle de un usuario
 */
export async function GET(req: NextRequest, context: RouteContext) {
  const { error } = await requirePermission(OPERATIONS.user.view, "view", ["OPERADOR"]);
  if (error) return error;

  const { id } = await context.params;

  try {
    const usuario = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!usuario) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Solo permitir ver usuarios ADMIN y OPERADOR
    if (usuario.role !== "ADMIN" && usuario.role !== "OPERADOR") {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    return NextResponse.json(usuario);
  } catch (error: unknown) {
    console.error("Error in GET /api/usuarios/[id]:", error);
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PUT /api/usuarios/[id]
 * Actualizar usuario (nombre, rol, contrasena)
 * Sensitive operation - NO fallback roles
 */
export async function PUT(req: NextRequest, context: RouteContext) {
  const { error, userId } = await requirePermission(OPERATIONS.user.update, "execute", []);
  if (error) return error;

  const { id } = await context.params;

  try {
    const body = await req.json();
    const parsed = updateUsuarioSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos invalidos", details: parsed.error.format() },
        { status: 400 }
      );
    }

    // Verificar que el usuario existe
    const usuario = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });

    if (!usuario) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // No permitir modificar CLIENTEs desde este endpoint
    if (usuario.role !== "ADMIN" && usuario.role !== "OPERADOR") {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Prevenir que el usuario se cambie el rol a si mismo
    if (id === userId && parsed.data.role && parsed.data.role !== usuario.role) {
      return NextResponse.json(
        { error: "No puedes cambiar tu propio rol" },
        { status: 403 }
      );
    }

    // Preparar datos para actualizar
    const updateData: any = {};

    if (parsed.data.name) {
      updateData.name = parsed.data.name;
    }

    if (parsed.data.role) {
      updateData.role = parsed.data.role;
    }

    // Si se proporciona contrasena, hashearla
    if (parsed.data.password) {
      updateData.password = await bcrypt.hash(parsed.data.password, 10);
    }

    const usuarioActualizado = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    eventBus.emit(OPERATIONS.user.update, "User", id, { name: parsed.data.name, role: parsed.data.role }, userId).catch(err => console.error("[Events] user.update error:", err));

    return NextResponse.json(usuarioActualizado);
  } catch (error: unknown) {
    console.error("Error in PUT /api/usuarios/[id]:", error);
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/usuarios/[id]
 * Eliminar/desactivar un usuario
 * Sensitive operation - NO fallback roles
 */
export async function DELETE(req: NextRequest, context: RouteContext) {
  const { error, userId } = await requirePermission(OPERATIONS.user.update, "execute", []);
  if (error) return error;

  const { id } = await context.params;

  try {
    // Prevenir que el usuario se elimine a si mismo
    if (id === userId) {
      return NextResponse.json(
        { error: "No puedes eliminar tu propia cuenta" },
        { status: 403 }
      );
    }

    // Verificar que el usuario existe
    const usuario = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });

    if (!usuario) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // No permitir eliminar CLIENTEs desde este endpoint
    if (usuario.role !== "ADMIN" && usuario.role !== "OPERADOR") {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Eliminar el usuario y todas sus relaciones (en transaccion)
    await prisma.$transaction([
      prisma.cliente.deleteMany({ where: { userId: id } }),
      prisma.user.delete({ where: { id } }),
    ]);

    eventBus.emit(OPERATIONS.user.update, "User", id, { action: "delete", role: usuario.role }, userId).catch(err => console.error("[Events] user.delete error:", err));

    return NextResponse.json({ message: "Usuario eliminado correctamente" });
  } catch (error: unknown) {
    console.error("Error in DELETE /api/usuarios/[id]:", error);
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
