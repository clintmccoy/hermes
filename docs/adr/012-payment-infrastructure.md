# ADR-012: Payment Infrastructure

**Status:** Accepted  
**Date:** 2026-04-13  
**Deciders:** Clint McCoy  
**Ticket:** MMC-18 (PLG & monetization schema)

---

## Context

Hermes uses a credit-based billing model: orgs purchase or are granted credits, and every AI job, model run, and document processing event deducts from the org's credit balance. On top of credits, orgs subscribe to a plan tier (free, starter, professional, enterprise) that determines their monthly credit allowance and feature access.

This is a B2B SaaS product sold into commercial real estate — a professional, largely US-based market. Early customers will be small investment shops and brokers on a self-serve PLG motion; later customers will include institutional firms that expect invoice-based purchasing (NET 30, PO numbers).

A payment infrastructure decision is required before finalizing the MMC-18 schema, because the `org_subscriptions` and `credit_ledger` tables need to reference external billing identifiers (subscription IDs, customer IDs) in a way that is consistent with whichever platform is chosen.

---

## Decision

Use **Stripe** as the v0 payment infrastructure. Stripe handles all money movement (subscription charges, one-time credit purchases). Hermes owns credit accounting in the `credit_ledger` table — Stripe is the payment layer only, not the source of truth for credit balances.

---

## Options Considered

### Option A: Stripe

| Dimension | Assessment |
|-----------|------------|
| Developer experience | Best-in-class — documentation, SDKs, local testing via Stripe CLI |
| Subscription billing | Native support; handles trials, upgrades, proration, dunning |
| One-time purchases | Native (payment intents / checkout sessions) |
| Credit-based billing | Doable; managed in Hermes `credit_ledger`, Stripe fires webhook on payment |
| Enterprise invoicing | Supported via Stripe Invoicing (separate integration path from self-serve) |
| Tax compliance | **Not handled** — Stripe collects and remits in some states but does not act as Merchant of Record. Sales tax compliance across US states falls to Hermes. |
| Fees | 2.9% + $0.30 per transaction |
| Ecosystem fit | Vercel, Supabase, and Trigger.dev all have first-class Stripe integration guides |

**Pros:** Fastest to integrate; best documentation; most examples in the Next.js + Supabase ecosystem; handles 95% of v0 needs out of the box.  
**Cons:** No Merchant of Record — US sales tax compliance owned by Hermes (material once operating in many states); enterprise invoicing is a second integration effort on top of self-serve.

---

### Option B: Paddle

| Dimension | Assessment |
|-----------|------------|
| Developer experience | Good; improving; less mature than Stripe |
| Subscription billing | Native support |
| One-time purchases | Supported |
| Credit-based billing | Doable; similar pattern to Stripe |
| Enterprise invoicing | Supported |
| Tax compliance | **Full MoR coverage** — Paddle handles US sales tax, EU VAT, and global tax automatically |
| Fees | ~5% per transaction (includes tax handling) |
| Ecosystem fit | Less common in Next.js + Supabase tutorials; fewer pre-built examples |

**Pros:** Merchant of Record eliminates sales tax liability — significant operational simplification as the business scales.  
**Cons:** Higher fees; less mature developer tooling; smaller ecosystem; slower to integrate for v0.

---

### Option C: Lago (open-source usage-based billing)

| Dimension | Assessment |
|-----------|------------|
| Developer experience | Moderate; requires self-hosting or Lago cloud |
| Credit-based billing | Excellent — purpose-built for metered/credit models |
| Payment processing | Does not process payments; sits in front of Stripe/Paddle |
| Tax compliance | Not handled |
| Complexity | High — adds a third service to the stack |

**Pros:** Best-fit for credit metering if billing logic grows complex.  
**Cons:** Extra infrastructure and operational overhead for v0; premature optimization given `credit_ledger` covers our needs.

---

## Trade-off Analysis

The core tension is **integration speed vs. tax compliance ownership**.

Stripe wins on speed. The Hermes `credit_ledger` table is already designed to be payment-processor-agnostic — it records credits in and credits out, and the only Stripe-specific reference it needs is `stripe_subscription_id` and `stripe_customer_id` on `org_subscriptions`. This means swapping to Paddle later is a contained change: update the external IDs, swap the webhook handler, update the checkout flow. The credit accounting logic does not change.

Paddle's MoR benefit is real but not urgent for v0. Early Hermes customers are likely US-based professional entities (LLCs, LPs, REITs) that are accustomed to handling their own business taxes. The sales tax exposure at low ARR is manageable. If Hermes scales to many small subscribers across many states, or expands internationally, the MoR benefit becomes decisive — that is the right time to migrate.

Lago is premature. The `credit_ledger` table handles everything Lago would handle at v0 scale.

---

## Consequences

**What becomes easier:**
- Self-serve checkout, subscription upgrades/downgrades, and trial management via Stripe Checkout and Billing Portal (minimal custom UI needed)
- Credit purchases via Stripe Payment Intents (single webhook → `credit_ledger` insert)
- Integration with Vercel and Supabase is well-documented with Stripe specifically

**What becomes harder:**
- US sales tax compliance — Hermes owns this. At low revenue it is manageable; at scale it requires either a tax tool (TaxJar, Avalara) or migration to Paddle
- Enterprise invoicing (NET 30) requires a separate Stripe Invoicing integration path beyond the self-serve Checkout flow; plan for this before pursuing institutional CRE firms

**What we will need to revisit:**
- If sales tax compliance becomes a burden (multi-state, international expansion), migrate to Paddle as the Merchant of Record. The `credit_ledger` and subscription schema are designed to accommodate this with minimal changes.
- If credit billing complexity grows (tiered pricing, rollover credits, usage-based overages), evaluate Lago or Orb as a billing layer on top of Stripe.

---

## Action Items

- [ ] Add `stripe_subscription_id` and `stripe_customer_id` to `org_subscriptions` (MMC-18 schema)
- [ ] Implement Stripe webhook handler for `invoice.paid`, `customer.subscription.updated`, `customer.subscription.deleted` events
- [ ] Implement credit purchase flow: Stripe Checkout → webhook → `credit_ledger` INSERT
- [ ] Create Linear ticket for sales tax compliance tooling evaluation (Low priority, revisit at $50K ARR)
- [ ] Create Linear ticket for enterprise invoicing (NET 30) support — required before first institutional customer
