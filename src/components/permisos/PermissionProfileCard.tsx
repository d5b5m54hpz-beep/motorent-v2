"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type ProfileSummary = {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  _count: { grants: number; users: number };
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

function getProfileColor(name: string): string {
  return PROFILE_COLORS[name] || "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300";
}

export function PermissionProfileCard({ profile, onClick }: { profile: ProfileSummary; onClick?: () => void }) {
  return (
    <Card
      className={cn(
        "transition-colors cursor-pointer hover:border-primary/50",
        onClick && "hover:shadow-md"
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{profile.name}</CardTitle>
          <Badge className={cn("text-xs", getProfileColor(profile.name))}>
            {profile.isSystem ? "Sistema" : "Custom"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {profile.description && (
          <p className="text-sm text-muted-foreground mb-3">{profile.description}</p>
        )}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Shield className="h-4 w-4" />
            {profile._count.grants} operaciones
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {profile._count.users} usuarios
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
