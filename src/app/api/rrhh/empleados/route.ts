import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";
import { empleadoSchema } from "@/lib/validations";
import { SexoEmpleado, EstadoCivil, Departamento, JornadaLaboral, EstadoEmpleado } from "@prisma/client";

export async function GET(req: NextRequest) {
  const { error } = await requirePermission(OPERATIONS.hr.employee.view, "view", ["OPERADOR"]);
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
      ...(estado && { estado: estado as EstadoEmpleado }),
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
  const { error, userId } = await requirePermission(OPERATIONS.hr.employee.create, "create", ["OPERADOR"]);
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
        sexo: rest.sexo as SexoEmpleado,
        estadoCivil: rest.estadoCivil as EstadoCivil,
        departamento: rest.departamento as Departamento,
        jornadaLaboral: rest.jornadaLaboral as JornadaLaboral,
        fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : null,
        fechaIngreso: new Date(fechaIngreso),
        fechaEgreso: fechaEgreso ? new Date(fechaEgreso) : null,
        fechaAltaAFIP: fechaAltaAFIP ? new Date(fechaAltaAFIP) : null,
      },
    });

    eventBus.emit(OPERATIONS.hr.employee.create, "Empleado", empleado.id, { nombre: rest.nombre, cargo: rest.cargo, salario: rest.salarioBasico, fechaIngreso }, userId).catch(err => console.error("[Events] hr.employee.create error:", err));

    return NextResponse.json(empleado, { status: 201 });
  } catch (err: unknown) {
    console.error("Error creating empleado:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
