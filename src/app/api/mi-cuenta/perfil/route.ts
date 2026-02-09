import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { updateProfileSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "No autenticado" },
      { status: 401 }
    );
  }

  const userId = session.user.id;

  try {
    // Try to find existing cliente
    let cliente = await prisma.cliente.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    // If cliente doesn't exist, create it automatically
    if (!cliente) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true },
      });

      if (!user) {
        return NextResponse.json(
          { error: "Usuario no encontrado" },
          { status: 404 }
        );
      }

      cliente = await prisma.cliente.create({
        data: {
          userId,
          nombre: user.name || "",
          email: user.email,
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      console.log("✅ Cliente auto-created for user:", userId);
    }

    return NextResponse.json(cliente);
  } catch (error: unknown) {
    console.error("Error fetching client profile:", error);
    return NextResponse.json(
      { error: "Error al cargar perfil" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "No autenticado" },
      { status: 401 }
    );
  }

  const userId = session.user.id;

  try {
    const body = await req.json();
    const parsed = updateProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Datos inválidos",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    // Check if cliente exists
    let existing = await prisma.cliente.findUnique({
      where: { userId },
    });

    // If cliente doesn't exist, create it automatically
    if (!existing) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true },
      });

      if (!user) {
        return NextResponse.json(
          { error: "Usuario no encontrado" },
          { status: 404 }
        );
      }

      existing = await prisma.cliente.create({
        data: {
          userId,
          nombre: user.name || "",
          email: user.email,
          ...parsed.data,
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      console.log("✅ Cliente auto-created and updated for user:", userId);
      return NextResponse.json(existing);
    }

    // Update cliente profile
    const updated = await prisma.cliente.update({
      where: { userId },
      data: parsed.data,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    console.error("Error updating client profile:", error);
    return NextResponse.json(
      { error: "Error al actualizar perfil" },
      { status: 500 }
    );
  }
}
