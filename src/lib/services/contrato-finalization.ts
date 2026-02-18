import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type TxClient = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

/**
 * Checks if all pagos for a contrato are settled (APROBADO or CANCELADO).
 * If so, finalizes the contrato and releases the moto.
 *
 * Accepts a Prisma transaction client so it runs inside the caller's transaction.
 */
export async function checkAndFinalizeContrato(
  tx: TxClient,
  contratoId: string,
  motoId: string
): Promise<boolean> {
  const pagos = await tx.pago.findMany({
    where: { contratoId },
    select: { estado: true },
  });

  const allSettled = pagos.every(
    (p) => p.estado === "APROBADO" || p.estado === "CANCELADO"
  );

  if (!allSettled) return false;

  await tx.contrato.update({
    where: { id: contratoId },
    data: { estado: "FINALIZADO" },
  });

  await tx.moto.update({
    where: { id: motoId },
    data: { estado: "DISPONIBLE" },
  });

  return true;
}

/**
 * Non-transactional version for use in event handlers.
 * Uses the global prisma client directly.
 */
export async function checkAndFinalizeContratoFromHandler(
  contratoId: string,
  motoId: string
): Promise<boolean> {
  const pagos = await prisma.pago.findMany({
    where: { contratoId },
    select: { estado: true },
  });

  const allSettled = pagos.every(
    (p) => p.estado === "APROBADO" || p.estado === "CANCELADO"
  );

  if (!allSettled) return false;

  await prisma.contrato.update({
    where: { id: contratoId },
    data: { estado: "FINALIZADO" },
  });

  await prisma.moto.update({
    where: { id: motoId },
    data: { estado: "DISPONIBLE" },
  });

  return true;
}
