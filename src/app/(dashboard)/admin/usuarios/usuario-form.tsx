"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Usuario } from "./types";

// Schema para crear usuario
const createSchema = z.object({
  name: z.string().min(1, "Nombre es requerido"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Contraseña debe tener al menos 6 caracteres"),
  role: z.enum(["ADMIN", "OPERADOR"]),
});

// Schema para editar usuario (password opcional)
const editSchema = z.object({
  name: z.string().min(1, "Nombre es requerido"),
  role: z.enum(["ADMIN", "OPERADOR"]),
  password: z.string().min(6, "Contraseña debe tener al menos 6 caracteres").optional().or(z.literal("")),
});

type CreateFormData = z.infer<typeof createSchema>;
type EditFormData = z.infer<typeof editSchema>;

type Props = {
  usuario: Usuario | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateFormData | EditFormData) => Promise<void>;
  isSubmitting: boolean;
};

export function UsuarioForm({ usuario, open, onOpenChange, onSubmit, isSubmitting }: Props) {
  const isEdit = !!usuario;
  const schema = isEdit ? editSchema : createSchema;

  const form = useForm<CreateFormData | EditFormData>({
    resolver: zodResolver(schema),
    defaultValues: isEdit
      ? {
          name: usuario.name,
          role: usuario.role as "ADMIN" | "OPERADOR",
          password: "",
        }
      : {
          name: "",
          email: "",
          password: "",
          role: "OPERADOR",
        },
  });

  // Reset form when usuario changes
  useEffect(() => {
    if (isEdit && usuario) {
      form.reset({
        name: usuario.name,
        role: usuario.role as "ADMIN" | "OPERADOR",
        password: "",
      });
    } else {
      form.reset({
        name: "",
        email: "",
        password: "",
        role: "OPERADOR",
      });
    }
  }, [usuario, isEdit, form]);

  const handleSubmit = async (data: CreateFormData | EditFormData) => {
    // Si es edición y password está vacío, no enviarlo
    if (isEdit && "password" in data && !data.password) {
      const { password, ...rest } = data;
      await onSubmit(rest as EditFormData);
    } else {
      await onSubmit(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Usuario" : "Crear Usuario"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Modifica los datos del usuario. Deja la contraseña vacía si no deseas cambiarla."
              : "Completa el formulario para crear un nuevo usuario administrador u operador."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Juan Pérez" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isEdit && (
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="juan@ejemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rol</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un rol" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ADMIN">ADMIN</SelectItem>
                      <SelectItem value="OPERADOR">OPERADOR</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Contraseña {isEdit && <span className="text-muted-foreground">(opcional)</span>}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder={isEdit ? "Dejar vacío para no cambiar" : "Mínimo 6 caracteres"}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Guardando..." : isEdit ? "Actualizar" : "Crear Usuario"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
