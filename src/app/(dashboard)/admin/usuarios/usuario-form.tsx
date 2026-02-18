"use client";

import { useEffect, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import type { Usuario, PermissionProfileRef } from "./types";

const ALL_ROLES = ["ADMIN", "OPERADOR", "CONTADOR", "RRHH_MANAGER", "COMERCIAL", "VIEWER"] as const;

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  OPERADOR: "Operador",
  CONTADOR: "Contador",
  RRHH_MANAGER: "RRHH Manager",
  COMERCIAL: "Comercial",
  VIEWER: "Visualizador",
};

// Schema para crear usuario
const createSchema = z.object({
  name: z.string().min(1, "Nombre es requerido"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Contraseña debe tener al menos 6 caracteres"),
  role: z.enum(ALL_ROLES),
  profileIds: z.array(z.string()).optional(),
});

// Schema para editar usuario (password opcional)
const editSchema = z.object({
  name: z.string().min(1, "Nombre es requerido"),
  role: z.enum(ALL_ROLES),
  password: z.string().min(6, "Contraseña debe tener al menos 6 caracteres").optional().or(z.literal("")),
  profileIds: z.array(z.string()).optional(),
});

type CreateFormData = z.infer<typeof createSchema>;
type EditFormData = z.infer<typeof editSchema>;

type PermissionProfile = {
  id: string;
  name: string;
  description: string | null;
  _count?: { grants: number; users: number };
};

type Props = {
  usuario: Usuario | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: (CreateFormData | EditFormData) & { profileIds?: string[] }) => Promise<void>;
  isSubmitting: boolean;
};

export function UsuarioForm({ usuario, open, onOpenChange, onSubmit, isSubmitting }: Props) {
  const isEdit = !!usuario;
  const schema = isEdit ? editSchema : createSchema;

  const [profiles, setProfiles] = useState<PermissionProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);

  const form = useForm<CreateFormData | EditFormData>({
    resolver: zodResolver(schema),
    defaultValues: isEdit
      ? {
          name: usuario.name,
          role: usuario.role as (typeof ALL_ROLES)[number],
          password: "",
          profileIds: usuario.profiles?.map((p) => p.profile.id) || [],
        }
      : {
          name: "",
          email: "",
          password: "",
          role: "OPERADOR",
          profileIds: [],
        },
  });

  // Fetch permission profiles
  useEffect(() => {
    if (!open) return;
    setLoadingProfiles(true);
    fetch("/api/system/permissions/profiles")
      .then((res) => {
        if (!res.ok) throw new Error("Error loading profiles");
        return res.json();
      })
      .then((data) => setProfiles(data))
      .catch((err) => console.error("Error fetching profiles:", err))
      .finally(() => setLoadingProfiles(false));
  }, [open]);

  // Reset form when usuario changes
  useEffect(() => {
    if (isEdit && usuario) {
      form.reset({
        name: usuario.name,
        role: usuario.role as (typeof ALL_ROLES)[number],
        password: "",
        profileIds: usuario.profiles?.map((p) => p.profile.id) || [],
      });
    } else {
      form.reset({
        name: "",
        email: "",
        password: "",
        role: "OPERADOR",
        profileIds: [],
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

  const selectedProfileIds: string[] = (form.watch("profileIds") as string[]) || [];

  const toggleProfile = (profileId: string) => {
    const current = selectedProfileIds;
    const updated = current.includes(profileId)
      ? current.filter((id) => id !== profileId)
      : [...current, profileId];
    form.setValue("profileIds", updated, { shouldDirty: true });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Usuario" : "Crear Usuario"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Modifica los datos del usuario. Deja la contraseña vacía si no deseas cambiarla."
              : "Completa el formulario para crear un nuevo usuario."}
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
                      {ALL_ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {ROLE_LABELS[role] || role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Permission Profiles Multi-Select */}
            <FormItem>
              <FormLabel>Perfiles de Permisos</FormLabel>
              {loadingProfiles ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cargando perfiles...
                </div>
              ) : profiles.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  No hay perfiles de permisos configurados.
                </p>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-md border p-3 space-y-2 max-h-48 overflow-y-auto">
                    {profiles.map((profile) => (
                      <label
                        key={profile.id}
                        className="flex items-start gap-3 cursor-pointer rounded-sm p-1 hover:bg-muted/50"
                      >
                        <Checkbox
                          checked={selectedProfileIds.includes(profile.id)}
                          onCheckedChange={() => toggleProfile(profile.id)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium leading-none">
                            {profile.name}
                          </span>
                          {profile.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {profile.description}
                            </p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>

                  {/* Show selected profiles as badges */}
                  {selectedProfileIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedProfileIds.map((id) => {
                        const profile = profiles.find((p) => p.id === id);
                        if (!profile) return null;
                        return (
                          <Badge
                            key={id}
                            variant="secondary"
                            className="cursor-pointer"
                            onClick={() => toggleProfile(id)}
                          >
                            {profile.name}
                            <span className="ml-1 text-muted-foreground">&times;</span>
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </FormItem>

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
