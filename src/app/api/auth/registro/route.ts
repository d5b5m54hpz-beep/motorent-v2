import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Role } from "@prisma/client";

const registroSchema = z.object({
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registroSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Datos inválidos",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { nombre, email, password } = parsed.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "El email ya está registrado" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with CLIENTE role
    const user = await prisma.user.create({
      data: {
        email,
        name: nombre,
        password: hashedPassword,
        role: Role.CLIENTE,
        provider: "credentials",
      },
    });

    // Auto-create Cliente record
    await prisma.cliente.create({
      data: {
        userId: user.id,
        nombre,
        email,
      },
    });

    console.log("✅ New user registered:", email);

    return NextResponse.json(
      {
        success: true,
        message: "Cuenta creada exitosamente",
        userId: user.id,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Error al crear la cuenta" },
      { status: 500 }
    );
  }
}
