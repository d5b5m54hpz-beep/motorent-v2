"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
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
import { EffectivePermissions } from "@/components/permisos/EffectivePermissions";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  Shield,
  Activity,
  User as UserIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type UserDetail = {
  id: string;
  name: string;
  email: string;
  role: string;
  image: string | null;
  createdAt: string;
  updatedAt: string;
  profiles?: Array<{
    profileId: string;
    profile: { id: string; name: string };
  }>;
};

type PermissionData = {
  canView: boolean;
  canCreate: boolean;
  canExecute: boolean;
  canApprove: boolean;
  grantedBy: string[];
};

type ProfileSummary = {
  id: string;
  name: string;
  description: string | null;
  _count: { grants: number; users: number };
};

type EventItem = {
  id: string;
  operationId: string;
  entityType: string;
  entityId: string;
  status: string;
  createdAt: string;
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  OPERADOR: "Operador",
  CONTADOR: "Contador",
  RRHH_MANAGER: "RRHH Manager",
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

const PROFILE_COLORS: Record<string, string> = {
  "Administrador": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  "Contador": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  "Operador Flota": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  "Operador Comercial": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
  "RRHH": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  "Auditor": "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  "Viewer": "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
};

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  FAILED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  PROCESSING: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
};

export default function UserPermissionsPage() {
  const params = useParams();
  const userId = params.id as string;

  // Data
  const [user, setUser] = useState<UserDetail | null>(null);
  const [permissions, setPermissions] = useState<Record<string, PermissionData>>({});
  const [allProfiles, setAllProfiles] = useState<ProfileSummary[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  // UI state
  const [profileComboOpen, setProfileComboOpen] = useState(false);
  const [removingProfileId, setRemovingProfileId] = useState<string | null>(null);

  // Fetch user detail
  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch(`/api/usuarios/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      }
    } catch {
      toast.error("Error al cargar usuario");
    }
  }, [userId]);

  // Fetch effective permissions
  const fetchPermissions = useCallback(async () => {
    try {
      const res = await fetch(`/api/system/permissions/check?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setPermissions(data.permissions || {});
      }
    } catch {
      toast.error("Error al cargar permisos");
    }
  }, [userId]);

  // Fetch all profiles (for the add combobox)
  const fetchProfiles = useCallback(async () => {
    try {
      const res = await fetch("/api/system/permissions/profiles");
      if (res.ok) {
        const data = await res.json();
        setAllProfiles(data);
      }
    } catch {
      // ignore
    }
  }, []);

  // Fetch recent events
  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch(`/api/monitor/eventos?userId=${userId}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch {
      // ignore - events are optional
    }
  }, [userId]);

  useEffect(() => {
    Promise.all([fetchUser(), fetchPermissions(), fetchProfiles(), fetchEvents()]).finally(
      () => setLoading(false)
    );
  }, [fetchUser, fetchPermissions, fetchProfiles, fetchEvents]);

  // Convert permissions to array for EffectivePermissions component
  const effectivePermsList = useMemo(() => {
    return Object.entries(permissions).map(([code, perm]) => ({
      code,
      canView: perm.canView,
      canCreate: perm.canCreate,
      canExecute: perm.canExecute,
      canApprove: perm.canApprove,
      grantedBy: perm.grantedBy || [],
    }));
  }, [permissions]);

  // Assigned profile IDs from user data (if user loaded via usuarios/[id])
  // We derive from permissions grantedBy + allProfiles to get the user's profiles
  const userProfileNames = useMemo(() => {
    const names = new Set<string>();
    for (const perm of Object.values(permissions)) {
      for (const name of perm.grantedBy || []) {
        names.add(name);
      }
    }
    return Array.from(names);
  }, [permissions]);

  const userProfiles = useMemo(() => {
    return allProfiles.filter((p) => userProfileNames.includes(p.name));
  }, [allProfiles, userProfileNames]);

  const availableProfiles = useMemo(() => {
    return allProfiles.filter((p) => !userProfileNames.includes(p.name));
  }, [allProfiles, userProfileNames]);

  // Assign profile
  const handleAssignProfile = async (profileId: string) => {
    try {
      const res = await fetch("/api/system/permissions/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, profileId }),
      });
      if (res.ok) {
        toast.success("Perfil asignado exitosamente");
        setProfileComboOpen(false);
        await Promise.all([fetchUser(), fetchPermissions()]);
      } else {
        const data = await res.json();
        toast.error(data.error || "Error al asignar perfil");
      }
    } catch {
      toast.error("Error al asignar perfil");
    }
  };

  // Remove profile
  const handleRemoveProfile = async (profileId: string) => {
    setRemovingProfileId(profileId);
    try {
      const res = await fetch("/api/system/permissions/assign", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, profileId }),
      });
      if (res.ok) {
        toast.success("Perfil removido");
        await Promise.all([fetchUser(), fetchPermissions()]);
      } else {
        const data = await res.json();
        toast.error(data.error || "Error al remover perfil");
      }
    } catch {
      toast.error("Error al remover perfil");
    } finally {
      setRemovingProfileId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-[300px]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Usuario no encontrado</p>
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
            <UserIcon className="h-6 w-6" />
            <h1 className="text-2xl font-bold tracking-tight">{user.name}</h1>
            <Badge className={cn(ROLE_COLORS[user.role] || "")}>
              {ROLE_LABELS[user.role] || user.role}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {user.email} · Registro: {new Date(user.createdAt).toLocaleDateString("es-AR")}
          </p>
        </div>
      </div>

      {/* Section 1: Assigned Profiles */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Perfiles Asignados
            </CardTitle>
            <Popover open={profileComboOpen} onOpenChange={setProfileComboOpen}>
              <PopoverTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar Perfil
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <Command>
                  <CommandInput placeholder="Buscar perfil..." />
                  <CommandList>
                    <CommandEmpty>No hay perfiles disponibles</CommandEmpty>
                    <CommandGroup>
                      {availableProfiles.map((profile) => (
                        <CommandItem
                          key={profile.id}
                          value={profile.name}
                          onSelect={() => handleAssignProfile(profile.id)}
                        >
                          <div>
                            <p className="text-sm font-medium">{profile.name}</p>
                            {profile.description && (
                              <p className="text-xs text-muted-foreground">{profile.description}</p>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        <CardContent>
          {userProfiles.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Este usuario no tiene perfiles asignados
            </p>
          ) : (
            <div className="space-y-2">
              {userProfiles.map((profile) => (
                <div
                  key={profile.id}
                  className="flex items-center justify-between p-3 border rounded-md"
                >
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="secondary"
                      className={cn(
                        PROFILE_COLORS[profile.name] || "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300"
                      )}
                    >
                      {profile.name}
                    </Badge>
                    {profile.description && (
                      <span className="text-sm text-muted-foreground">{profile.description}</span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {profile._count.grants} operaciones
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleRemoveProfile(profile.id)}
                    disabled={removingProfileId === profile.id}
                  >
                    {removingProfileId === profile.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Section 2: Effective Permissions */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Permisos Efectivos
        </h2>
        <p className="text-sm text-muted-foreground mb-3">
          Vista combinada de todos los permisos otorgados por los perfiles asignados.
          {user.role === "ADMIN" && (
            <span className="ml-1 font-medium text-amber-600 dark:text-amber-400">
              Este usuario es ADMIN y tiene acceso completo por defecto.
            </span>
          )}
        </p>
        <EffectivePermissions permissions={effectivePermsList} />
      </div>

      <Separator />

      {/* Section 3: Recent Activity */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Actividad Reciente
        </h2>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay actividad registrada</p>
        ) : (
          <div className="border rounded-md">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 text-sm font-medium">Operación</th>
                  <th className="text-left p-3 text-sm font-medium">Entidad</th>
                  <th className="text-left p-3 text-sm font-medium">Estado</th>
                  <th className="text-left p-3 text-sm font-medium">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} className="border-b">
                    <td className="p-3 text-sm font-mono">{event.operationId}</td>
                    <td className="p-3 text-sm">
                      {event.entityType}
                      {event.entityId && (
                        <span className="text-muted-foreground ml-1 text-xs">
                          #{event.entityId.slice(0, 8)}
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <Badge
                        variant="secondary"
                        className={cn("text-xs", STATUS_COLORS[event.status] || "")}
                      >
                        {event.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {new Date(event.createdAt).toLocaleString("es-AR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
