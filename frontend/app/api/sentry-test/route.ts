import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

export async function GET() {
  // 本番ではSentryのquota食い潰し対策で無効化
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }
  Sentry.captureException(new Error("Sentry動作確認テスト — 物販チェッカー フロントエンド"));
  await Sentry.flush(2000);
  return NextResponse.json({ message: "テストエラーをSentryに送信しました" });
}
