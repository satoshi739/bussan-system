import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Prisma を使わない Edge-compatible な auth のみ使用
const { auth } = NextAuth(authConfig);
export default auth;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
