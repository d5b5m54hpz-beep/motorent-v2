import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import bcrypt from "bcryptjs";

const actualizarPerfilSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  telefono: z.string().nullable().optional(),
});

const cambiarPasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6, "Mínimo 6 caracteres"),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
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
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();

    // Password change
    if (body.action === "change-password") {
      const parsed = cambiarPasswordSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
          { status: 400 }
        );
      }

      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
      });

      if (!user) {
        return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
      }

      // If user has password, verify current
      if (user.password) {
        const valid = await bcrypt.compare(parsed.data.currentPassword, user.password);
        if (!valid) {
          return NextResponse.json({ error: "Contraseña actual incorrecta" }, { status: 400 });
        }
      }

      const hashed = await bcrypt.hash(parsed.data.newPassword, 10);
      await prisma.user.update({
        where: { email: session.user.email },
        data: { password: hashed },
      });

      return NextResponse.json({ message: "Contraseña actualizada" });
    }

    // Image update
    if (body.action === "update-image") {
      const { imageUrl } = body;
      if (!imageUrl || typeof imageUrl !== "string") {
        return NextResponse.json({ error: "URL de imagen requerida" }, { status: 400 });
      }

      const user = await prisma.user.update({
        where: { email: session.user.email },
        data: { image: imageUrl },
        select: { id: true, name: true, email: true, image: true, role: true },
      });

      return NextResponse.json(user);
    }

    // Profile update (name, phone)
    const parsed = actualizarPerfilSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { nombre, telefono } = parsed.data;

    const user = await prisma.user.update({
      where: { email: session.user.email },
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
