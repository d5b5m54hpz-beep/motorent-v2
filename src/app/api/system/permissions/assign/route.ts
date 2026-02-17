import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { OPERATIONS } from "@/lib/events";
import { z } from "zod";

const assignSchema = z.object({
  userId: z.string().min(1),
  profileId: z.string().min(1),
});

const unassignSchema = z.object({
  userId: z.string().min(1),
  profileId: z.string().min(1),
});

// POST: Assign a profile to a user
export async function POST(req: NextRequest) {
  const { error, userId: adminId } = await requirePermission(OPERATIONS.system.config.update, "execute", []);
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = assignSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { userId, profileId } = parsed.data;

    // Verify user and profile exist
    const [user, profile] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.permissionProfile.findUnique({ where: { id: profileId } }),
    ]);

    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    if (!profile) return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });

    const assignment = await prisma.userProfile.upsert({
      where: { userId_profileId: { userId, profileId } },
      update: {},
      create: {
        userId,
        profileId,
        assignedBy: adminId,
      },
      include: {
        profile: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(assignment, { status: 201 });
  } catch (err: unknown) {
    console.error("Error assigning profile:", err);
    return NextResponse.json({ error: "Error al asignar perfil" }, { status: 500 });
  }
}

// DELETE: Remove a profile from a user
export async function DELETE(req: NextRequest) {
  const { error } = await requirePermission(OPERATIONS.system.config.update, "execute", []);
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = unassignSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { userId, profileId } = parsed.data;

    await prisma.userProfile.delete({
      where: { userId_profileId: { userId, profileId } },
    });

    return NextResponse.json({ message: "Perfil removido del usuario" });
  } catch (err: unknown) {
    console.error("Error removing profile:", err);
    return NextResponse.json({ error: "Error al remover perfil" }, { status: 500 });
  }
}
