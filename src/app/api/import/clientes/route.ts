import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";
import { clienteSchema } from "@/lib/validations";
import * as XLSX from "xlsx";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";

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
          nombre: row.Nombre || row.nombre,
          email: row.Email || row.email,
          telefono: row.Teléfono || row["Telefono"] || row.telefono || "",
          dni: row.DNI || row.dni || "",
          dniVerificado: false,
          licencia: row.Licencia || row.licencia || "",
          licenciaVencimiento: row["Licencia Vencimiento"] || row.licenciaVencimiento || undefined,
          licenciaVerificada: false,
          direccion: row.Dirección || row["Direccion"] || row.direccion || "",
          ciudad: row.Ciudad || row.ciudad || "",
          provincia: row.Provincia || row.provincia || "",
          codigoPostal: row["Código Postal"] || row["Codigo Postal"] || row.codigoPostal || "",
          fechaNacimiento: row["Fecha Nacimiento"] || row.fechaNacimiento || undefined,
          notas: row.Notas || row.notas || "",
          estado: "pendiente" as const,
        };

        const validated = clienteSchema.parse(mapped);
        return {
          rowIndex: index + 2,
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

      // Create users and clientes in transaction
      const defaultPassword = await bcrypt.hash("cliente123", 10);
      let created = 0;

      for (const row of validRows) {
        try {
          await prisma.$transaction(async (tx) => {
            // Check if user already exists
            const existingUser = await tx.user.findUnique({
              where: { email: row.data.email },
            });

            let userId: string;

            if (existingUser) {
              userId = existingUser.id;
            } else {
              // Create new user
              const user = await tx.user.create({
                data: {
                  email: row.data.email,
                  name: row.data.nombre,
                  phone: row.data.telefono || undefined,
                  password: defaultPassword,
                  provider: "credentials",
                  role: Role.CLIENTE,
                },
              });
              userId = user.id;
            }

            // Check if cliente already exists
            const existingCliente = await tx.cliente.findUnique({
              where: { email: row.data.email },
            });

            if (!existingCliente) {
              // Create cliente
              await tx.cliente.create({
                data: {
                  userId,
                  email: row.data.email,
                  ...row.data,
                },
              });
              created++;
            }
          });
        } catch (err: unknown) {
          console.error(`Error creating cliente ${row.data.email}:`, err);
          // Continue with next row
        }
      }

      eventBus.emit(OPERATIONS.system.import.execute, "import", "bulk", { tipo: "clientes", cantidadImportada: created }, userId!).catch(err => console.error("[Events] import clientes error:", err));

      return NextResponse.json({
        success: true,
        created,
        message: `${created} clientes importados correctamente`,
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
    console.error("Error importing clientes:", error);
    return NextResponse.json(
      { error: "Error al procesar el archivo" },
      { status: 500 }
    );
  }
}
