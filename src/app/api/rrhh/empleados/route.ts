import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { empleadoSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const { error } = await requireRole(["ADMIN", "OPERADOR"]);
  if (error) return error;

  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") ?? "1");
    const limit = parseInt(url.searchParams.get("limit") ?? "15");
    const search = url.searchParams.get("search") ?? "";
    const estado = url.searchParams.get("estado") ?? "";

    const where = {
      ...(search && {
        OR: [
          { nombre: { contains: search, mode: "insensitive" as const } },
          { apellido: { contains: search, mode: "insensitive" as const } },
          { dni: { contains: search } },
          { cuil: { contains: search } },
          { cargo: { contains: search, mode: "insensitive" as const } },
        ],
      }),
      ...(estado && { estado: estado as "ACTIVO" | "LICENCIA" | "SUSPENDIDO" | "BAJA" }),
    };

    const [data, total] = await Promise.all([
      prisma.empleado.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.empleado.count({ where }),
    ]);

    return NextResponse.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err: unknown) {
    console.error("Error fetching empleados:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = empleadoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { fechaNacimiento, fechaIngreso, fechaEgreso, fechaAltaAFIP, ...rest } = parsed.data;

    const empleado = await prisma.empleado.create({
      data: {
        ...rest,
        fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : null,
        fechaIngreso: new Date(fechaIngreso),
        fechaEgreso: fechaEgreso ? new Date(fechaEgreso) : null,
        fechaAltaAFIP: fechaAltaAFIP ? new Date(fechaAltaAFIP) : null,
      },
    });

    return NextResponse.json(empleado, { status: 201 });
  } catch (err: unknown) {
    console.error("Error creating empleado:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
