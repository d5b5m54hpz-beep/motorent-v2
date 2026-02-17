import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const actualizarPerfilSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  telefono: z.string().nullable().optional(),
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
