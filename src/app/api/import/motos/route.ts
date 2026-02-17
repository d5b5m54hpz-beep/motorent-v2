import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";
import { motoSchema } from "@/lib/validations";
import * as XLSX from "xlsx";

type ParsedRow = {
  rowIndex: number;
  data: any;
  valid: boolean;
  errors?: string[];
};

export async function POST(req: NextRequest) {
  const { error, userId } = await requirePermission(OPERATIONS.system.import.execute, "execute", ["OPERADOR"]);
  if (error) return error;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const confirm = formData.get("confirm") === "true";

    if (!file) {
      return NextResponse.json(
        { error: "No se proporcionó archivo" },
        { status: 400 }
      );
    }

    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON
    const rawData = XLSX.utils.sheet_to_json(worksheet);

    if (rawData.length === 0) {
      return NextResponse.json(
        { error: "El archivo está vacío" },
        { status: 400 }
      );
    }

    // Parse and validate each row
    const results: ParsedRow[] = rawData.map((row: any, index) => {
      try {
        // Map Excel columns to schema fields
        const mapped = {
          marca: row.Marca || row.marca,
          modelo: row.Modelo || row.modelo,
          patente: row.Patente || row.patente,
          anio: row.Año || row["Año"] || row.anio || row.ano,
          color: row.Color || row.color || "",
          kilometraje: row.Kilometraje || row.kilometraje || 0,
          precioMensual: row["Precio Mensual"] || row.precioMensual || 0,
          cilindrada: row.Cilindrada || row.cilindrada || undefined,
          tipo: row.Tipo || row.tipo || undefined,
          descripcion: row.Descripción || row["Descripcion"] || row.descripcion || "",
          estado: row.Estado || row.estado || "disponible",
          imagen: row.Imagen || row.imagen || "",
        };

        const validated = motoSchema.parse(mapped);
        return {
          rowIndex: index + 2, // +2 because Excel rows start at 1 and we have headers
          data: validated,
          valid: true,
        };
      } catch (err: unknown) {
        const zodErr = err as { errors?: { path: string[]; message: string }[]; message?: string };
        const errors = zodErr.errors?.map((e) => `${e.path.join(".")}: ${e.message}`) || [
          zodErr.message || "Error desconocido",
        ];
        return {
          rowIndex: index + 2,
          data: row,
          valid: false,
          errors,
        };
      }
    });

    const validRows = results.filter((r) => r.valid);
    const invalidRows = results.filter((r) => !r.valid);

    // If confirm flag, create records
    if (confirm) {
      if (validRows.length === 0) {
        return NextResponse.json(
          { error: "No hay filas válidas para importar" },
          { status: 400 }
        );
      }

      // Create all valid motos
      const created = await prisma.moto.createMany({
        data: validRows.map((r) => r.data),
        skipDuplicates: true,
      });

      eventBus.emit(OPERATIONS.system.import.execute, "import", "bulk", { tipo: "motos", cantidadImportada: created.count }, userId!).catch(err => console.error("[Events] import motos error:", err));

      return NextResponse.json({
        success: true,
        created: created.count,
        message: `${created.count} motos importadas correctamente`,
      });
    }

    // Return preview
    return NextResponse.json({
      preview: true,
      total: rawData.length,
      valid: validRows.length,
      invalid: invalidRows.length,
      validRows: validRows.slice(0, 5).map((r) => ({ row: r.rowIndex, data: r.data })),
      invalidRows: invalidRows.map((r) => ({ row: r.rowIndex, errors: r.errors, data: r.data })),
    });
  } catch (error: unknown) {
    console.error("Error importing motos:", error);
    return NextResponse.json(
      { error: "Error al procesar el archivo" },
      { status: 500 }
    );
  }
}
