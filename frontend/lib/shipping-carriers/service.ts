import { Buffer } from "node:buffer";
import * as yamato from "./yamato";
import * as sagawa from "./sagawa";
import * as japanpost from "./japanpost";
import {
  ShippingError,
  ShippingLabelInput,
  ShippingLabelResult,
} from "./types";

export type CarrierKey = "yamato" | "sagawa" | "japanpost";

const adapters = { yamato, sagawa, japanpost };

function getAdapter(carrier: string) {
  if (carrier !== "yamato" && carrier !== "sagawa" && carrier !== "japanpost") {
    throw new ShippingError("VALIDATION", `未対応の配送業者: ${carrier}`);
  }
  return adapters[carrier as CarrierKey];
}

export async function issueShippingLabel(
  carrier: string,
  input: ShippingLabelInput,
): Promise<ShippingLabelResult> {
  return getAdapter(carrier).issueLabel(input);
}

export async function getTrackingNumber(
  carrier: string,
  labelIssueId: string,
): Promise<string | null> {
  return getAdapter(carrier).getTrackingNumber(labelIssueId);
}

export async function downloadLabelPdf(
  carrier: string,
  labelIssueId: string,
): Promise<Buffer> {
  return getAdapter(carrier).downloadLabelPdf(labelIssueId);
}

export function buildTrackingUrl(
  carrier: string,
  trackingNumber: string,
): string {
  return getAdapter(carrier).buildTrackingUrl(trackingNumber);
}

export function validateShipmentData(
  carrier: string,
  input: unknown,
): ShippingLabelInput {
  return getAdapter(carrier).validateShipmentData(input);
}
