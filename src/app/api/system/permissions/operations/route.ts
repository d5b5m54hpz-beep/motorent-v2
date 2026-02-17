import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";

// GET: List all operations, optionally filtered by family
export async function GET(req: NextRequest) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const family = searchParams.get("family");

    const operations = await prisma.operation.findMany({
      where: family ? { family } : undefined,
      orderBy: [{ family: "asc" }, { entity: "asc" }, { action: "asc" }],
    });

    // Group by family for convenience
    const grouped = operations.reduce<Record<string, typeof operations>>((acc, op) => {
      if (!acc[op.family]) acc[op.family] = [];
      acc[op.family].push(op);
      return acc;
    }, {});

    return NextResponse.json({ operations, grouped });
  } catch (err: unknown) {
    console.error("Error fetching operations:", err);
    return NextResponse.json({ error: "Error al obtener operaciones" }, { status: 500 });
  }
}
