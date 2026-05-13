import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { softDeleteByEbayUserId } from "@/lib/ebayAccount";

// eBay challenge verification (GET)
export async function GET(req: NextRequest) {
  const challengeCode = req.nextUrl.searchParams.get("challenge_code");
  if (!challengeCode) {
    return NextResponse.json({ error: "missing challenge_code" }, { status: 400 });
  }

  const verificationToken = process.env.EBAY_VERIFICATION_TOKEN;
  const endpoint = process.env.EBAY_DELETION_ENDPOINT_URL;
  if (!verificationToken || !endpoint) {
    return NextResponse.json({ error: "server misconfigured" }, { status: 500 });
  }

  const hash = createHash("sha256")
    .update(challengeCode + verificationToken + endpoint)
    .digest("hex");

  return NextResponse.json({ challengeResponse: hash });
}

// eBay Account Deletion Notification (POST)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const ebayUserId: string | undefined = body?.notification?.data?.userId;

    if (ebayUserId) {
      await softDeleteByEbayUserId(ebayUserId);
    }
  } catch {
    // eBayへは常に200を返してリトライを抑制する
  }

  return NextResponse.json({ status: "ok" });
}
