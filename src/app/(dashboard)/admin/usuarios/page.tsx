"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { DataTable } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Loader2 } from "lucide-react";
import { getColumns } from "./columns";
import { UsuarioForm } from "./usuario-form";
import { DeleteUsuarioDialog } from "./delete-usuario-dialog";
import { ResetPasswordDialog } from "./reset-password-dialog";
import type { Usuario } from "./types";

/**
 * Determine the legacy role based on assigned permission profile names.
 * Higher-access profiles take priority.
 */
function resolveRoleFromProfiles(
  profileNames: string[],
  currentRole: string
): string {
  const lower = profileNames.map((n) => n.toLowerCase());

  if (lower.some((n) => n.includes("administrador"))) return "ADMIN";
  if (lower.some((n) => n.includes("operador"))) return "OPERADOR";
  if (lower.some((n) => n.includes("contador"))) return "CONTADOR";
  if (lower.some((n) => n.includes("rrhh") || n.includes("recursos humanos"))) return "RRHH_MANAGER";
  if (lower.some((n) => n.includes("comercial"))) return "COMERCIAL";
  if (lower.some((n) => n.includes("visualizador") || n.includes("viewer") || n.includes("solo lectura"))) return "VIEWER";

  return currentRole;
}

type PermissionProfile = {
  id: string;
  name: string;
  description: string | null;
};

function UsuariosContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUsuario, setSelectedUsuario] = useState<Usuario | null>(null);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Cache of profiles for role sync
  const [allProfiles, setAllProfiles] = useState<PermissionProfile[]>([]);

  // Filtros
  const roleActivo = searchParams.get("role") || "todos";

  const fetchUsuarios = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "100");

      if (roleActivo !== "todos") {
        params.set("role", roleActivo);
      }

      const res = await fetch(`/api/usuarios?${params.toString()}`);

      if (!res.ok) {
        throw new Error("Error al cargar usuarios");
      }

      const data = await res.json();
      setUsuarios(data.data || []);
    } catch (error) {
      console.error("Error fetching usuarios:", error);
      toast.error("Error al cargar usuarios");
    } finally {
      setLoading(false);
    }
  }, [roleActivo]);

  useEffect(() => {
    fetchUsuarios();
  }, [fetchUsuarios]);

  // Fetch profiles once for role sync
  useEffect(() => {
    fetch("/api/system/permissions/profiles")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setAllProfiles(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const handleRoleChange = (role: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (role === "todos") {
      params.delete("role");
    } else {
      params.set("role", role);
    }
    router.push(`/admin/usuarios?${params.toString()}`);
  };

  const handleCreate = () => {
    setSelectedUsuario(null);
    setFormDialogOpen(true);
  };

  const handleEdit = (usuario: Usuario) => {
    setSelectedUsuario(usuario);
    setFormDialogOpen(true);
  };

  const handleDelete = (usuario: Usuario) => {
    setSelectedUsuario(usuario);
    setDeleteDialogOpen(true);
  };

  const handleResetPassword = (usuario: Usuario) => {
    setSelectedUsuario(usuario);
    setResetPasswordDialogOpen(true);
  };

  /**
   * Sync permission profile assignments for a user.
   * Adds newly selected profiles and removes deselected ones.
   */
  async function syncProfileAssignments(
    userId: string,
    newProfileIds: string[],
    existingProfileIds: string[]
  ) {
    const toAdd = newProfileIds.filter((id) => !existingProfileIds.includes(id));
    const toRemove = existingProfileIds.filter((id) => !newProfileIds.includes(id));

    const promises: Promise<Response>[] = [];

    for (const profileId of toAdd) {
      promises.push(
        fetch("/api/system/permissions/assign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, profileId }),
        })
      );
    }

    for (const profileId of toRemove) {
      promises.push(
        fetch("/api/system/permissions/assign", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, profileId }),
        })
      );
    }

    if (promises.length > 0) {
      await Promise.all(promises);
    }
  }

  const handleFormSubmit = async (data: Record<string, unknown>) => {
    setIsSubmitting(true);
    try {
      const isEdit = !!selectedUsuario;
      const profileIds = (data.profileIds as string[]) || [];

      // Resolve role from selected profiles
      const profileNames = profileIds
        .map((id) => allProfiles.find((p) => p.id === id)?.name)
        .filter(Boolean) as string[];

      const baseRole = (data.role as string) || (isEdit ? selectedUsuario!.role : "OPERADOR");
      const syncedRole = profileIds.length > 0
        ? resolveRoleFromProfiles(profileNames, baseRole)
        : baseRole;

      // Build user payload (without profileIds)
      const { profileIds: _removed, ...userData } = data;
      const userPayload = { ...userData, role: syncedRole };

      const url = isEdit ? `/api/usuarios/${selectedUsuario!.id}` : "/api/usuarios";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userPayload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al guardar usuario");
      }

      const savedUser = await res.json();
      const userId = savedUser.id;

      // Sync profile assignments
      const existingProfileIds = isEdit
        ? (selectedUsuario!.profiles || []).map((p) => p.profile.id)
        : [];

      await syncProfileAssignments(userId, profileIds, existingProfileIds);

      toast.success(isEdit ? "Usuario actualizado correctamente" : "Usuario creado correctamente");
      setFormDialogOpen(false);
      fetchUsuarios();
    } catch (error) {
      console.error("Error saving usuario:", error);
      const message = error instanceof Error ? error.message : "Error al guardar usuario";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedUsuario) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/usuarios/${selectedUsuario.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al eliminar usuario");
      }

      toast.success("Usuario eliminado correctamente");
      setDeleteDialogOpen(false);
      fetchUsuarios();
    } catch (error) {
      console.error("Error deleting usuario:", error);
      const message = error instanceof Error ? error.message : "Error al eliminar usuario";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleResetPasswordSubmit = async (data: { password: string }) => {
    if (!selectedUsuario) return;

    setIsResettingPassword(true);
    try {
      const res = await fetch(`/api/usuarios/${selectedUsuario.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: data.password }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al resetear contraseña");
      }

      toast.success("Contraseña reseteada correctamente");
      setResetPasswordDialogOpen(false);
    } catch (error) {
      console.error("Error resetting password:", error);
      const message = error instanceof Error ? error.message : "Error al resetear contraseña";
      toast.error(message);
    } finally {
      setIsResettingPassword(false);
    }
  };

  const columns = getColumns({
    onEdit: handleEdit,
    onResetPassword: handleResetPassword,
    onDelete: handleDelete,
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Usuarios</h1>
          <p className="text-sm text-muted-foreground">
            Gestión de administradores y operadores del sistema
          </p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Crear Usuario
        </Button>
      </div>

      {/* Filtros por Rol */}
      <div className="flex items-center gap-4">
        <Tabs value={roleActivo} onValueChange={handleRoleChange}>
          <TabsList>
            <TabsTrigger value="todos">Todos</TabsTrigger>
            <TabsTrigger value="ADMIN">Administradores</TabsTrigger>
            <TabsTrigger value="OPERADOR">Operadores</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="ml-auto text-sm text-muted-foreground">
          {usuarios.length} usuario{usuarios.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={usuarios}
        searchKey="name"
        searchPlaceholder="Buscar por nombre o email..."
        emptyMessage="No se encontraron usuarios"
        isLoading={loading}
      />

      {/* Form Dialog */}
      <UsuarioForm
        usuario={selectedUsuario}
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        onSubmit={handleFormSubmit}
        isSubmitting={isSubmitting}
      />

      {/* Delete Dialog */}
      <DeleteUsuarioDialog
        usuario={selectedUsuario}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />

      {/* Reset Password Dialog */}
      <ResetPasswordDialog
        usuario={selectedUsuario}
        open={resetPasswordDialogOpen}
        onOpenChange={setResetPasswordDialogOpen}
        onSubmit={handleResetPasswordSubmit}
        isSubmitting={isResettingPassword}
      />
    </div>
  );
}

export default function UsuariosPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
      <UsuariosContent />
    </Suspense>
  );
}
