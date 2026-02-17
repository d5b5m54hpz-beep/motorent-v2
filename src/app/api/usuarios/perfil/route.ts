import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { OPERATIONS } from "@/lib/events";
import { z } from "zod";
import bcrypt from "bcryptjs";

const actualizarPerfilSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  telefono: z.string().nullable().optional(),
});

const cambiarPasswordSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, "Minimo 6 caracteres"),
});

export async function GET() {
  const { error, userId } = await requirePermission(OPERATIONS.user.profile.view, "view", ["OPERADOR", "CLIENTE", "CONTADOR"]);
  if (error) return error;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        image: true,
        provider: true,
        totpEnabled: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (err: unknown) {
    console.error("Error al obtener perfil:", err);
    return NextResponse.json({ error: "Error al cargar perfil" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const { error, userId } = await requirePermission(OPERATIONS.user.profile.update, "execute", ["OPERADOR", "CLIENTE", "CONTADOR"]);
  if (error) return error;

  try {
    const body = await req.json();

    // Password change
    if (body.action === "change-password") {
      const parsed = cambiarPasswordSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Datos invalidos", details: parsed.error.flatten().fieldErrors },
          { status: 400 }
        );
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
      }

      // If user has password, verify current password
      if (user.password) {
        if (!parsed.data.currentPassword) {
          return NextResponse.json({ error: "Contrasena actual requerida" }, { status: 400 });
        }
        const valid = await bcrypt.compare(parsed.data.currentPassword, user.password);
        if (!valid) {
          return NextResponse.json({ error: "Contrasena actual incorrecta" }, { status: 400 });
        }
      }

      const hashed = await bcrypt.hash(parsed.data.newPassword, 10);
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashed },
      });

      return NextResponse.json({ message: "Contrasena actualizada" });
    }

    // Image update
    if (body.action === "update-image") {
      const { imageUrl } = body;
      if (!imageUrl || typeof imageUrl !== "string") {
        return NextResponse.json({ error: "URL de imagen requerida" }, { status: 400 });
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: { image: imageUrl },
        select: { id: true, name: true, email: true, image: true, role: true },
      });

      return NextResponse.json(user);
    }

    // Profile update (name, phone)
    const parsed = actualizarPerfilSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos invalidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { nombre, telefono } = parsed.data;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        name: nombre,
        phone: telefono ?? undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        image: true,
      },
    });

    return NextResponse.json(user);
  } catch (err: unknown) {
    console.error("Error al actualizar perfil:", err);
    return NextResponse.json({ error: "Error al actualizar perfil" }, { status: 500 });
  }
}
