"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { OperationTree } from "@/components/permisos/OperationTree";
import {
  ArrowLeft,
  Save,
  Loader2,
  Plus,
  Trash2,
  Shield,
  Users,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

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

type GrantState = {
  canView: boolean;
  canCreate: boolean;
  canExecute: boolean;
  canApprove: boolean;
};

type ProfileGrant = {
  id: string;
  operationId: string;
  canView: boolean;
  canCreate: boolean;
  canExecute: boolean;
  canApprove: boolean;
  operation: OperationItem;
};

type AssignedUser = {
  id: string;
  userId: string;
  assignedAt: string;
  user: { id: string; name: string; email: string; role: string; image: string | null };
};

type ProfileDetail = {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  grants: ProfileGrant[];
  users: AssignedUser[];
  _count: { grants: number; users: number };
};

type AllUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export default function ProfileDetailPage() {
  const params = useParams();
  const router = useRouter();
  const profileId = params.id as string;

  // Data
  const [profile, setProfile] = useState<ProfileDetail | null>(null);
  const [operations, setOperations] = useState<OperationItem[]>([]);
  const [allUsers, setAllUsers] = useState<AllUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [grants, setGrants] = useState<Map<string, GrantState>>(new Map());
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // Add user state
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [userComboOpen, setUserComboOpen] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  // Fetch profile detail
  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch(`/api/system/permissions/profiles/${profileId}`);
      if (!res.ok) {
        if (res.status === 404) {
          toast.error("Perfil no encontrado");
          router.push("/admin/permisos");
          return;
        }
        throw new Error("Error fetching profile");
      }
      const data: ProfileDetail = await res.json();
      setProfile(data);
      setEditName(data.name);
      setEditDesc(data.description || "");

      // Build grants map from profile grants (keyed by operation ID)
      const grantMap = new Map<string, GrantState>();
      for (const g of data.grants) {
        grantMap.set(g.operationId, {
          canView: g.canView,
          canCreate: g.canCreate,
          canExecute: g.canExecute,
          canApprove: g.canApprove,
        });
      }
      setGrants(grantMap);
      setIsDirty(false);
    } catch {
      toast.error("Error al cargar perfil");
    }
  }, [profileId, router]);

  // Fetch all operations
  const fetchOperations = useCallback(async () => {
    try {
      const res = await fetch("/api/system/permissions/operations");
      if (res.ok) {
        const data = await res.json();
        setOperations(data.operations || []);
      }
    } catch {
      toast.error("Error al cargar operaciones");
    }
  }, []);

  // Fetch all users
  const fetchAllUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/usuarios?limit=200");
      if (res.ok) {
        const data = await res.json();
        setAllUsers(data.data || []);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchProfile(), fetchOperations(), fetchAllUsers()]).finally(() => {
      setLoading(false);
    });
  }, [fetchProfile, fetchOperations, fetchAllUsers]);

  // Available users (not already assigned to this profile)
  const availableUsers = useMemo(() => {
    if (!profile) return [];
    const assignedIds = new Set(profile.users.map((u) => u.userId));
    return allUsers.filter((u) => !assignedIds.has(u.id));
  }, [allUsers, profile]);

  // Handle toggle single operation permission
  const handleToggle = useCallback(
    (operationId: string, field: keyof GrantState, value: boolean) => {
      setGrants((prev) => {
        const next = new Map(prev);
        const current = next.get(operationId) || {
          canView: false,
          canCreate: false,
          canExecute: false,
          canApprove: false,
        };
        next.set(operationId, { ...current, [field]: value });
        return next;
      });
      setIsDirty(true);
    },
    []
  );

  // Handle toggle all operations in a domain
  const handleToggleDomain = useCallback(
    (family: string, field: keyof GrantState, value: boolean) => {
      setGrants((prev) => {
        const next = new Map(prev);
        const domainOps = operations.filter((op) => op.family === family);
        for (const op of domainOps) {
          const current = next.get(op.id) || {
            canView: false,
            canCreate: false,
            canExecute: false,
            canApprove: false,
          };
          next.set(op.id, { ...current, [field]: value });
        }
        return next;
      });
      setIsDirty(true);
    },
    [operations]
  );

  // Save profile changes
  const handleSave = async () => {
    setSaving(true);
    try {
      // Build grants array (only include operations that have at least one permission)
      const grantsArray = Array.from(grants.entries())
        .filter(([, g]) => g.canView || g.canCreate || g.canExecute || g.canApprove)
        .map(([operationId, g]) => ({
          operationId,
          canView: g.canView,
          canCreate: g.canCreate,
          canExecute: g.canExecute,
          canApprove: g.canApprove,
        }));

      const res = await fetch(`/api/system/permissions/profiles/${profileId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDesc.trim() || null,
          grants: grantsArray,
        }),
      });

      if (res.ok) {
        toast.success("Perfil actualizado exitosamente");
        await fetchProfile();
      } else {
        const data = await res.json();
        toast.error(data.error || "Error al guardar");
      }
    } catch {
      toast.error("Error al guardar cambios");
    } finally {
      setSaving(false);
    }
  };

  // Assign user to profile
  const handleAssignUser = async (userId: string) => {
    try {
      const res = await fetch("/api/system/permissions/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, profileId }),
      });
      if (res.ok) {
        toast.success("Usuario asignado");
        setAddUserOpen(false);
        setUserComboOpen(false);
        await fetchProfile();
      } else {
        const data = await res.json();
        toast.error(data.error || "Error al asignar");
      }
    } catch {
      toast.error("Error al asignar usuario");
    }
  };

  // Remove user from profile
  const handleRemoveUser = async (userId: string) => {
    setRemovingUserId(userId);
    try {
      const res = await fetch("/api/system/permissions/assign", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, profileId }),
      });
      if (res.ok) {
        toast.success("Usuario removido del perfil");
        await fetchProfile();
      } else {
        const data = await res.json();
        toast.error(data.error || "Error al remover");
      }
    } catch {
      toast.error("Error al remover usuario");
    } finally {
      setRemovingUserId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Perfil no encontrado</p>
        <Link href="/admin/permisos">
          <Button variant="outline" className="mt-4">
            Volver a Permisos
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/permisos">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{profile.name}</h1>
            {profile.isSystem && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Sistema
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            {profile._count.grants} operaciones · {profile._count.users} usuarios
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving || !isDirty}>
          {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
          Guardar Cambios
        </Button>
      </div>

      {/* Editable Name/Description */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Información del Perfil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={editName}
                onChange={(e) => {
                  setEditName(e.target.value);
                  setIsDirty(true);
                }}
                disabled={profile.isSystem}
              />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Input
                value={editDesc}
                onChange={(e) => {
                  setEditDesc(e.target.value);
                  setIsDirty(true);
                }}
                placeholder="Descripción del perfil"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Operations Tree with checkboxes */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Operaciones Asignadas
        </h2>
        <OperationTree
          operations={operations}
          grants={grants}
          onToggle={handleToggle}
          onToggleDomain={handleToggleDomain}
        />
      </div>

      <Separator />

      {/* Assigned Users */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Usuarios con este Perfil
          </h2>
          <Popover open={userComboOpen} onOpenChange={setUserComboOpen}>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Agregar Usuario
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <Command>
                <CommandInput placeholder="Buscar usuario..." />
                <CommandList>
                  <CommandEmpty>No se encontraron usuarios</CommandEmpty>
                  <CommandGroup>
                    {availableUsers.map((user) => (
                      <CommandItem
                        key={user.id}
                        value={`${user.name} ${user.email}`}
                        onSelect={() => handleAssignUser(user.id)}
                      >
                        <div>
                          <p className="text-sm font-medium">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {profile.users.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No hay usuarios asignados a este perfil
          </p>
        ) : (
          <div className="border rounded-md divide-y">
            {profile.users.map((assignment) => (
              <div
                key={assignment.id}
                className="flex items-center justify-between p-3"
              >
                <div>
                  <p className="text-sm font-medium">{assignment.user.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {assignment.user.email} · {assignment.user.role}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {new Date(assignment.assignedAt).toLocaleDateString("es-AR")}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleRemoveUser(assignment.userId)}
                    disabled={removingUserId === assignment.userId}
                  >
                    {removingUserId === assignment.userId ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
