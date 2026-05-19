import { z } from "zod";

export const ShippingLabelInputSchema = z.object({
  externalOrderId: z.string().min(1, "外部注文番号は必須です").max(64),
  carrier: z.enum(["yamato", "sagawa", "japanpost"]),
  recipientName: z.string().min(1, "受取人氏名は必須です").max(60),
  recipientPostalCode: z
    .string()
    .regex(/^\d{3}-?\d{4}$/, "郵便番号は xxx-xxxx 形式で入力してください"),
  recipientAddress: z.string().min(1, "住所は必須です").max(200),
  recipientPhone: z
    .string()
    .regex(/^[0-9-]{10,15}$/, "電話番号は数字とハイフンのみで入力してください"),
  packageName: z.string().min(1, "品名は必須です").max(100),
});
export type ShippingLabelInput = z.infer<typeof ShippingLabelInputSchema>;

export const ShippingLabelResultSchema = z.object({
  labelIssueId: z.string(),
  trackingNumber: z.string(),
  trackingUrl: z.string(),
  status: z.literal("issued"),
});
export type ShippingLabelResult = z.infer<typeof ShippingLabelResultSchema>;

export const TrackingEventSchema = z.object({
  timestamp: z.string(),
  location: z.string().optional(),
  description: z.string(),
});
export const TrackingInfoSchema = z.object({
  trackingNumber: z.string(),
  status: z.string(),
  events: z.array(TrackingEventSchema).default([]),
});
export type TrackingEvent = z.infer<typeof TrackingEventSchema>;
export type TrackingInfo = z.infer<typeof TrackingInfoSchema>;

export type ShippingErrorCode =
  | "VALIDATION"
  | "NOT_IMPLEMENTED"
  | "API_ERROR"
  | "UNKNOWN";

export class ShippingError extends Error {
  constructor(
    public code: ShippingErrorCode,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ShippingError";
  }
}
