import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { OPERATIONS } from "@/lib/events";
import { generateSecret, generateURI, verifySync } from "otplib";
import QRCode from "qrcode";

// POST: Generate 2FA secret + QR code
export async function POST() {
  const { error, userId } = await requirePermission(OPERATIONS.user.profile.update, "execute", ["OPERADOR", "CLIENTE", "CONTADOR"]);
  if (error) return error;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    if (user.totpEnabled) {
      return NextResponse.json({ error: "2FA ya esta activado" }, { status: 400 });
    }

    // Generate secret
    const secret = generateSecret();

    // Save secret (not enabled yet - needs verification)
    await prisma.user.update({
      where: { id: user.id },
      data: { totpSecret: secret },
    });

    // Generate QR code
    const otpauthUrl = generateURI({
      issuer: "MotoLibre",
      label: user.email,
      secret,
    });
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    return NextResponse.json({
      secret,
      qrCode: qrCodeDataUrl,
    });
  } catch (err: unknown) {
    console.error("Error generating 2FA:", err);
    return NextResponse.json({ error: "Error al generar 2FA" }, { status: 500 });
  }
}

// PUT: Verify code and enable 2FA
export async function PUT(req: NextRequest) {
  const { error, userId } = await requirePermission(OPERATIONS.user.profile.update, "execute", ["OPERADOR", "CLIENTE", "CONTADOR"]);
  if (error) return error;

  try {
    const { code } = await req.json();

    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Codigo requerido" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.totpSecret) {
      return NextResponse.json({ error: "No hay secreto 2FA configurado" }, { status: 400 });
    }

    // Verify the code
    const { valid } = verifySync({
      token: code,
      secret: user.totpSecret,
    });

    if (!valid) {
      return NextResponse.json({ error: "Codigo invalido" }, { status: 400 });
    }

    // Enable 2FA
    await prisma.user.update({
      where: { id: user.id },
      data: { totpEnabled: true },
    });

    return NextResponse.json({ message: "2FA activado correctamente" });
  } catch (err: unknown) {
    console.error("Error verifying 2FA:", err);
    return NextResponse.json({ error: "Error al verificar 2FA" }, { status: 500 });
  }
}

// DELETE: Disable 2FA
export async function DELETE(req: NextRequest) {
  const { error, userId } = await requirePermission(OPERATIONS.user.profile.update, "execute", ["OPERADOR", "CLIENTE", "CONTADOR"]);
  if (error) return error;

  try {
    const { code } = await req.json();

    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Codigo requerido para desactivar" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.totpSecret || !user.totpEnabled) {
      return NextResponse.json({ error: "2FA no esta activado" }, { status: 400 });
    }

    // Verify the code before disabling
    const { valid } = verifySync({
      token: code,
      secret: user.totpSecret,
    });

    if (!valid) {
      return NextResponse.json({ error: "Codigo invalido" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { totpSecret: null, totpEnabled: false },
    });

    return NextResponse.json({ message: "2FA desactivado" });
  } catch (err: unknown) {
    console.error("Error disabling 2FA:", err);
    return NextResponse.json({ error: "Error al desactivar 2FA" }, { status: 500 });
  }
}
