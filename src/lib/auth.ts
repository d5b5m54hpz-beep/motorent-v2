import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";

// Emails that get ADMIN role on OAuth signup
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "").split(",").filter(Boolean);

const config = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user?.password) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, account, profile }) {
      // OAuth sign-in: upsert user
      if (account && profile) {
        const email = (profile as Record<string, unknown>).email as string;
        const name = ((profile as Record<string, unknown>).name as string) ?? email;
        const image = (profile as Record<string, unknown>).picture as string | undefined;

        if (email) {
          const role = ADMIN_EMAILS.includes(email) ? Role.ADMIN : Role.CLIENTE;

          const upserted = await prisma.user.upsert({
            where: { email },
            update: { name, image, provider: account.provider },
            create: { email, name, image, provider: account.provider, role },
          });

          token.role = upserted.role;
          token.userId = upserted.id;
        }
      }

      // Credentials sign-in
      if (user) {
        token.role = (user as { role: Role }).role;
        token.userId = (user as { id: string }).id;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as Role;
        session.user.id = token.userId as string;
      }
      return session;
    },
  },

  events: {
    async signIn({ user }) {
      // Auto-create Cliente for CLIENTE role users
      if (!user.id) return;
      const u = await prisma.user.findUnique({ where: { id: user.id } });
      if (u && u.role === Role.CLIENTE) {
        const exists = await prisma.cliente.findUnique({ where: { userId: u.id } });
        if (!exists) {
          await prisma.cliente.create({
            data: {
              userId: u.id,
              nombre: u.name,
              email: u.email,
              telefono: u.phone,
            },
          });
        }
      }
    },
  },

  pages: {
    signIn: "/login",
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(config);
