import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { OPERATIONS } from "@/lib/events";
import { z } from "zod";

type RouteContext = { params: Promise<{ id: string }> };

// GET: Fetch a single permission profile by ID with grants and users
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { error } = await requirePermission(OPERATIONS.system.config.view, "view", []);
  if (error) return error;

  try {
    const { id } = await params;

    const profile = await prisma.permissionProfile.findUnique({
      where: { id },
      include: {
        grants: {
          include: {
            operation: true,
          },
        },
        users: {
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true, image: true },
            },
          },
        },
        _count: { select: { grants: true, users: true } },
      },
    });

    if (!profile) {
      return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (err: unknown) {
    console.error("Error fetching profile:", err);
    return NextResponse.json({ error: "Error al obtener perfil" }, { status: 500 });
  }
}

// PUT: Update a permission profile
const updateProfileSchema = z.object({
  name: z.string().min(1, "Nombre requerido").optional(),
  description: z.string().optional(),
  grants: z.array(z.object({
    operationId: z.string(),
    canView: z.boolean().default(false),
    canCreate: z.boolean().default(false),
    canExecute: z.boolean().default(false),
    canApprove: z.boolean().default(false),
  })).optional(),
});

export async function PUT(req: NextRequest, { params }: RouteContext) {
  const { error } = await requirePermission(OPERATIONS.system.config.update, "execute", []);
  if (error) return error;

  try {
    const { id } = await params;

    const body = await req.json();
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos invalidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, description, grants } = parsed.data;

    // Check profile exists
    const existing = await prisma.permissionProfile.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });
    }

    // If name is being changed, check uniqueness
    if (name && name !== existing.name) {
      const nameConflict = await prisma.permissionProfile.findUnique({ where: { name } });
      if (nameConflict) {
        return NextResponse.json({ error: "Ya existe un perfil con ese nombre" }, { status: 400 });
      }
    }

    // Use transaction to update profile and grants atomically
    const updated = await prisma.$transaction(async (tx) => {
      // Update profile fields
      const profile = await tx.permissionProfile.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
        },
      });

      // If grants provided, replace all grants
      if (grants) {
        await tx.permissionGrant.deleteMany({ where: { profileId: id } });
        await tx.permissionGrant.createMany({
          data: grants.map((g) => ({
            profileId: id,
            operationId: g.operationId,
            canView: g.canView,
            canCreate: g.canCreate,
            canExecute: g.canExecute,
            canApprove: g.canApprove,
          })),
        });
      }

      // Return the updated profile with relations
      return tx.permissionProfile.findUnique({
        where: { id },
        include: {
          grants: { include: { operation: true } },
          _count: { select: { grants: true, users: true } },
        },
      });
    });

    return NextResponse.json(updated);
  } catch (err: unknown) {
    console.error("Error updating profile:", err);
    return NextResponse.json({ error: "Error al actualizar perfil" }, { status: 500 });
  }
}
