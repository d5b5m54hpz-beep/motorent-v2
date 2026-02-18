import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/require-permission";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { CUIT_REGEX } from "@/lib/validations";

const configuracionEmpresaSchema = z.object({
  razonSocial: z.string().min(1, "Razón social requerida"),
  cuit: z.string().regex(CUIT_REGEX, "CUIT inválido (formato: XX-XXXXXXXX-X)").optional().or(z.literal("")),
  condicionIva: z.enum(["RESPONSABLE_INSCRIPTO", "MONOTRIBUTISTA", "EXENTO", "NO_RESPONSABLE", "CONSUMIDOR_FINAL"]),
  domicilioComercial: z.string().optional(),
  domicilioFiscal: z.string().optional(),
  inicioActividades: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  actividadPrincipal: z.string().optional(),
  puntoVentaAfip: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const { error } = await requirePermission(OPERATIONS.system.config.view, "view", ["OPERADOR"]);
  if (error) return error;

  try {
    let config = await prisma.configuracionEmpresa.findUnique({
      where: { id: "default" },
    });

    // Si no existe, crear con valores por defecto
    if (!config) {
      config = await prisma.configuracionEmpresa.create({
        data: {
          id: "default",
          razonSocial: "MotoLibre S.A.S",
          condicionIva: "RESPONSABLE_INSCRIPTO",
        },
      });
    }

    return NextResponse.json({ data: config });
  } catch (error: unknown) {
    console.error("Error fetching configuracion empresa:", error);
    return NextResponse.json({ error: "Error al obtener configuración" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const { error: authError } = await requirePermission(OPERATIONS.system.config.update, "execute", []);
  if (authError) return authError;

  try {
    const body = await req.json();
    const validation = configuracionEmpresaSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validación fallida", details: validation.error.format() },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Convertir inicioActividades a DateTime si está presente
    const inicioActividades = data.inicioActividades
      ? new Date(data.inicioActividades)
      : null;

    const config = await prisma.configuracionEmpresa.upsert({
      where: { id: "default" },
      update: {
        razonSocial: data.razonSocial,
        cuit: data.cuit || null,
        condicionIva: data.condicionIva,
        domicilioComercial: data.domicilioComercial || null,
        domicilioFiscal: data.domicilioFiscal || null,
        inicioActividades,
        telefono: data.telefono || null,
        email: data.email || null,
        actividadPrincipal: data.actividadPrincipal || null,
        puntoVentaAfip: data.puntoVentaAfip || null,
      },
      create: {
        id: "default",
        razonSocial: data.razonSocial,
        cuit: data.cuit || null,
        condicionIva: data.condicionIva,
        domicilioComercial: data.domicilioComercial || null,
        domicilioFiscal: data.domicilioFiscal || null,
        inicioActividades,
        telefono: data.telefono || null,
        email: data.email || null,
        actividadPrincipal: data.actividadPrincipal || null,
        puntoVentaAfip: data.puntoVentaAfip || null,
      },
    });

    return NextResponse.json({ data: config });
  } catch (error: unknown) {
    console.error("Error updating configuracion empresa:", error);
    return NextResponse.json({ error: "Error al actualizar configuración" }, { status: 500 });
  }
}
