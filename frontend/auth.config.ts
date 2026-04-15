import type { NextAuthConfig } from "next-auth";

const PUBLIC_PATHS = ["/login", "/pricing", "/api/auth", "/api/stripe/webhook"];

/**
 * Edge Runtime でも動くライトウェイトな設定
 * - adapter なし（Prisma を使わない）
 * - providers は空（ミドルウェアでは認証処理しない）
 */
export const authConfig = {
  pages: {
    signIn: "/login",
    verifyRequest: "/login/verify",
    error: "/login?error=true",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isPublic = PUBLIC_PATHS.some((p) => nextUrl.pathname.startsWith(p));

      if (isPublic) return true;
      if (!isLoggedIn) {
        const loginUrl = new URL("/login", nextUrl);
        loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
        return Response.redirect(loginUrl);
      }
      return true;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
