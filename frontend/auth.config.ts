import type { NextAuthConfig } from "next-auth";

const PUBLIC_PATHS = ["/login", "/pricing", "/deals", "/api/auth", "/api/stripe/webhook"];

/**
 * Edge Runtime でも動くライトウェイトな設定
 * - adapter なし（Prisma を使わない）
 * - providers は空（ミドルウェアでは認証処理しない）
 */
export const authConfig = {
  pages: {
    signIn: "/login",
    verifyRequest: "/login/verify",
    error: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isPublic = PUBLIC_PATHS.some((p) => nextUrl.pathname.startsWith(p));

      if (process.env.NODE_ENV === "development" && process.env.SKIP_AUTH === "true") {
        // ログインページにいたらダッシュボードへ
        if (nextUrl.pathname.startsWith("/login")) {
          return Response.redirect(new URL("/", nextUrl));
        }
        return true;
      }
      if (isPublic) return true;
      if (!isLoggedIn) {
        const loginUrl = new URL("/login", nextUrl);
        loginUrl.searchParams.set("callbackUrl", nextUrl.pathname + nextUrl.search);
        return Response.redirect(loginUrl);
      }
      return true;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
