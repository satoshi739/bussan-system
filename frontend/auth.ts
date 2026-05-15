import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Resend from "next-auth/providers/resend";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { prismaAuth } from "@/lib/prisma-auth";
import { sendOnboardingWelcome } from "@/lib/email";
import { authConfig } from "./auth.config";

const MAX_SESSIONS = 2;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

async function createSession(userId: string): Promise<string> {
  const sessionKey = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  // prisma.activeSession が未初期化の場合は session key だけ返す（DBエラー時のフォールバック）
  if (!prisma.activeSession) {
    console.warn("[auth] activeSession model unavailable — skipping session tracking");
    return sessionKey;
  }

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
  adapter: PrismaAdapter(prismaAuth),
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
          if (!credentials?.email || !credentials?.password) return null;
          const email = credentials.email as string;
          const password = credentials.password as string;

          const user = await prisma.user.findUnique({ where: { email } });

          // ユーザーごとのパスワード認証
          if (user?.passwordHash) {
            const valid = await bcrypt.compare(password, user.passwordHash);
            if (!valid) return null;
            return { id: user.id, email: user.email, name: user.name };
          }

          // 管理者パスワード認証（フォールバック）
          const adminPassword = process.env.ADMIN_PASSWORD;
          if (!adminPassword) return null;
          if (password !== adminPassword.trim()) return null;

          if (!user) {
            const newUser = await prisma.user.create({
              data: { email, name: email.split("@")[0], role: "ADMIN" },
            });
            try {
              await prisma.subscription.create({
                data: { userId: newUser.id, plan: "FREE", status: "ACTIVE" },
              });
            } catch { /* already exists */ }
            // Credentials経由ではNextAuthのcreateUserイベントが発火しないため、ここで明示的に送る
            try {
              await sendOnboardingWelcome({ to: newUser.email, userName: newUser.name });
            } catch (error) {
              console.error("[auth] sendOnboardingWelcome (credentials) failed:", error);
            }
            return { id: newUser.id, email: newUser.email, name: newUser.name };
          }

          await prisma.user.update({ where: { email }, data: { role: "ADMIN" } });
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
          // セッション追跡失敗でもログインは許可（DBエラー時フォールバック）
        }
      }

      const ROLE_TTL = 5 * 60 * 1000;
      const shouldRefresh =
        !token.roleCheckedAt ||
        Date.now() - (token.roleCheckedAt as number) > ROLE_TTL;

      if (token.id && shouldRefresh) {
        try {
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
        } catch (error) {
          // Neon cold start や一時的な DB エラーで 500 を返すと全ページが落ちるため、
          // 既存トークンを維持してログインを継続する。roleCheckedAt を更新しないので
          // 次のリクエストで自動的に再試行される。
          console.error("[auth] jwt refresh failed (DB unavailable, keeping token):", error);
        }
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
      // オンボメール送信（失敗してもユーザー登録は止めない）
      if (user.email) {
        try {
          await sendOnboardingWelcome({ to: user.email, userName: user.name });
        } catch (error) {
          console.error("[auth] sendOnboardingWelcome failed:", error);
        }
      }
    },
  },
});
