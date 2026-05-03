import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

export async function GET() {
  Sentry.captureException(new Error("Sentry動作確認テスト — 物販チェッカー フロントエンド"));
  return NextResponse.json({ message: "テストエラーをSentryに送信しました" });
}
