export type PermissionProfileRef = {
  id: string;
  name: string;
};

export type Usuario = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "OPERADOR" | "CLIENTE" | "CONTADOR" | "RRHH_MANAGER" | "COMERCIAL" | "VIEWER";
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
  profiles?: {
    profileId: string;
    profile: PermissionProfileRef;
  }[];
};
