import { Buffer } from "node:buffer";
import {
  ShippingLabelInput,
  ShippingLabelResult,
  ShippingError,
} from "./types";

const ni = () =>
  new ShippingError("NOT_IMPLEMENTED", "佐川急便連携は未実装です");

export function validateShipmentData(_input: unknown): ShippingLabelInput {
  throw ni();
}

export function buildTrackingUrl(_trackingNumber: string): string {
  throw ni();
}

export async function issueLabel(
  _input: ShippingLabelInput,
): Promise<ShippingLabelResult> {
  throw ni();
}

export async function getTrackingNumber(
  _labelIssueId: string,
): Promise<string | null> {
  throw ni();
}

export async function downloadLabelPdf(
  _labelIssueId: string,
): Promise<Buffer> {
  throw ni();
}
