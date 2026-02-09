"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { DataTable } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";
import { getColumns } from "./columns";
import { UsuarioForm } from "./usuario-form";
import { DeleteUsuarioDialog } from "./delete-usuario-dialog";
import { ResetPasswordDialog } from "./reset-password-dialog";
import type { Usuario } from "./types";

export default function UsuariosPage() {
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

  // Filtros
  const roleActivo = searchParams.get("role") || "todos";

  const fetchUsuarios = async () => {
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
  };

  useEffect(() => {
    fetchUsuarios();
  }, [roleActivo]);

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

  const handleFormSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      const isEdit = !!selectedUsuario;
      const url = isEdit ? `/api/usuarios/${selectedUsuario.id}` : "/api/usuarios";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al guardar usuario");
      }

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
