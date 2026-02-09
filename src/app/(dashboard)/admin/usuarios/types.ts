export type Usuario = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "OPERADOR" | "CLIENTE";
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
};
