import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { OPERATIONS } from "@/lib/events";
import { z } from "zod";

// GET: List all permission profiles with grant counts
export async function GET() {
  const { error } = await requirePermission(OPERATIONS.system.config.view, "view", []);
  if (error) return error;

  try {
    const profiles = await prisma.permissionProfile.findMany({
      include: {
        _count: { select: { grants: true, users: true } },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(profiles);
  } catch (err: unknown) {
    console.error("Error fetching profiles:", err);
    return NextResponse.json({ error: "Error al obtener perfiles" }, { status: 500 });
  }
}

// POST: Create a new permission profile
const createProfileSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  description: z.string().optional(),
  grants: z.array(z.object({
    operationId: z.string(),
    canView: z.boolean().default(false),
    canCreate: z.boolean().default(false),
    canExecute: z.boolean().default(false),
    canApprove: z.boolean().default(false),
  })).optional(),
});

export async function POST(req: NextRequest) {
  const { error } = await requirePermission(OPERATIONS.system.config.update, "execute", []);
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = createProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, description, grants } = parsed.data;

    // Check unique name
    const existing = await prisma.permissionProfile.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json({ error: "Ya existe un perfil con ese nombre" }, { status: 400 });
    }

    const profile = await prisma.permissionProfile.create({
      data: {
        name,
        description,
        isSystem: false,
        grants: grants ? {
          create: grants.map((g) => ({
            operationId: g.operationId,
            canView: g.canView,
            canCreate: g.canCreate,
            canExecute: g.canExecute,
            canApprove: g.canApprove,
          })),
        } : undefined,
      },
      include: {
        grants: { include: { operation: true } },
        _count: { select: { users: true } },
      },
    });

    return NextResponse.json(profile, { status: 201 });
  } catch (err: unknown) {
    console.error("Error creating profile:", err);
    return NextResponse.json({ error: "Error al crear perfil" }, { status: 500 });
  }
}
