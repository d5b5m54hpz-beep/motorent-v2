import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";
import { clienteSchema } from "@/lib/validations";
import bcrypt from "bcryptjs";

const ALLOWED_SORT_COLUMNS = [
  "nombre", "email", "dni", "ciudad", "estado", "createdAt",
];

// GET /api/clientes — list clientes (paginated, searchable, sortable)
export async function GET(req: NextRequest) {
  const { error } = await requirePermission(
    OPERATIONS.rental.client.view,
    "view",
    ["OPERADOR"]
  );
  if (error) return error;

  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get("page") ?? "1");
  const limit = parseInt(url.searchParams.get("limit") ?? "15");
  const search = url.searchParams.get("search") ?? "";
  const sortBy = url.searchParams.get("sortBy") ?? "createdAt";
  const sortOrder = url.searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
  const estado = url.searchParams.get("estado");

  const orderByColumn = ALLOWED_SORT_COLUMNS.includes(sortBy) ? sortBy : "createdAt";

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { nombre: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { dni: { contains: search, mode: "insensitive" } },
    ];
  }

  if (estado) {
    where.estado = estado;
  }

  const [data, total] = await Promise.all([
    prisma.cliente.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [orderByColumn]: sortOrder },
      include: {
        user: { select: { name: true, email: true, phone: true, image: true } },
        _count: { select: { contratos: true } },
      },
    }),
    prisma.cliente.count({ where }),
  ]);

  return NextResponse.json({
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}

// POST /api/clientes — create cliente (User + Cliente in transaction)
export async function POST(req: NextRequest) {
  const { error, userId } = await requirePermission(
    OPERATIONS.rental.client.create,
    "execute",
    ["OPERADOR"]
  );
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = clienteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos invalidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { nombre, email, telefono, fechaNacimiento, licenciaVencimiento, ...clienteData } = parsed.data;

    // Check email uniqueness
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: "Ya existe un usuario con ese email" },
        { status: 409 }
      );
    }

    // Create User + Cliente in transaction
    const defaultPassword = await bcrypt.hash("cliente123", 10);

    const cliente = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          name: nombre,
          phone: telefono,
          password: defaultPassword,
          provider: "credentials",
          role: "CLIENTE",
        },
      });

      return tx.cliente.create({
        data: {
          userId: user.id,
          nombre,
          email,
          telefono,
          fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : null,
          licenciaVencimiento: licenciaVencimiento ? new Date(licenciaVencimiento) : null,
          ...clienteData,
        },
        include: {
          user: { select: { name: true, email: true, phone: true, image: true } },
          _count: { select: { contratos: true } },
        },
      });
    });

    // Emit client creation event
    eventBus.emit(
      OPERATIONS.rental.client.create,
      "Cliente",
      cliente.id,
      { nombre, email },
      userId
    ).catch((err) => {
      console.error("Error emitting rental.client.create event:", err);
    });

    return NextResponse.json(cliente, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating cliente:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
