import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Resend from "next-auth/providers/resend";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { authConfig } from "./auth.config";

const MAX_SESSIONS = 2;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

async function createSession(userId: string): Promise<string> {
  const sessionKey = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.activeSession.deleteMany({
    where: { userId, expiresAt: { lt: new Date() } },
  });

  const existing = await prisma.activeSession.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  if (existing.length >= MAX_SESSIONS) {
    const toDelete = existing.slice(0, existing.length - MAX_SESSIONS + 1);
    await prisma.activeSession.deleteMany({
      where: { id: { in: toDelete.map((s) => s.id) } },
    });
  }

  await prisma.activeSession.create({
    data: { userId, sessionKey, expiresAt },
  });

  return sessionKey;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    Resend({
      apiKey: process.env.AUTH_RESEND_KEY,
      from: process.env.EMAIL_FROM ?? "noreply@bussan-checker.com",
      name: "物販チェッカー",
    }),
    Credentials({
      id: "admin-password",
      name: "パスワードログイン",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          const adminPassword = process.env.ADMIN_PASSWORD;
          if (!adminPassword) return null;
          if (!credentials?.email || !credentials?.password) return null;
          if (credentials.password !== adminPassword.trim()) return null;

          const email = credentials.email as string;
          let user = await prisma.user.findUnique({ where: { email } });
          if (!user) {
            user = await prisma.user.create({
              data: { email, name: email.split("@")[0], role: "ADMIN" },
            });
            try {
              await prisma.subscription.create({
                data: { userId: user.id, plan: "FREE", status: "ACTIVE" },
              });
            } catch {
              // already exists
            }
          } else {
            user = await prisma.user.update({
              where: { email },
              data: { role: "ADMIN" },
            });
          }
          return { id: user.id, email: user.email, name: user.name };
        } catch (error) {
          console.error("[auth] authorize error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        try {
          token.sessionKey = await createSession(user.id as string);
        } catch (error) {
          console.error("[auth] createSession error:", error);
          return null; // セッション追跡失敗時は再ログインを強制
        }
      }

      const ROLE_TTL = 5 * 60 * 1000;
      const shouldRefresh =
        !token.roleCheckedAt ||
        Date.now() - (token.roleCheckedAt as number) > ROLE_TTL;

      if (token.id && shouldRefresh) {
        if (token.sessionKey) {
          const activeSession = await prisma.activeSession.findUnique({
            where: { sessionKey: token.sessionKey as string },
          });
          if (!activeSession || activeSession.expiresAt < new Date()) {
            return null;
          }
        }

        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true },
        });
        token.role = dbUser?.role ?? "USER";
        token.roleCheckedAt = Date.now();
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.id && session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as "USER" | "ADMIN") ?? "USER";
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (user.id) {
        try {
          await prisma.subscription.create({
            data: { userId: user.id, plan: "FREE", status: "ACTIVE" },
          });
        } catch {
          // already exists
        }
      }
    },
  },
});
