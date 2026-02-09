import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { createUsuarioSchema } from "@/lib/validations";
import bcrypt from "bcryptjs";

/**
 * GET /api/usuarios
 * Lista de usuarios (ADMIN y OPERADOR) con paginación y búsqueda
 * Solo accesible para ADMIN
 */
export async function GET(req: NextRequest) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role") || "";

    const skip = (page - 1) * limit;

    // Construir where clause
    const where: any = {
      role: { in: ["ADMIN", "OPERADOR"] },
    };

    // Filtro por rol específico
    if (role && (role === "ADMIN" || role === "OPERADOR")) {
      where.role = role;
    }

    // Búsqueda por nombre o email
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const [usuarios, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          image: true,
          createdAt: true,
          updatedAt: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      data: usuarios,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: unknown) {
    console.error("Error in GET /api/usuarios:", error);
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/usuarios
 * Crea un nuevo usuario (ADMIN o OPERADOR)
 * Solo accesible para ADMIN
 */
export async function POST(req: NextRequest) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = createUsuarioSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { email, name, password, role } = parsed.data;

    // Verificar que el email no exista
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "El email ya está registrado" },
        { status: 409 }
      );
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario con provider "credentials"
    const usuario = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role,
        provider: "credentials", // Usuarios creados manualmente usan credentials
      },
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

    return NextResponse.json(usuario, { status: 201 });
  } catch (error: unknown) {
    console.error("Error in POST /api/usuarios:", error);
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
