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
        console.log("[authorize] Attempt:", credentials?.email);

        if (!credentials?.email || !credentials?.password) {
          console.log("[authorize] Missing credentials");
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        console.log("[authorize] User found:", !!user, "Has password:", !!user?.password, "Role:", user?.role);

        if (!user?.password) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        console.log("[authorize] Password valid:", valid);

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
    async redirect({ url, baseUrl }) {
      // If the url is relative, prefix it with baseUrl
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // If same origin, allow it
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },

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
            update: {
              name,
              image,
              provider: account.provider,
              // FIX: Assign role to existing users without role
              role: role
            },
            create: { email, name, image, provider: account.provider, role },
          });

          token.role = upserted.role;
          token.userId = upserted.id;

          // Auto-create Cliente if doesn't exist
          const existingCliente = await prisma.cliente.findUnique({
            where: { userId: upserted.id },
          });

          if (!existingCliente) {
            await prisma.cliente.create({
              data: {
                userId: upserted.id,
                nombre: upserted.name,
                email: upserted.email,
              },
            });
            console.log("✅ Cliente auto-created for user:", upserted.email);
          }
        }
      }

      // Credentials sign-in
      if (user) {
        token.role = (user as { role: Role }).role;
        token.userId = (user as { id: string }).id;

        // Auto-create Cliente for credentials users too
        if ((user as { role: Role }).role === Role.CLIENTE) {
          const existingCliente = await prisma.cliente.findUnique({
            where: { userId: (user as { id: string }).id },
          });
          if (!existingCliente) {
            await prisma.cliente.create({
              data: {
                userId: (user as { id: string }).id,
                nombre: (user as { name: string }).name || "",
                email: (user as { email: string }).email || "",
              },
            });
          }
        }
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

  pages: {
    signIn: "/login",
  },

  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  trustHost: true,
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(config);
