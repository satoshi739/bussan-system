import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getUserSubscription } from "@/lib/subscription";
import { PLANS, PRICE_IDS } from "@/lib/stripe";
import BillingClient from "./BillingClient";

export default async function BillingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const sub = await getUserSubscription();

  const plansWithPriceIds = {
    FREE:     { ...PLANS.FREE,     priceId: PRICE_IDS.FREE },
    STANDARD: { ...PLANS.STANDARD, priceId: PRICE_IDS.STANDARD },
    PRO:      { ...PLANS.PRO,      priceId: PRICE_IDS.PRO },
  };

  return (
    <BillingClient
      plan={sub?.plan ?? "FREE"}
      status={sub?.status ?? "INACTIVE"}
      currentPeriodEnd={sub?.currentPeriodEnd?.toISOString() ?? null}
      hasStripeCustomer={!!sub?.stripeCustomerId}
      plans={plansWithPriceIds}
      email={session.user.email ?? ""}
    />
  );
}
