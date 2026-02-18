"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { PermissionProfileCard } from "@/components/permisos/PermissionProfileCard";
import { OperationTree } from "@/components/permisos/OperationTree";
import { UserPermissionBadges } from "@/components/permisos/UserPermissionBadges";
import { Shield, Plus, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

// Types
type ProfileSummary = {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  _count: { grants: number; users: number };
};

type OperationItem = {
  id: string;
  code: string;
  family: string;
  entity: string;
  action: string;
  description: string;
  requiresApproval: boolean;
  isViewOnly: boolean;
};

type UserItem = {
  id: string;
  name: string;
  email: string;
  role: string;
  image: string | null;
  createdAt: string;
  profiles?: Array<{
    profileId: string;
    profile: { id: string; name: string };
  }>;
};

export default function PermisosPage() {
  const router = useRouter();

  // Data states
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [operations, setOperations] = useState<OperationItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [loadingOps, setLoadingOps] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Create profile dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);

  // Filters
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("todos");
  const [userProfileFilter, setUserProfileFilter] = useState("todos");

  // Fetch profiles
  const fetchProfiles = useCallback(async () => {
    setLoadingProfiles(true);
    try {
      const res = await fetch("/api/system/permissions/profiles");
      if (res.ok) {
        const data = await res.json();
        setProfiles(data);
      }
    } catch {
      toast.error("Error al cargar perfiles");
    } finally {
      setLoadingProfiles(false);
    }
  }, []);

  // Fetch operations
  const fetchOperations = useCallback(async () => {
    setLoadingOps(true);
    try {
      const res = await fetch("/api/system/permissions/operations");
      if (res.ok) {
        const data = await res.json();
        setOperations(data.operations || []);
      }
    } catch {
      toast.error("Error al cargar operaciones");
    } finally {
      setLoadingOps(false);
    }
  }, []);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch("/api/usuarios?limit=200");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.data || []);
      }
    } catch {
      toast.error("Error al cargar usuarios");
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
    fetchOperations();
    fetchUsers();
  }, [fetchProfiles, fetchOperations, fetchUsers]);

  // Create profile handler
  const handleCreateProfile = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/system/permissions/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() || undefined }),
      });
      if (res.ok) {
        toast.success("Perfil creado exitosamente");
        setCreateOpen(false);
        setNewName("");
        setNewDesc("");
        fetchProfiles();
      } else {
        const data = await res.json();
        toast.error(data.error || "Error al crear perfil");
      }
    } catch {
      toast.error("Error al crear perfil");
    } finally {
      setCreating(false);
    }
  };

  // Filter users
  const filteredUsers = users.filter((u) => {
    if (userRoleFilter !== "todos" && u.role !== userRoleFilter) return false;
    if (
      userProfileFilter !== "todos" &&
      !u.profiles?.some((pp) => pp.profile.id === userProfileFilter)
    )
      return false;
    if (
      userSearch &&
      !u.name?.toLowerCase().includes(userSearch.toLowerCase()) &&
      !u.email?.toLowerCase().includes(userSearch.toLowerCase())
    )
      return false;
    return true;
  });

  const ROLE_LABELS: Record<string, string> = {
    ADMIN: "Admin",
    OPERADOR: "Operador",
    CONTADOR: "Contador",
    RRHH_MANAGER: "RRHH",
    COMERCIAL: "Comercial",
    VIEWER: "Viewer",
  };

  const ROLE_COLORS: Record<string, string> = {
    ADMIN: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    OPERADOR: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    CONTADOR: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    RRHH_MANAGER: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    COMERCIAL: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
    VIEWER: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Shield className="h-6 w-6" />
          Gestion de Permisos
        </h1>
        <p className="text-muted-foreground">
          Administra perfiles de permisos, asignaciones de usuarios y operaciones del sistema
        </p>
      </div>

      <Tabs defaultValue="perfiles" className="space-y-4">
        <TabsList>
          <TabsTrigger value="perfiles">Perfiles</TabsTrigger>
          <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
          <TabsTrigger value="operaciones">Operaciones</TabsTrigger>
        </TabsList>

        {/* TAB 1: Perfiles */}
        <TabsContent value="perfiles" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {profiles.length} perfiles configurados
            </p>
            <Button onClick={() => setCreateOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Crear Perfil
            </Button>
          </div>

          {loadingProfiles ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {profiles.map((profile) => (
                <PermissionProfileCard
                  key={profile.id}
                  profile={profile}
                  onClick={() => router.push(`/admin/permisos/perfiles/${profile.id}`)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* TAB 2: Usuarios */}
        <TabsContent value="usuarios" className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar usuario..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={userRoleFilter}
              onChange={(e) => setUserRoleFilter(e.target.value)}
            >
              <option value="todos">Todos los roles</option>
              {Object.entries(ROLE_LABELS).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={userProfileFilter}
              onChange={(e) => setUserProfileFilter(e.target.value)}
            >
              <option value="todos">Todos los perfiles</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {loadingUsers ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : (
            <div className="border rounded-md">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 text-sm font-medium">Usuario</th>
                    <th className="text-left p-3 text-sm font-medium">Email</th>
                    <th className="text-left p-3 text-sm font-medium">Rol</th>
                    <th className="text-left p-3 text-sm font-medium">Perfiles</th>
                    <th className="text-left p-3 text-sm font-medium">Registro</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => router.push(`/admin/permisos/usuarios/${user.id}`)}
                    >
                      <td className="p-3 text-sm font-medium">{user.name || "\u2014"}</td>
                      <td className="p-3 text-sm text-muted-foreground">{user.email}</td>
                      <td className="p-3">
                        <Badge
                          variant="secondary"
                          className={ROLE_COLORS[user.role] || ""}
                        >
                          {ROLE_LABELS[user.role] || user.role}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <UserPermissionBadges
                          profiles={
                            user.profiles?.map((pp) => ({
                              id: pp.profile.id,
                              name: pp.profile.name,
                            })) || []
                          }
                        />
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString("es-AR")}
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-muted-foreground">
                        No se encontraron usuarios
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* TAB 3: Operaciones */}
        <TabsContent value="operaciones" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {operations.length} operaciones registradas en el sistema. Solo lectura — las
            operaciones se definen en codigo.
          </p>
          {loadingOps ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : (
            <OperationTree operations={operations} readOnly />
          )}
        </TabsContent>
      </Tabs>

      {/* Create Profile Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Perfil de Permisos</DialogTitle>
            <DialogDescription>
              Crea un nuevo perfil y luego asignale operaciones y usuarios.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="profile-name">Nombre</Label>
              <Input
                id="profile-name"
                placeholder="Ej: Supervisor de Flota"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-desc">Descripcion</Label>
              <Input
                id="profile-desc"
                placeholder="Descripcion opcional del perfil"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateProfile} disabled={creating || !newName.trim()}>
              {creating && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Crear Perfil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
