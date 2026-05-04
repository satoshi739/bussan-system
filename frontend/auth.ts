import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Resend from "next-auth/providers/resend";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { authConfig } from "./auth.config";

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
        const adminPassword = process.env.ADMIN_PASSWORD;
        if (!adminPassword) return null;
        if (!credentials?.email || !credentials?.password) return null;
        if (credentials.password !== adminPassword) return null;

        const email = credentials.email as string;
        let user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          user = await prisma.user.create({
            data: { email, name: email.split("@")[0], role: "ADMIN" },
          });
          await prisma.subscription.create({
            data: { userId: user.id, plan: "FREE", status: "ACTIVE" },
          });
        } else {
          user = await prisma.user.update({
            where: { email },
            data: { role: "ADMIN" },
          });
        }
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      const ROLE_TTL = 5 * 60 * 1000;
      const shouldRefresh = !token.roleCheckedAt || Date.now() - (token.roleCheckedAt as number) > ROLE_TTL;
      if (token.id && shouldRefresh) {
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
      // 新規ユーザーには自動でフリープランのサブスク行を作成
      if (user.id) {
        await prisma.subscription.create({
          data: {
            userId: user.id,
            plan: "FREE",
            status: "ACTIVE",
          },
        });
      }
    },
  },
});
