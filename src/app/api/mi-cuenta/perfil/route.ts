import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { updateProfileSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const { error, userId } = await requireRole(["CLIENTE", "ADMIN"]);
  if (error) return error;

  try {
    const cliente = await prisma.cliente.findUnique({
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

    if (!cliente) {
      return NextResponse.json(
        { error: "Cliente no encontrado" },
        { status: 404 }
      );
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
  const { error, userId } = await requireRole(["CLIENTE", "ADMIN"]);
  if (error) return error;

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
    const existing = await prisma.cliente.findUnique({
      where: { userId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Cliente no encontrado" },
        { status: 404 }
      );
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
