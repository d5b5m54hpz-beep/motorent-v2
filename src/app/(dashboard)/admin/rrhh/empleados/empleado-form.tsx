"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { empleadoSchema, type EmpleadoInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { EmpleadoListItem } from "./types";
import {
  estadosEmpleado,
  tiposContrato,
  estadosCiviles,
  departamentos,
  jornadasLaborales,
} from "@/lib/validations";

type EmpleadoFormProps = {
  empleado?: EmpleadoListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

export function EmpleadoForm({ empleado, open, onOpenChange, onSuccess }: EmpleadoFormProps) {
  const [loading, setLoading] = useState(false);
  const isEdit = !!empleado;

  const form = useForm<EmpleadoInput>({
    resolver: zodResolver(empleadoSchema),
    defaultValues: empleado
      ? {
          ...empleado,
          fechaNacimiento: empleado.fechaNacimiento
            ? new Date(empleado.fechaNacimiento).toISOString().split("T")[0]
            : undefined,
          fechaIngreso: new Date(empleado.fechaIngreso).toISOString().split("T")[0],
          fechaEgreso: empleado.fechaEgreso
            ? new Date(empleado.fechaEgreso).toISOString().split("T")[0]
            : undefined,
          fechaAltaAFIP: empleado.fechaAltaAFIP
            ? new Date(empleado.fechaAltaAFIP).toISOString().split("T")[0]
            : undefined,
          cuil: empleado.cuil || "",
          sexo: empleado.sexo || "",
          telefono: empleado.telefono || "",
          email: empleado.email || "",
          direccion: empleado.direccion || "",
          ciudad: empleado.ciudad || "",
          provincia: empleado.provincia || "",
          codigoPostal: empleado.codigoPostal || "",
          estadoCivil: empleado.estadoCivil || "",
          nacionalidad: empleado.nacionalidad || "Argentina",
          contactoEmergencia: empleado.contactoEmergencia || "",
          telefonoEmergencia: empleado.telefonoEmergencia || "",
          departamento: empleado.departamento || "",
          jornadaLaboral: empleado.jornadaLaboral || "",
          horasSemanales: empleado.horasSemanales || 48,
          categoriaCCT: empleado.categoriaCCT || "",
          obraSocial: empleado.obraSocial || "",
          sindicato: empleado.sindicato || "",
          nroAfiliado: empleado.nroAfiliado || "",
          banco: empleado.banco || "",
          cbu: empleado.cbu || "",
          artContratada: empleado.artContratada || "",
          nroART: empleado.nroART || "",
          imagen: empleado.imagen || "",
          notas: empleado.notas || "",
        }
      : {
          nombre: "",
          apellido: "",
          dni: "",
          cuil: "",
          sexo: "",
          telefono: "",
          email: "",
          direccion: "",
          ciudad: "",
          provincia: "",
          codigoPostal: "",
          nacionalidad: "Argentina",
          fechaIngreso: new Date().toISOString().split("T")[0],
          estado: "ACTIVO",
          cargo: "",
          departamento: "",
          tipoContrato: "TIEMPO_INDETERMINADO",
          jornadaLaboral: "",
          horasSemanales: 48,
          salarioBasico: 0,
          categoriaCCT: "",
          obraSocial: "",
          sindicato: "",
          nroAfiliado: "",
          banco: "",
          cbu: "",
          altaAFIP: false,
          artContratada: "",
          nroART: "",
          imagen: "",
        },
  });

  async function onSubmit(data: EmpleadoInput) {
    setLoading(true);
    try {
      const url = isEdit ? `/api/rrhh/empleados/${empleado.id}` : "/api/rrhh/empleados";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al guardar empleado");
      }

      toast.success(isEdit ? "Empleado actualizado correctamente" : "Empleado creado correctamente");
      onSuccess();
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error("Error:", error);
      toast.error(error instanceof Error ? error.message : "Error al guardar empleado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Empleado" : "Nuevo Empleado"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Modifica los datos del empleado"
              : "Completa los datos para registrar un nuevo empleado"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Datos Personales */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Datos Personales</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="nombre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Nombre <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} disabled={loading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="apellido"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Apellido <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} disabled={loading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dni"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        DNI <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} disabled={loading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cuil"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CUIL</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="20-12345678-9" disabled={loading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fechaNacimiento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de Nacimiento</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} disabled={loading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="estadoCivil"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado Civil</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={loading}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {estadosCiviles.map((estado) => (
                            <SelectItem key={estado} value={estado}>
                              {estado.replace(/_/g, " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sexo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sexo</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={loading}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="M">Masculino</SelectItem>
                          <SelectItem value="F">Femenino</SelectItem>
                          <SelectItem value="X">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nacionalidad"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nacionalidad</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={loading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="telefono"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={loading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} disabled={loading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="direccion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dirección</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={loading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="ciudad"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ciudad</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={loading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="provincia"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Provincia</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={loading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="codigoPostal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código Postal</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={loading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="contactoEmergencia"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contacto de Emergencia</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={loading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="telefonoEmergencia"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono de Emergencia</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={loading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Datos Laborales */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Datos Laborales</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="fechaIngreso"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Fecha de Ingreso <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input type="date" {...field} disabled={loading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="estado"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Estado <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={loading}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {estadosEmpleado.map((estado) => (
                            <SelectItem key={estado} value={estado}>
                              {estado}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cargo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Cargo <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} disabled={loading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tipoContrato"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Tipo de Contrato <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={loading}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {tiposContrato.map((tipo) => (
                            <SelectItem key={tipo} value={tipo}>
                              {tipo.replace(/_/g, " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="departamento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Departamento</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={loading}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {departamentos.map((dept) => (
                            <SelectItem key={dept} value={dept}>
                              {dept}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="jornadaLaboral"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jornada Laboral</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={loading}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {jornadasLaborales.map((jornada) => (
                            <SelectItem key={jornada} value={jornada}>
                              {jornada}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="horasSemanales"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Horas Semanales</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 48)}
                          disabled={loading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fechaEgreso"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de Egreso</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} disabled={loading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Datos Salariales */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Datos Salariales</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="salarioBasico"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Salario Básico <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          disabled={loading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="categoriaCCT"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoría CCT</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={loading} placeholder="Convenio Colectivo de Trabajo" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="obraSocial"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Obra Social</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={loading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nroAfiliado"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número de Afiliado</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={loading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sindicato"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sindicato</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={loading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="artContratada"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ART Contratada</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={loading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nroART"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número ART</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={loading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="banco"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Banco</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={loading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cbu"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CBU</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={loading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Documentación */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Documentación</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="altaAFIP"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Alta AFIP</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          El empleado está dado de alta en AFIP
                        </div>
                      </div>
                      <FormControl>
                        <Input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          disabled={loading}
                          className="h-4 w-4"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fechaAltaAFIP"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha Alta AFIP</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} disabled={loading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notas"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas</FormLabel>
                    <FormControl>
                      <Textarea {...field} disabled={loading} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Guardando..." : isEdit ? "Actualizar" : "Crear Empleado"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
