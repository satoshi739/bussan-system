import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getUserSubscription } from "@/lib/subscription";
import { PLANS } from "@/lib/stripe";
import BillingClient from "./BillingClient";

export default async function BillingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const sub = await getUserSubscription();

  return (
    <BillingClient
      plan={sub?.plan ?? "FREE"}
      status={sub?.status ?? "INACTIVE"}
      currentPeriodEnd={sub?.currentPeriodEnd?.toISOString() ?? null}
      hasStripeCustomer={!!sub?.stripeCustomerId}
      plans={PLANS}
      email={session.user.email ?? ""}
    />
  );
}
