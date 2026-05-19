import { Buffer } from "node:buffer";
import * as Sentry from "@sentry/nextjs";
import {
  ShippingLabelInput,
  ShippingLabelInputSchema,
  ShippingLabelResult,
  ShippingError,
} from "./types";

const isMockMode = () => process.env.YAMATO_API_MOCK === "true";

const notImplementedError = () =>
  new ShippingError(
    "NOT_IMPLEMENTED",
    "ヤマト本番APIは未実装です (YAMATO_API_MOCK=true でモック動作)",
  );

export function validateShipmentData(input: unknown): ShippingLabelInput {
  const parsed = ShippingLabelInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new ShippingError(
      "VALIDATION",
      "ヤマト配送ラベルの入力データが不正です",
      parsed.error.issues,
    );
  }
  return parsed.data;
}

export function buildTrackingUrl(trackingNumber: string): string {
  return `https://toi.kuronekoyamato.co.jp/cgi-bin/tneko?number=${encodeURIComponent(trackingNumber)}`;
}

function generateMockTrackingNumber(): string {
  const rand4 = () => Math.floor(1000 + Math.random() * 9000).toString();
  return `4912-${rand4()}-${rand4()}`;
}

export async function issueLabel(
  input: ShippingLabelInput,
): Promise<ShippingLabelResult> {
  if (!isMockMode()) {
    const err = notImplementedError();
    Sentry.captureException(err, { tags: { context: "shipping_label" } });
    throw err;
  }
  validateShipmentData(input);
  const trackingNumber = generateMockTrackingNumber();
  return {
    labelIssueId: `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    trackingNumber,
    trackingUrl: buildTrackingUrl(trackingNumber),
    status: "issued",
  };
}

export async function getTrackingNumber(
  _labelIssueId: string,
): Promise<string | null> {
  if (!isMockMode()) {
    throw notImplementedError();
  }
  return null;
}

export async function downloadLabelPdf(
  _labelIssueId: string,
): Promise<Buffer> {
  if (!isMockMode()) {
    throw notImplementedError();
  }
  const body = [
    "%PDF-1.4",
    "1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj",
    "2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj",
    "3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj",
    "4 0 obj<< /Length 44 >>stream",
    "BT /F1 18 Tf 72 720 Td (Mock Yamato Label) Tj ET",
    "endstream endobj",
    "5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj",
    "xref",
    "0 6",
    "0000000000 65535 f",
    "trailer<< /Size 6 /Root 1 0 R >>",
    "startxref",
    "0",
    "%%EOF",
  ].join("\n");
  return Buffer.from(body, "utf-8");
}
