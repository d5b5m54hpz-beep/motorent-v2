import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const headers = [
    "nombre",
    "codigo",
    "categoria",
    "marca",
    "precioCompra",
    "precioVenta",
    "stock",
    "stockMinimo",
    "unidad",
    "ubicacion",
  ];

  const ejemplos = [
    [
      "Filtro de Aceite",
      "REP-FIL-001",
      "FILTROS",
      "Honda",
      "500",
      "650",
      "10",
      "3",
      "unidad",
      "E1-F1-P1",
    ],
    [
      "Aceite Motor 20W50 1L",
      "REP-ACE-001",
      "ACEITES",
      "YPF",
      "1800",
      "2340",
      "5",
      "2",
      "litro",
      "E1-F2-P1",
    ],
  ];

  const csv = [headers.join(","), ...ejemplos.map((row) => row.join(","))].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=repuestos-template.csv",
    },
  });
}
