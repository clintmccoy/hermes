# Project Hermes — Market & Product Research

**Purpose:** This is the living knowledge base of the AI product and engineering lead for
Project Hermes. The goal is to compound expertise over time — becoming a genuine rockstar
on CRE investing, brokerage practice, underwriting workflows, the competitive landscape,
user psychology, and the technical domain. Every session adds to this file: facts, sources,
insights, assumptions, open questions, and evolving perspectives. Nothing is too granular
if it makes the product sharper or the decisions better-informed.

**How it grows:** Daily autonomous research runs answer open questions and surface new ones.
In-session conversations with Clint (10-year CRE investment analyst and the product's first
user) provide ground truth on domain knowledge. Web research fills in market, competitive,
and technical context. This file is the memory that persists across sessions.

**Maintained by:** AI product/engineering lead (Claude)
**Primary domain expert:** Clinton McCoy — investment analyst with ~10 years across
brokerage, private equity, and third-party consulting. Ground-up development is a primary
use case. Power user and first test customer.
**Last updated:** 2026-04-17

---

## 1. Competitive Landscape

### The Incumbent: ARGUS Enterprise (Altus Group)

ARGUS is the de facto institutional standard for CRE cash flow modeling and asset valuation.
It has been entrenched for decades through protocol network effects — not because it's good,
but because everyone uses it.

**Documented pain points (from reviews and industry discussions):**
- Black box: inputs go in, cash flows come out, logic between them is opaque
- Steep learning curve; significant training required
- Single-user by design — no sharing, commenting, version branching
- Desktop-era architecture: properties don't persist across machines; not cloud-native
- SaaS updates frequently break functionality users depend on
- Debt modeling is notoriously clunky
- The standard ARGUS → Excel double-work workflow: most analysts model to NOI in ARGUS,
  then export to proprietary Excel models for returns and everything else
- Cannot be shared without a recipient also having an ARGUS license
- Expensive per-seat licensing

**Corporate status (November 2025):** [Altus Group concluded a strategic alternatives review](https://www.bisnow.com/national/news/technology/firm-behind-argus-swaps-ceo-as-it-ends-strategic-review-hits-critical-inflection-point-131775)
(essentially explored a sale), [replaced CEO Jim Hannon with Mike Gordon (former CEO, 2020–present, assuming CEO role in Q1 2026)](https://www.altusgroup.com/press-releases/altus-group-announces-leadership-transition/), and opted to remain a public company.
Gordon described the company as at a "[critical inflection point](https://www.bisnow.com/national/news/technology/firm-behind-argus-swaps-ceo-as-it-ends-strategic-review-hits-critical-inflection-point-131775)."

**Q3 2025 Financial Performance:** [Revenue up 2.2% to $133.3M, profit from continuing operations of $500K (vs. $2.9M loss prior year), adjusted EPS doubled YoY, recurring revenue up 5.2%](https://www.altusgroup.com/press-releases/altus-group-reports-q3-2025-financial-results/). [Argus Intelligence (the AI product line) delivered double-digit growth](https://www.investing.com/news/transcripts/earnings-call-transcript-altus-group-q3-2025-sees-eps-double-stock-drops-93CH-4340826).

This signals that while ARGUS revenues are modestly growing, profit margins are razor-thin and the company is betting heavily on AI/Intelligence products to drive future growth. The strategic review and leadership transition, combined with lackluster legacy ARGUS growth, confirm the incumbent is under pressure and opening a window for displacement.

**Hermes positioning vs. ARGUS:** Hermes wins on every dimension ARGUS structurally cannot
address: shareability, auditability, collaboration, workflow integration, and AI automation.

---

### Direct Competitors (AI-Native CRE Underwriting)

**Cactus (trycactus.com)**
- Self-described as "fastest-growing AI-powered CRE underwriting platform in North America"
- 1,500+ real estate investors as of 2025/2026
- Key capability: turns due diligence documents into a validated underwriting model in minutes
- Notable: source auditability — every extracted data point traced back to source document
- Key differentiator: maps data into the user's *existing* Excel pro-forma, not a new template
- Generates full 5-year cash flow + IRR model in under 5 minutes (their claim)
- Focus: acquisition underwriting (unclear how deep they go on development/ground-up)

**Hermes vs. Cactus:**
Cactus populates *your existing Excel model*. Hermes *replaces* the Excel model with a
native Analyst Studio + modular engine. This is a bigger bet but a bigger prize. Cactus is
essentially a very good extraction tool with some modeling. Hermes is a full underwriting
platform. Cactus has no apparent viral/sharing mechanic — it's an analyst-side productivity
tool, not a deal communication protocol.

**Cactus pricing (2026):** Cactus uses a flat-rate subscription model (not per-user tiered).
Exact pricing is not publicly disclosed — must contact Cactus for a quote. This contrasts
with per-seat licensing (like ARGUS) and signals a willingness to bundle features under a
single price point. For Hermes, this validates a flat-rate model for smaller teams and
suggests the market is moving away from expensive per-seat licensing.

**Primer (proprise.ai/primer)**
- AI-powered document extraction into existing Excel models
- Works across all asset classes (not multifamily-only like most competitors)
- Maps data into your existing model, cites every extracted cell to source document + page
- Top pick for acquisition teams per 2026 comparison reviews
- **Pricing (2026):** Flat monthly fee per team; unlimited deal volume; minimum 10+ properties/month.
  Exact pricing not publicly disclosed (custom quote). This flat-rate model aligns with Cactus pricing
  strategy and signals market movement away from per-seat licensing.

**Hermes vs. Primer:**
Same extraction-to-Excel approach as Cactus. Both are augmentation tools for Excel workflows.
Hermes is building the replacement workflow.

**Cactus pricing (2026 update):** [Cactus continues to use a flat-rate subscription model with no per-seat tiering](https://www.trycactus.com/pricing). Exact pricing tiers and dollar amounts remain quote-only and not publicly disclosed on their pricing page as of April 2026. This reinforces the market trend away from per-seat licensing (ARGUS model) toward flat-rate team/organization models. For Hermes, this validates continued pursuit of flat-rate tiers for smaller shops and usage-based pricing for larger teams.

**Broker-Specific Distribution & Sharing:**
None of the evaluated competitors (Cactus, Primer, Archer, RedIQ, Blooma, Dealpath) have implemented
an email-native or broker-facing sharing mechanic. Cactus enables team collaboration (internal analysts
syncing a single source of truth), but there is no public evidence of a viral, link-based sharing model
targeting brokers or external deal stakeholders. This confirms Hermes's email-inbound + shared link
distribution strategy is genuinely differentiated and uncontested in the current market. The gap exists.

**RedIQ**
- Data extraction platform for multifamily acquisitions specifically
- Founded ~2013; acquired by Radix in August 2024
- Does not handle non-multifamily asset classes
- Increasingly legacy; the acquisition suggests RedIQ needed a buyer

**Blooma (blooma.ai)**
- Lender/credit-focused; commercial loan underwriting automation
- AI for DSCR analysis, deal prioritization, origination cost reduction
- Not an acquisition underwriting tool — this is the debt originator side

**Hermes vs. Blooma:** Different primary users. Blooma serves lenders; Hermes serves
investors/analysts. They could eventually be on the same deal from different sides.
Future integration opportunity.

**Archer (archer.re)**
- Multifamily-focused AI underwriting + market analysis
- "First underwriting of any multifamily property in under 15 minutes"
- Founded 2019, based in California
- Primarily multifamily; limited cross-asset-class applicability

**Dealpath (dealpath.com)**
- Deal pipeline management + AI-powered deal screening
- Manages $930B+ in aggregate deal value (institutional-scale)
- AI Studio launched 2025: AI Deal Screening, AI Recommended Comps
- Integrated with MSCI/RCA comparable data
- Institutional-only; enterprise sales motion
- Not an underwriting engine — it's a deal management platform with underwriting features

**Hermes vs. Dealpath:** Dealpath is the CRM/pipeline layer. Hermes is the underwriting engine.
These are potentially complementary — a Hermes integration or data feed into Dealpath is
plausible eventually.

**Juniper Square**
- Fund administration + investor relations + AI CRM
- $1.1B valuation after $130M raise in June 2025 — confirmed proptech unicorn
- Serves investment managers (LP/GP relationship layer, not deal underwriting)
- Not a direct competitor; operates at a different layer of the stack

**IntellCRE, HelloData, Enodo, Evra**
- Mostly multifamily-focused tools
- Various combinations of market data, comps, automated underwriting
- Generally narrower scope than Hermes

---

### Competitive Positioning Summary

| Competitor | Asset Class Coverage | Primary User | Replaces Excel? | Sharing/Viral? | Provenance? |
|---|---|---|---|---|---|
| ARGUS Enterprise | All (institutional) | Analyst | No — exports to Excel | No | No |
| Cactus | Acquisition (all classes) | Analyst | No — populates your Excel | No | Yes (basic) |
| Primer | All classes | Analyst | No — populates your Excel | No | Yes (citations) |
| RedIQ | Multifamily only | Analyst | Partial | No | Limited |
| Blooma | All (lender focus) | Credit analyst | Yes (own model) | No | Limited |
| Archer | Multifamily only | Analyst | Partial | No | Limited |
| Dealpath | All (institutional) | PM / deal team | No — pipeline layer | Limited | No |
| **Hermes** | **All (universal)** | **Analyst + Broker** | **Yes — native engine + Studio** | **Yes — core PLG mechanic** | **Yes — first-class** |

**The gap in the market:** No current competitor combines universal asset class coverage +
a native modular engine (not Excel augmentation) + first-class provenance + a viral sharing
mechanic targeting brokers as distribution. That is Hermes's lane.

---

## 2. Market Size & Dynamics

- Proptech funding: [$16.7B in 2025 (68% YoY increase)](https://commercialobserver.com/2026/01/proptech-funding-2025/) — with [$4.5B of that in AI-focused companies](https://commercialobserver.com/2026/01/proptech-funding-2025/)
- 93% of CRE leaders believe early AI adopters gain competitive edge
- 59% of global CRE leaders plan to make AI a daily tool within one year
- AI-centered proptech tools growing rapidly; [capital concentrated in larger deals with 35 companies accounting for 71.9% of $16.7B deployed](https://commercialobserver.com/2026/01/proptech-funding-2025/)

### Total Addressable Market (TAM) for CRE Underwriting & Investment Software

- **Commercial Real Estate Software Market (broad):** [USD 26.36B (2024) → USD 49.94B (2032), 11.0% CAGR](https://www.grandviewresearch.com/industry-analysis/real-estate-software-market-report)
- **Real Estate Investment Software (narrower focus):** [USD 5.6B (2025) → USD 9.8B (2030), 11.8% CAGR](https://www.mordorintelligence.com/industry-reports/real-estate-investment-software-market)
- The investment software segment is the more relevant TAM for Hermes — representing a $5.6B+ market today with double-digit growth
- [Cloud-native solutions account for 71.43% of the market share and are growing at 13.51% CAGR, outpacing on-premise alternatives](https://www.mordorintelligence.com/industry-reports/real-estate-investment-software-market)
- **Market drivers:** Demand for automation & efficiency, data-driven decision-making, AI adoption (76% of CRE firms exploring/implementing AI per Deloitte 2025)
- **Implication for Hermes:** Operating in a multi-billion-dollar, rapidly expanding market with strong tailwinds around AI adoption. Early entrant advantage is significant.

### CRE Transaction Distribution by Asset Class (2025–2026)

[Full-year 2025 CRE transaction volume: **$560.2B** across **176,445 properties** (+14.4% YoY)](https://www.altusgroup.com/insights/us-cre-transactions/). This represents the first annual increase in property count since 2021, with all metrics (price growth, transaction counts, deal sizes, building sizes) moving upward simultaneously.

**By sector (Q4 2025 snapshot, representing broader 2025 trend):**
- [**Industrial:** $44.9B (+54.4% YoY), largest sector by dollar volume](https://www.altusgroup.com/insights/us-cre-transactions/). Industrial has become the dominant growth driver, reflecting e-commerce logistics and last-mile delivery demand.
- **Multifamily:** Strong annual performance with +19.9% median deal size growth. Remains the second-largest asset class by transaction count and volume.
- [**Retail:** +13.4% YoY price growth; grocery-anchored and experiential retail (fast-casual dining, in-person services) performing well.](https://www.altusgroup.com/insights/us-cre-transactions/) Traditional enclosed malls remain challenged.
- **Office:** Median deal size down 23.8% since Q4 2013 (sustained secular decline). However, high-quality, well-leased assets in major metros (NYC, SF, Boston) still command capital (16 nine-figure deals in Q4 2025). Distressed secondary and tertiary markets remain weak.
- [**Hospitality:** +72.9% YoY dollar-volume growth, reflecting strong demand recovery](https://www.altusgroup.com/insights/us-cre-transactions/)

**Implication for Hermes:** Industrial and multifamily account for the vast majority of deal
volume and capital. However, office—despite its structural headwinds—represents meaningful
upside if Hermes's modular engine can unlock value in underwriting refinances, repositioning
plays, and quality-plus-distress scenarios. The data confirms that universal asset class
coverage is essential but that industrial + multifamily should be the initial go-to-market
focus.

**Adoption barriers (surveyed CRE leaders):**
- Lack of internal expertise: 43%
- Regulatory/compliance concerns: 42%
- Budget constraints: 39%
- Decentralized data: 36%

**Implication for Hermes:** The SLIP framework (especially the free tier and zero-setup
email flow) directly addresses the top two barriers. No expertise required if you can just
forward an email. No procurement cycle for a free tier.

---

## 3. User Pain Points (Industry Research)

### From analyst workflow research:

- Manual data entry: 20–30 minutes per deal just extracting figures from OMs into Excel
- Version control chaos: sharing Excel models leads to "who has the current version" problems
- No provenance: a number in a model cannot be traced back to its source document
- Template fragmentation: teams maintain sprawling libraries of templates that diverge and go stale
- ARGUS → Excel double-work: model to NOI in ARGUS, rebuild returns in Excel
- Black box outputs: experienced analysts distrust outputs they can't audit
- Scenario analysis is error-prone: hardcoded assumptions get copy-pasted and accidentally overwritten
- Decision-makers are captive to analysts: principals can't self-serve; everything runs through the analyst bottleneck

### Five most-valued features in underwriting tools (per industry research):
1. Source citation — every number traces back to its source document
2. Conflict detection — flags when two documents disagree on the same figure
3. Custom template mapping — outputs populate your existing model, not a vendor template
4. Multi-document handling — OM, rent roll, T12, and operating statements processed together
5. Speed of setup

**Note on #3:** Hermes diverges from "populate your existing model" — we're replacing the
model entirely. This is a harder sell initially but a stronger long-term position. The
quality and usability of the Analyst Studio + export packs needs to make this tradeoff
obvious. The Excel export packs are the bridge for users who aren't ready to trust the
native studio.

---

## 4. CRE Fundamentals — Research Notes

### "IC-Ready" Definition — Investment Committee Memo Standard

["IC-ready" means a deal and its analysis are prepared and ready to be presented to an investment committee for decision-making](https://atlasx.co/guides-and-resources/investment-committee-memo-for-real-estate-guide/). 
[An investment committee memo (IC memo) synthesizes market research, financial analysis, risk assessment, comparable transactions, and deal terms into a structured narrative that enables informed investment decisions](https://altrio.com/resources/from-offer-memorandums-to-ic-memos-in-record-time/).

Standard IC memo components include:
1. Executive summary and investment recommendation
2. Market overview and submarket analysis
3. Property description and physical assessment
4. Financial analysis (returns, sensitivity tables, scenario modeling)
5. Risk factors and mitigants
6. Comparable transaction analysis
7. Development or business plan overview
8. Exit strategy analysis and key terms summary

**Implication for Hermes:** The IC memo is the formal internal deliverable where all deal analysis crystallizes into a recommendation. The Analyst Studio must make it trivial to generate a fully-sourced, audit-ready IC memo from the underwriting engine. Export templates targeting IC memo structure (particularly the risk summary, returns analysis, and sensitivity tables) should be a core feature. This is where Hermes proves its value — analysts should be able to go from OM to IC-ready in hours, not days.

---

### Ground Lease Modeling — Valuation and Structuring

[Ground lease valuation involves modeling the value of the property as if there was no ground lease, typically using direct cap valuation of the real estate investment](https://www.adventuresincre.com/ground-lease-valuation-model/). 

**Escalation Methods:**
[Fixed adjustments offer simplicity with predetermined dollar increases, percentage increases adjust rent by a set percentage (often reflecting inflation), and index-based escalations tie rent to measures like the Consumer Price Index (CPI), making them responsive to market conditions](https://propertymetrics.com/blog/ground-lease/). Timing varies: some leases escalate annually, others every five or ten years.

**Present Value Calculation:**
[The discounted cash flow (DCF) method is one of the best methods for calculating ground lease value, offering flexibility for different lease terms and incorporating future rent payments](https://thefractionalanalyst.com/tfa-blog/how-to-model-ground-lease-rent-escalation). A projection of these cash flows (with defined lease term, rate, escalation schedule, and terminal value) can be discounted to determine present value.

**Underwriting Mechanics:**
[The Ground Lease Valuation Module puts ground lease payments below NOI and calculates the value of the land by finding the present value of ground lease cash flows at a user-defined discount rate, with land value subtracted from gross investment value to accurately account for the ground lease's impact](https://www.adventuresincre.com/all-in-one-walkthrough-7-ground-lease/).

**Implication for Hermes:** Ground lease deals represent a meaningful subset of CRE transactions (particularly in urban retail and hospitality). The engine should support ground lease modeling as a first-class module: configurable escalation schedules (fixed, percentage, CPI-linked), lease term tracking, and present value calculation at user-defined discount rates. This is an opportunity to differentiate vs. ARGUS, which has limited ground lease modeling support.

---

### T12 Operating Statement — Standard Line Item Taxonomy

A T12 (trailing twelve months) is the primary historical operating document used by lenders,
appraisers, and buyers to evaluate a commercial property. It shows actuals for each of the
12 most recent months plus an annual total column. Below is the standard structure.

**Income section:**
- Gross Potential Rent (GPR) — scheduled rent at 100% occupancy
- Vacancy & Credit Loss — percentage deduction from GPR (market-dependent)
- Other Income — parking, laundry, pet fees, storage, late fees, utility reimbursements
- Effective Gross Income (EGI) = GPR − Vacancy + Other Income

**Operating Expense categories (universal across asset classes):**
- Real estate taxes (property taxes)
- Insurance (property & liability)
- Utilities (electric, gas, water/sewer — scope varies by lease structure)
- Repairs & Maintenance (routine)
- Landscaping / Grounds
- Management Fee (typically 3–5% of EGI for third-party management)
- Administrative & Office
- Payroll / On-site Staff (multifamily, hospitality, larger retail)
- Pest Control
- Security
- Marketing / Advertising (vacancy-driven; relevant for retail, multifamily)
- Capital Reserves / Replacement Reserve (sometimes below-the-line; excluded from NOI per lender conventions)

**NOI calculation:**
NOI = EGI − Total Operating Expenses
NOI excludes: debt service, capital expenditures, depreciation, income tax.
These exclusions make NOI the universal valuation input (cap rate applied to NOI).

**Important nuances by asset class:**
- NNN leases (industrial, net retail): tenant pays taxes, insurance, and CAM — T12 shows
  only landlord-retained expenses and reimbursement income. NOI looks very different from
  gross lease assets.
- Multifamily: all expenses typically landlord-paid; T12 is most complete/standardized
- Office: complex reimbursement structures; gross vs. modified gross vs. full-service
- Hotel/hospitality: revenue structured differently (RevPAR, F&B, etc.) — not a standard T12

**Industry standard reference:** CREFC (Commercial Real Estate Finance Council) maintains a
standard chart of accounts for T12 mapping used by lenders and servicers. Tools like
HelloData.ai map extracted T12 lines to this CREFC taxonomy with <10% median error.
Hermes should evaluate CREFC as the canonical taxonomy for our normalized expense schema.

---

### ARGUS Enterprise Pricing — What We Know

ARGUS does not publish pricing publicly. Pricing is quote-only and varies by customer.

**Available data points:**
- A 2023 WSO forum post references ~$1,500/seat/year for a small firm's actual purchase
- Aggregator sites (G2, Capterra) list estimates starting at ~$125/month (~$1,500/year) per seat
- Hidden costs add 10–20%: onboarding, training, data migration, annual support
- Institutional buyers (large shops, REITs) almost certainly negotiate volume discounts

**Implication for Hermes pricing:** The $1,500–$2,000/seat/year range is the relevant
ceiling for individual analyst seats. Our free tier (SLIP) undercuts this to zero for
initial land, with paid tiers targeting $X00–$X,000/seat/year once value is proven.
The opacity of ARGUS pricing is itself a problem for buyers — Hermes should be fully
transparent on pricing as a trust differentiator.

---

### Google Document AI — Limitations for CRE

Google Document AI is a strong baseline for document extraction but has documented constraints
for CRE use:

**Generic limitations:**
- Accuracy variance: extraction quality depends heavily on document quality, format consistency,
  and content complexity. Handwritten text, mixed fonts, dense tables, and multi-page layouts
  reduce accuracy.
- Limited customization: difficult to train or fine-tune for domain-specific terminology or
  non-standard layouts
- Pricing: per-page or per-document consumption model; can become expensive at scale (1,000+
  documents/month)

**CRE-specific challenges (confirmed):**
- Diverse formats: CRE documents (OMs, rent rolls, appraisals, leases, T12s) mix legal text,
  financial tables, inspection reports, and handwritten notes — no single standard format
- Multi-page complexity: critical figures often buried in dense tables across multiple pages;
  extraction order and context matter
- Dense legal text: purchase agreements and lease clauses contain conditional logic and
  exceptions that pure extraction cannot resolve without semantic understanding
- Precision required: financial figures in CRE underwriting must be 100% accurate; extraction
  errors cascade through the model

**Implication for Hermes:** Google Document AI is viable for initial OM/rent roll extraction
(70–80% accuracy is acceptable as a first pass if the UX surfaces confidence scores and human
review), but it cannot be a black-box solution. The Analyst Studio must include a clear
extraction review layer where analysts verify extracted figures before they propagate to the
model. Consider Document AI as the extraction backbone with human-in-the-loop verification
as a mandatory step. For maximum accuracy on complex documents (multi-property appraisals, syndicated
deals with complex lease structures), a hybrid approach combining Document AI + Claude API for
semantic extraction on high-uncertainty sections may be necessary.

---

### Open-Source JS/TS Financial Calculation Libraries

Evaluated for possible use in the Hermes client-side calculation engine:

**Top candidate: `financial` (lmammino/financial)**
- Zero-dependency TypeScript library based on numpy-financial
- Works in Node.js, Deno, and the browser
- Functions include: NPV, IRR, XIRR, PMT, PV, FV, NPER, RATE
- MIT license
- npm: `@lmammino/financial` — actively maintained
- **Best fit for Hermes:** TypeScript-native, browser-compatible, full TVM function set

**Other options evaluated:**
- `finance.js` (ebradyjobory): Lightweight, includes XIRR; less TypeScript-native
- `@8hobbies/irr`: Focused narrowly on IRR and NPV only; too minimal
- `tvm-financejs`: Time value of money calculations; smaller ecosystem
- `@travishorn/finance`: TypeScript refactor of finance.js; functional approach; modern

**Recommendation:** Start with `@lmammino/financial` for core TVM functions. The hybrid
calc engine (client-side for speed, server-side for auditability) should use this library
for browser-side real-time recalculation. The server-side canonical calculation run can use
the same library for consistency, avoiding any client/server calc divergence risk.

---

### Supabase Row Level Security (RLS) — Multi-Tenant & Anonymous Sharing Patterns

Supabase RLS provides granular database-level authorization via Postgres policies, essential for the
Hermes multi-tenant architecture where brokers share deal links with analysts anonymously.

**Multi-tenant core pattern:**
[Add `org_id` (or `tenant_id`) columns to every table that needs isolation. Store custom JWT claims in user metadata during login (via Supabase Auth hooks or Edge Functions). Create RLS policies that match table rows against JWT claims](https://www.antstack.com/blog/multi-tenant-applications-with-rls-on-supabase-postgress/). Example: `CREATE POLICY "org_isolation" ON deals FOR SELECT USING (org_id = auth.jwt() ->> 'org_id')`.

**Anonymous vs. authenticated users:**
[The `anon` Postgres role and anonymous Supabase Auth users are distinct concepts. Supabase Auth anonymous users assume the `authenticated` role and carry an `is_anonymous` claim in their JWT](https://supabase.com/docs/guides/auth/oauth-server/token-security). You can create separate policies for anonymous and authenticated users, enabling different access levels for shared links vs. account-holders.

**Shared link implementation for Hermes:**
For a broker-shared deal link (no login required):
1. Generate a unique `share_token` UUID and store it in a `deal_shares` table with `deal_id` and optional access level
2. Create an anonymous auth session with the share token in the JWT custom claims
3. RLS policy: `CREATE POLICY "shared_access" ON deals FOR SELECT USING (EXISTS (SELECT 1 FROM deal_shares WHERE deal_shares.deal_id = deals.id AND deal_shares.share_token = auth.jwt() ->> 'share_token'))`
4. The policy allows SELECT if the request's share token matches an active share record for that deal

**Performance critical:**
[Index all columns referenced in RLS policies — missing indexes are the top performance killer](https://supabase.com/docs/guides/database/postgres/row-level-security). For the Hermes pattern: create indexes on `deal_shares(share_token)`, `deals(org_id)`, and any other policy columns.

**Security consideration:**
[Do NOT base RLS policies on `user_metadata` — it can be modified by authenticated end users and creates a security hole](https://supabase.com/docs/guides/database/postgres/row-level-security). Use immutable JWT claims set server-side during login instead.

**Implication for Hermes architecture:** RLS handles the multi-tenant isolation and shared-link access
control at the database layer, allowing the application layer to remain simple. The policy-driven approach scales
better than row-level app checks. This is essential for the Analyst Studio to safely surface deal data to broker
viewers without custom application authorization code.

---

### JV Waterfall Structures — Common Mechanics in CRE

The equity waterfall is the distribution framework used in CRE joint ventures to determine
how cash flow and profit are allocated between the LP (limited partner / passive investor)
and the GP (general partner / sponsor).

**Standard tier sequence:**

**Tier 1 — Return of Capital**
All distributions flow to the LP until 100% of invested capital is returned. Non-negotiable
in virtually all structures.

**Tier 2 — Preferred Return ("Pref")**
After capital return, LP receives a cumulative preferred return on contributed capital.
Typical range: 6–10% annually; 7–8% is most common in institutional deals. The pref is
a priority claim on returns, not a guaranteed payment. Accrues if not paid currently.

**Tier 3 — GP Catch-Up (optional, negotiated)**
Once the LP hits their pref, the GP may receive 100% of subsequent distributions until
the GP has "caught up" to the agreed split. Example: if the final split is 80/20, the
catch-up runs until the GP has received 20% of all cumulative distributions. Not all
deals include a catch-up; its inclusion depends on sponsor leverage and deal quality.

**Tier 4+ — Tiered Promote (Carried Interest)**
After catch-up, distributions split in tiers tied to IRR hurdles. Common example:
- Below 12% IRR: 80/20 (LP/GP)
- 12–18% IRR: 70/30 (LP/GP)
- Above 18% IRR: 60/40 or 50/50 (LP/GP)

The GP's disproportionate share above pref thresholds is the "promote" — analogous to
carried interest in PE funds. Higher-quality sponsors command steeper promotes.

**Clawback provision:** If mid-deal distributions over-pay the GP relative to final
performance, the LP can reclaim the excess at exit. Standard in institutional structures;
less common in smaller or syndicated deals.

**Implications for Hermes:** Waterfall modeling is a mandatory underwriting engine component.
A deal-level waterfall module needs: configurable pref rates, optional catch-up mechanics,
2–4 promote tiers with custom IRR hurdles, and clawback tracking. ARGUS waterfall modeling
is primitive and widely considered one of its weakest areas — analysts routinely rebuild
waterfalls in Excel outside ARGUS. A strong, intuitive Hermes waterfall UI is a genuine
differentiator. This should be a first-class module, not an afterthought.

---

### Hotel & Hospitality Underwriting — Distinct Mechanics vs. Multifamily/Industrial

Hotel and hospitality properties require fundamentally different underwriting approaches than
multifamily, industrial, or office. The core distinction: hotel revenue is *operational* and
*volatile*, driven by management, demand, seasonality, and pricing — not by locked-in lease
escalations. This drives material differences in risk, cap rates, and modeling.

**Core metrics (RevPAR framework):**

RevPAR = Revenue Per Available Room; calculated as (Total Revenue / Available Rooms) or
(ADR × Occupancy). RevPAR is the single best indicator of a hotel's top-line performance
relative to capacity.

- **ADR** (Average Daily Rate): the nightly room rate, re-priced constantly based on demand
  and revenue management strategy. Hotels re-price every night, unlike multifamily leases that
  roll annually.
- **Occupancy:** percentage of available rooms sold. Hotels exhibit far more seasonality than
  other CRE assets — coastal resorts may swing from 90%+ summer occupancy to 35% winter.
  This contrasts with multifamily seasonal variance of 5–10%.

**Operating expense structure:**

Hotel operating expenses consume 55–75% of gross revenue, versus 30–40% for multifamily.
This high OpEx ratio requires precise modeling of: front-of-house (housekeeping, front desk,
concierge), back-of-house (engineering, maintenance), food & beverage, marketing, management
fees (3–5% of revenue typical), and reserve for capital replacement.

**Cap rate premium:**

Hotel cap rates run 100–300 basis points higher than comparable multifamily assets, reflecting:
- Management dependency: a weak GM or management company can crater returns
- Operational risk: revenue is volatile; no long-term lease lock-in
- Cyclical sensitivity: hotels are the most cyclically sensitive CRE asset class
- Pricing risk: ADR pressure in downturns; cannot raise rates if occupancy falls

**Scenario analysis and stress testing:**

Hotel underwriting *requires* recession scenario modeling with 15–25% RevPAR decline (vs.
multifamily, where 5–10% rent decline is typical for recession modeling). Lenders verify
that debt service and preferred equity distributions remain covered at these stress levels.
The COVID-19 pandemic demonstrated RevPAR can collapse by 50% YoY; defensible underwriting
models for this tail risk.

**Implications for Hermes:** Hotel underwriting is a critical and under-served niche within
the universal asset class coverage. Hotel deals are fewer in count than multifamily/industrial
but carry higher AUMs and more specialized underwriting needs. The engine should support:
(1) RevPAR modeling by month/season with occupancy and ADR as separate drivers;
(2) OpEx modeling at 60%+ of revenue by default;
(3) Scenario analysis with pre-built recession templates;
(4) Brand/comp analysis integration (RevPAR comps are a staple of hotel underwriting);
(5) Management contract terms modeling (management fees, incentives, termination clauses).
The first version can ship with multifamily + industrial focus, but hotel modeling should be
designed-in from day one as a clear path to feature parity.

---

### Offering Memorandum (OM) Structure — Standard Sections

A commercial real estate offering memorandum is a standardized document package brokers use
to market deals to buyers. The structure is largely universal across asset classes, with
sections tailored for asset type:

**Standard OM sections (all asset classes):**

1. **Executive Summary / Deal Overview**
   - Investment thesis and expected returns
   - Transaction structure (cap stack, equity, debt)
   - Key investment highlights and risks
   - Sponsor/operator team background and track record
   
2. **Property Description**
   - Location, address, unit count / GLA
   - Year built, major renovations
   - Physical condition and capital needs
   - Site plans, aerial photos

3. **Financial Analysis**
   - Historical T12 or trailing financial statements
   - Rent roll (by unit, by lease expiration)
   - Projected 5-year pro forma (stabilized cash flow, exit assumptions)
   - Loan terms and debt schedule
   - Equity stack and preferred return assumptions (if syndicated)

4. **Market Analysis**
   - Supply/demand dynamics in submarket
   - Comparable properties (rentals and sales)
   - Tenant/operator creditworthiness (if lease-focused)
   - Macroeconomic / sector tailwinds / headwinds

5. **Risk Disclosure**
   - 10–20+ specific risks by category (market, property, operational, financial, legal)
   - Each risk described in 1–2 paragraphs with mitigation strategy

6. **Ancillary Materials**
   - Photos, floorplans, site diagrams
   - Tenant list / lease abstracts
   - Appraisal summary or valuation support
   - Environmental/Phase I findings (if relevant)

**Asset class variations:**
- **Multifamily:** Emphasis on unit mix, lease expiration schedule, rent growth potential, occupancy trends
- **Industrial:** Tenant credit analysis, lease terms (NNN vs. gross), tenant revenue concentration, logistics location value
- **Office:** Tenant creditworthiness, lease term length, TI costs, space efficiency metrics
- **Retail:** Tenant sales performance, co-tenancy quality, anchor tenant strength, foot traffic
- **Hospitality:** RevPAR benchmarks, management contract terms, brand affiliation value, seasonality

**Implication for Hermes:** OM standardization validates the broker workflow entry point. When a
broker forwards an OM email to a Hermes link, the platform should be capable of parsing and
extracting the core sections (rent roll, T12 financials, assumptions, risks, tenant list) without
broker intervention. The standardization also suggests that initial scope should focus on
extraction from these predictable sections, with flexibility to handle asset-class-specific
variations (e.g., RevPAR modeling for hotels, tenant concentration metrics for industrial).

---

### Trigger.dev v3 — Pricing Model

Trigger.dev v3 uses consumption-based pricing (compute time + run invocations):

- **Free:** $5/month usage credit, 10 concurrent runs, 1-day log retention
- **Hobby:** $10/month, includes $10 usage credit, 25 concurrent runs, 7-day log retention
- **Higher tiers:** Exist but specific per-second compute rates and pricing for Pro/Scale
  tiers were not accessible from public documentation during this research run.

**Estimate for Hermes at 1,000 document ingestions/month:**
Without per-second compute rates, a precise estimate is not possible. The free tier's
$5 credit is clearly insufficient at 1,000 runs/month. Assuming 10–30 seconds of compute
per document on a small machine, monthly usage likely falls in the $50–$250 range depending
on machine size and run duration. This needs empirical validation before architecture is
finalized.

**Action item:** Run a test ingestion workflow on Trigger.dev v3, record actual compute
seconds per document, and extrapolate to the 1,000/month scenario. This should happen early
in infrastructure buildout — it affects whether Trigger.dev is cost-viable vs. alternatives
like Inngest, Railway workers, or a Supabase Edge Function + queue approach.

### Development Finance Underwriting — Cost Methodology vs. Acquisition Income Approach

Development deals follow fundamentally different underwriting mechanics than acquisitions. The core distinction: [acquisition underwriting values properties based on income approach (cap rates and NOI), while development underwriting uses cost methodology where land and construction costs determine the valuation](https://www.realcapanalytics.com/blog/real-estate-financial-models-key-differences-of-acquisition-vs-development-excel-models/).

**Key differences from acquisition modeling:**

**1. Valuation basis:** Development projects are valued on cost + feasibility, not on discounted cash flows of stabilized income. The model projects profitability from a project requiring construction or significant renovation — in contrast to acquisition models that analyze stabilized, income-generating properties.

**2. Complexity factors:** [Development models are significantly more complex due to multiple variables: construction costs, absorption rates, financing structure (construction loan → permanent loan → potential refinance), pre-leasing feasibility, and capitalization of soft costs](https://www.adventuresincre.com/all-in-one-underwriting-model-for-real-estate-development-and-acquisition/). 

**3. Funding and timeline:** [Developers raise capital over time rather than all at once, and construction can take years to complete — a stark contrast to acquisitions where capital is deployed upfront and cash flows begin immediately](https://www.buildout.com/blog-posts/cre-models).

**4. Revenue forecasting challenge:** [Predicting rents and cash flows two to three years into the future (permitting + construction timeline) is inherently harder than forecasting stabilized asset performance](https://www.buildout.com/blog-posts/cre-models). Pre-leasing is not always possible; if a building delivers with significant vacant space, absorption timing becomes speculative and depends on broader market strength.

**5. Construction period cash burn:** The construction phase requires upfront capital with no revenue generation — developers must model draws, interest-during-construction, and permanent financing conversion. This is absent from acquisition modeling.

**Implication for Hermes:** Development underwriting is a material subset of CRE deal flow, especially among sponsors and operators. The engine needs dedicated development modeling capabilities: phased cash flows (pre-development, construction, lease-up, stabilization), construction financing (construction loan terms, interest accrual, conversion), absorption scheduling with market sensitivity, and dual valuation (cost-based feasibility vs. residual land value). A simplified development module can launch after core acquisition/stabilization modeling is solid, but development should be on the roadmap as a first-class feature to address universal asset class coverage claim.

---

### Alternative Data in CRE Underwriting — Satellite Imagery, Foot Traffic, & Emerging Analytics

The CRE underwriting landscape is evolving to incorporate alternative data sources beyond traditional financials and lease documents. [Companies at the intersection of real estate, construction, insurance, and financial operations raised $2.1 billion globally in 2025, a 38 percent year-over-year increase](https://www.v7labs.com/blog/ai-in-cre-investment), indicating strong capital allocation toward alternative data-driven approaches.

**Satellite imagery and visual AI:**
[Cape Analytics, backed by approximately $75 million in funding, uses aerial and street-level imagery to derive property-specific risk attributes, enabling large portfolios to underwrite based on condition assessment rather than age or replacement cost alone](https://commercialobserver.com/2025/12/visual-ai-value-risk-commercial-real-estate/). The company's approach transforms visual data into actionable risk metrics.

**Foot traffic analytics and operational insights:**
[Density, which has raised over $125 million, applies AI to occupancy and traffic analytics across mixed-use and CRE portfolios, converting foot traffic data into actionable leasing and operational insights](https://commercialobserver.com/2025/12/visual-ai-value-risk-commercial-real-estate/). This is particularly relevant for retail and hospitality underwriting, where operational performance is highly sensitive to foot traffic patterns.

**Integration into institutional workflows:**
A significant development in early 2025: [CRED iQ and Placer.ai launched a new Commercial Mortgage-Backed Securities (CMBS) Report, layering Placer's high-fidelity foot traffic data directly onto the underlying property assets within CMBS portfolios powered by CRED iQ's CRE finance dataset](https://www.prnewswire.com/news-releases/placerai-and-cred-iq-launch-new-cmbs-report-combining-foot-traffic-intelligence-with-cre-financial-data-302730881.html). This demonstrates that alternative data is moving from experimental to operational in institutional underwriting.

**Valuation accuracy improvements:**
[By analyzing millions of data points, including satellite imagery and social media sentiment, AI models can pinpoint property values with a median error rate as low as 2.4%](https://commercialobserver.com/2025/12/visual-ai-value-risk-commercial-real-estate/) — a level of precision comparable to professional appraisals.

**Implication for Hermes:** Alternative data is not yet a mainstream requirement in most analyst workflows, but it is moving that direction. The current Hermes roadmap focuses on document-driven extraction (OMs, T12s, rent rolls). Integration of alternative data (satellite/foot traffic feeds) could become a differentiator in 2–3 years, particularly for retail and hospitality underwriting. For the initial launch, Hermes should ensure its data model is extensible enough to ingest third-party feeds (foot traffic from Placer.ai or Density, property condition from Cape Analytics) without major refactoring. This is a future growth vector, not a launch blocker.

---

## 4A. Regulatory & Compliance Landscape for AI Financial Analysis (2026)

### AI Compliance Requirements by State

The regulatory landscape for AI in CRE underwriting is rapidly solidifying. [The Colorado AI Act (effective June 30, 2026) requires firms using AI for "consequential decisions" in CRE (including tenant screening, valuations, and lending) to conduct impact assessments, implement risk management policies, and provide consumer notices](https://www.theaiconsultingnetwork.com/blog/ai-regulation-2026-cre-investors-compliance-guide). [At least 38 states adopted or enacted approximately 100 AI-related measures in 2025, with many becoming enforceable in 2026](https://www.winnow.law/news/key-2025-2026-regulatory-compliance-and-lending-law-changes).

### Financial Services AI Governance Expectations

Three core regulatory themes dominate CRE firm priorities: data privacy, AI governance, and consumer protection. [The CFPB, OCC, FDIC, and Fed have made clear that "the model said so" is not an acceptable justification for credit or investment decisions — human-in-the-loop oversight is now a regulatory expectation, not optional](https://fintech.global/2026/01/08/ai-regulatory-compliance-priorities-financial-institutions-face-in-2026/). [AI models used in credit decisions must comply with the Equal Credit Opportunity Act (ECOA)](https://www.innreg.com/blog/ai-in-financial-services).

### Implication for Hermes

Regulatory compliance is a competitive moat. Tools that produce auditable, traceable outputs (vs. black-box numbers) align with emerging compliance expectations. Hermes's emphasis on first-class provenance — every input traceable to its source — directly addresses regulatory requirements. This is not a nice-to-have; it's table stakes for institutional adoption in 2026+.

---

### AI Lease Abstraction — Current SOTA & Market Adoption (2026)

AI lease abstraction has reached production accuracy and is rapidly displacing manual abstraction in the market. [Leading AI lease abstraction platforms now achieve 90–97% accuracy on standard commercial lease terms, reducing abstraction time from 4–6 hours per lease to under 15 minutes](https://lextract.io/resources/articles/best-ai-lease-abstraction-tools-2026). [Top-tier tools achieve 95–99.5% accuracy, with platforms like Prophia delivering over 215 CRE data terms with 99% accuracy backed by human review](https://www.baselane.com/resources/best-ai-tools-for-real-estate).

**Human-in-the-loop approach:**
[Modern abstraction platforms incorporate trained analyst review for complex clauses, unusual terms, and final verification — a hybrid approach that preserves speed (AI first-pass) while maintaining legal nuance (human review)](https://www.theaiconsultingnetwork.com/blog/best-ai-lease-abstraction-software-2026-comparison). This pattern is becoming industry standard, not a premium feature.

**Market landscape:**
The AI lease abstraction market has bifurcated into two segments: (1) tools that return structured, exportable data for active CRE workflows (e.g., Dealpath AI Extract, Prophia), and (2) platforms that use abstraction as an onroarding step for larger compliance or portfolio management systems.

### Implication for Hermes

Lease abstraction is no longer a differentiator — it's a baseline expectation. Hermes should evaluate lease abstraction as a module paired with human review (not a black-box single-click feature). The focus should be on *how* extracted lease data flows into the underwriting engine and *why* each term matters for financial modeling, not on achieving 99.5% extraction accuracy alone. Buyers evaluating Hermes will compare it against Cactus/Primer on extraction quality, but will differentiate based on downstream modeling capabilities.

---

### Institutional Investor Expectations for AI Model Validation & Auditability

Institutional investors have formalized strict requirements for AI-generated underwriting models. [For AI to move upstream into valuation, underwriting, and capital allocation, it must produce outputs that are explainable, auditable, and grounded in traceable data. An unauditable number is a useless number in institutional finance](https://collateral.com/blog/how-ai-is-reshaping-real-estate-underwriting-and-due-diligence).

**Formula-based vs. static outputs:**
[The critical differentiator is whether AI delivers a dynamic Excel formula (traceable, recalculate-able) or a static hardcoded value. For IC review or LP scrutiny, every output must be traceable to its input](https://blog.gyde.ai/ai-cre-loan-underwriting-system/). [Alt-X and Gyde exemplify this approach: they turn OMs into fully auditable Excel models with end-to-end audit trails, not black-box PDFs](https://www.ycombinator.com/launches/PjC-alt-x-ai-agents-for-real-estate-underwriting-financial-modeling).

**Governance frameworks:**
[Financial institutions now prioritize AI governance frameworks including validation pipelines, audit trails, and human oversight. This is no longer optional—it's required to earn trust from clients, regulators, and internal stakeholders](https://www.mdpi.com/2227-7390/13/21/3413).

### Implication for Hermes

Hermes's Analyst Studio must expose *all* calculation logic and source provenance at every step. Export packs should include both the results *and* the formula/assumption stack that generated them. This is not a "nice-to-have transparency feature" — it's the baseline expectation for any institutional use case. Firms evaluating Hermes will require proof that they can audit and defend every number in an IC memo or LP presentation.

---

### PropTech Funding Momentum & Competitive Capital Environment (2026 Research)

[Q1 2026 proptech funding reached $281 million across 10 deals, nearly 9x the $31 million raised in Q1 2025](https://creti.org/insights/february-2026-proptech-funding-capital). [February 2026 alone saw $1.04 billion raised across 38 proptech transactions, with a median deal size of $6.6 million](https://creti.org/insights/february-2026-proptech-funding-capital). [Notable mega-rounds in early 2026 include: Propy ($100M credit facility for AI/blockchain real estate closing), Dwelly ($93M equity and debt), and Huspy ($59M Series B)](https://creti.org/insights/february-2026-proptech-funding-capital).

**Capital allocation priorities (2026):**
[Capital remains available but increasingly selective, with investors prioritizing companies with strong product-market fit, proven customer stickiness, and retention metrics](https://creti.org/insights/february-2026-proptech-funding-capital). [AI-powered platforms are receiving disproportionate share of funding, reflecting industry-wide shift toward automation](https://creti.org/insights/february-2026-proptech-funding-capital).

**Implication for Hermes:** The funding environment is extremely active for AI-focused CRE platforms. This validates market demand but also signals competitive intensity — expect multiple well-funded entrants targeting overlapping use cases (acquisition underwriting, AI extraction, workflow automation) through 2026–2027. Hermes's differentiation on broker distribution and modular engine (vs. Excel augmentation) must be crystallized early; capital will flow to differentiated teams that capture broker distribution before incumbents. Window for establishing broker partnerships and viral loops is NOW — 6–12 months before better-funded competitors emerge with similar positioning.

---

### Quantified Time Savings: Manual vs. Automated Underwriting

Empirical time savings data from 2025–2026 validates the market need for automation: [At a 10–15 OM per week pace, analysts spend 20–30 minutes per deal on data entry before making a kill decision, totaling 4–6 hours per week of skilled analyst time consumed by non-insight-generating work](https://smartcapitalcenter.com/blog-post/top-cre-investment-underwriting-software-and-automation-platforms-compared). Across a month, this compounds to 16–24 hours of wasted capacity per analyst.

**AI acceleration metrics:**
[AI tools can process rent rolls, T12 statements, and comparable data in minutes rather than days. A full five-year cash flow and IRR model can be generated in under five minutes](https://www.trycactus.com/). [Automated underwriting leads to cost savings of up to 20%, with some firms handling 3–4x more deal applications with the same staff size](https://ddee.ai/resources/guides/best-cre-underwriting-automation-software).

**Broader impact:**
[Proptech funding reached $16.7 billion in 2025 (68% YoY increase), with AI-centered CRE tools growing at 42% annually](https://www.v7labs.com/blog/ai-in-cre-investment) — a market signal that automation ROI is undeniable.

### Implication for Hermes

The 20–30 minute per deal baseline + 4–6 hours per week per analyst is the ROI foundation for the SLIP free tier and paid pricing. Hermes should communicate that a single analyst using the platform can handle 2–3x more deals per week with higher confidence. For a 10-person shop handling 500 deals/year (50 per person), that's potential 10–15 FTE analyst output with the same headcount. This ROI math should be front-and-center in broker and analyst messaging.

---

## 5. Tech Spending & GTM Insights

### CRE Firm Software Budget Benchmarks (2025–2026)

**General IT spending by SMB size:**
- [SMBs with 100–499 employees: $10,400 per employee per year on IT](https://medhacloud.com/blog/smb-it-spending-statistics-2026)
- [SMBs with 20–99 employees: $7,200 per employee per year](https://medhacloud.com/blog/smb-it-spending-statistics-2026)
- For a typical 10–15 person investment shop, rough annualized tech budget estimate: $70K–$150K/year

**CRE industry spending momentum:**
- [81% of CRE companies plan to increase technology spending in 2025](https://www.northspyre.com/blog/how-to-allocate-your-cre-tech-budget-in-2025)
- [Over 80% of real estate occupiers, investors, and developers report plans to expand tech budgets (JLL 2023 Global CRE Technology Survey)](https://www.northspyre.com/blog/how-to-allocate-your-cre-tech-budget-in-2025)
- [Financial services firms are reshaping IT budgets in 2026 to prioritize cybersecurity, compliance automation, and cloud modernization](https://omegasystemscorp.com/insights/blog/financial-firms-it-spending-trends/)
- Organizations are allocating 20–25% of IT budgets to AI, up from 5–8% previously

**Implication for Hermes:** Firms have non-zero budget flexibility for software, especially with AI positioning. The free tier (SLIP) gets them on-boarded at zero cost, and upgrade spend can be justified via 6–12 month ROI calculation (time savings, error reduction). This aligns with how the market is already thinking about tech spend.

### CRE Analyst Career Path & Tech Adoption Resistance

**Standard career progression:**
[Junior Credit Analyst (0–2 years): evaluates financial documents, learns risk assessment
→ Credit Analyst (2–4 years): handles complex responsibilities, manages client portfolios, mentors juniors
→ Senior Credit Analyst (4+ years): supervises teams, makes strategic decisions, owns analytical process](https://corporatefinanceinstitute.com/resources/career/credit-analyst-career-path/)

**Skills development drivers:**
[Progression depends on Excel proficiency, statistical analysis tools, credit rating platforms, and communication skills](https://corporatefinanceinstitute.com/resources/career/credit-analyst-career-path/). Seniority correlates with depth of domain expertise and portfolio management responsibility.

**Tech adoption resistance factors in CRE (not seniority-dependent):**
- [**Fear of job displacement**: Employees resist change because they fear technology will replace them](https://hbr.org/2020/08/why-do-your-employees-resist-new-tech)
- [**Cost concerns**: Perceived cost and complexity of implementation deter adoption](https://creonesource.com/2022/09/22/5-ways-to-improve-technology-adoption-in-your-organization/)
- [**Comfort with status quo**: Satisfaction with existing procedures drives risk aversion](https://thebrokerlist.com/5-reasons-cre-slow-adopt-tech-encourage-adoption/)
- [**CRE industry mindset shift**: The industry's historical "tech allergy" is rapidly fading as AI maturity and economic imperatives drive adoption](https://www.archer.re/blog/thawing-the-freeze-why-cres-tech-allergy-is-quickly-fading-and-what-it-means-for-your-firm)

**Implication for Hermes adoption strategy:** Resistance is not seniority-based but rather rooted in
organizational risk aversion and job security concerns. The email-native, zero-setup SLIP model directly
mitigates job displacement fears (augmentation, not replacement) and removes cost barriers. The industry
momentum toward AI adoption suggests a narrowing window — early entrants capture the "innovator" market segment
before incumbents move.

---

### Commercial Real Estate Broker Commission Economics

Understanding broker unit economics is critical for Hermes's broker-centric distribution strategy. CRE brokers earn commission on deal volume, which affects their incentive alignment with tools that accelerate deal underwriting.

**Commission structure:**
[CRE investment sales commissions typically fall between 3% and 6% of the gross sale price, with structure varying by deal size: smaller transactions (under $1M) typically at 5–6%, larger deals ($5M+) at 2–4%, and deals over $10 million at 1–4%](https://www.coradvisors.net/2026/04/commercial-real-estate-broker-commission.html). [For leasing transactions, commissions generally range from 4–6% of the total lease value](https://www.coradvisors.net/2026/04/commercial-real-estate-broker-commission.html).

**Commission splits:**
[A typical split on a 5% commission is 2.5% to each side (listing broker and buyer's broker), though listing-heavy structures (3%/2%) are also common](https://www.coradvisors.net/2026/04/commercial-real-estate-broker-commission.html).

**Market activity and broker opportunity:**
[Q3 2025 saw aggregate transaction volume reach $150.6 billion (a 25.1% increase year-over-year), with Q4 2025 hitting $171.6 billion (up 29% from the prior quarter)](https://www.federalreserve.gov/econres/notes/feds-notes/commissions-and-omissions-trends-in-real-estate-broker-compensation-20250512.html). This elevated transaction volume directly translates to broker earning opportunity.

**Implication for Hermes:** Brokers have direct financial incentive to close more deals and accelerate deal cycles. A tool that speeds underwriting (reducing analyst time from days to hours) directly increases broker deal velocity. Pricing Hermes as a split-fee arrangement (e.g., Hermes captures 10–20% of saved analyst time cost) could align broker incentives. Brokers who use Hermes to close deals faster can take on higher deal volumes, increasing their commission revenue. This alignment is a key GTM lever.

---

### CRE Software Integration & API Ecosystem

The CRE software ecosystem is moving toward interconnectedness. Understanding integration patterns is relevant to Hermes's interoperability story and competitive positioning.

**ARGUS API and data integration:**
[The ARGUS API is a cloud-based interface that allows users to extract or ingest data into their ARGUS models or ARGUS database without using the ARGUS application](https://www.altusgroup.com/insights/argus-api-is-now-available/). [The ARGUS API enables customers to create automatic integrations between ARGUS solutions and other third-party offerings, saving time and improving data quality](https://www.globenewswire.com/news-release/2019/11/07/1942873/0/en/Altus-Group-Opens-Up-CRE-Ecosystem-with-ARGUS-API-Enabling-Better-Data-Usability-and-More-Connected-Workflows.html).

**Ecosystem connectivity drivers:**
[Real estate stakeholders are served by an ecosystem of real estate applications such as PM systems, loan management systems, or asset management tools, and they need to seamlessly swap information between all these tools to work on the most up-to-date and accurate information](https://www.globenewswire.com/news-release/2019/11/07/1942873/0/en/Altus-Group-Opens-Up-CRE-Ecosystem-with-ARGUS-API-Enabling-Better-Data-Usability-and-More-Connected-Workflows.html). This drives demand for API-first architectures and standardized data formats.

**Typical workflow integration pattern:**
[ARGUS results are often exported to Excel for further analysis and manipulation, with support for ARGUS Valuation DCF, Developer and Enterprise and Microsoft Excel helping users perform accurate financial analysis](https://www.altusgroup.com/insights/argus-api-is-now-available/). The Excel export/import loop remains a standard workflow, indicating that native Excel interoperability is expected by institutional users.

**Implication for Hermes:** Hermes should expose an API from day one to enable integrations with PM systems, deal management platforms (e.g., Dealpath), and lending platforms. Export packs to Excel (mentioned in the Hermes product roadmap) align with industry expectations. The ARGUS API's existence removes any objection to Hermes's API strategy — institutional users expect APIs as table stakes. Early integrations with deal management and PM systems (especially those used by brokers) would accelerate adoption.

### Buildout Integration Ecosystem & Broker Distribution Network (2026 research)

[Buildout is the dominant CRE software platform for brokerages, with 50,000+ CRE brokers using the platform to find, win, and sell or lease listings faster](https://www.buildout.com/). [Buildout's open API enables integrations with top CRE listing sites and syndication partners, including the CommercialEdge Network (10 million monthly visitors, 100,000+ qualified leads monthly for Buildout users)](https://www.buildout.com/partners).

**Partnership ecosystem breadth:**
[Buildout integrates across multiple categories: listing syndication (CommercialEdge, major CRE listing sites), marketplace partners (RI Marketplace for auctions, Brevitas for investor connections, AnthemIQ for tenant representation), and marketing partners (Constant Contact email, up to 20% discount for Buildout users)](https://www.buildout.com/partners). The CommercialEdge Network alone generates substantial deal flow visibility across 50,000+ Buildout users.

**Strategic implication for Hermes:** Buildout is the broker-facing distribution layer, used by tens of thousands of brokers who create and distribute OMs daily. Unlike Dealpath (investor/buyer-focused), Buildout is the listing/deal origination point for the majority of institutional CRE deal flow. A partnership or integration with Buildout would allow: (1) auto-ingestion of OM data from Buildout-created listings into Hermes models (eliminating analyst data entry), (2) embedding Hermes underwriting as a "next layer" feature within Buildout workflows (brokers create OM → analysts run Hermes analysis → model links shared back to broker), (3) viral distribution: brokers forwarding Hermes model links to buyers as part of their offer package. This is a higher-leverage partnership opportunity than Dealpath, as it sits at the deal origination point, not the buyer evaluation stage.

### Dealpath Integration Opportunities & Broker OM Workflow (2026 Research)

**Dealpath API & Partnership Ecosystem:**
[Dealpath's open API enables integrations with enterprise systems including Yardi, MRI Software, and Salesforce via REST endpoints](https://platform.dealpath.com/). [In 2025, Dealpath deepened its partnership with MSCI Real Capital Analytics (RCA), bringing comparables data directly into the Dealpath platform for seamless access during deal evaluation](https://www.dealpath.com/integrations-and-partners/). [Dealpath Connec has onboarded three major global brokerages: Cushman & Wakefield, JLL, and CBRE, reflecting institutional acceptance of the platform as a deal distribution channel](https://www.dealpath.com/company/news/dealpath-momentum-2025/).

**Integration Priorities for Hermes:**
Dealpath's API architecture suggests that a Hermes integration should expose: (1) deal data ingestion (to pull deal summary, property metadata, rent roll from Dealpath into Hermes), (2) underwriting results export (to send Hermes models back into Dealpath for team review), and (3) comparable data linkage (to sync Dealpath's comps data with Hermes underwriting assumptions). The presence of MSCI/RCA comps inside Dealpath suggests that Hermes could position itself as the "next layer" for deeper financial analysis after initial deal screening.

**Broker Offering Memorandum Workflow & Tool Stack:**
[Brokers use 7+ disconnected tools per deal, with traditional workflows requiring marketing teams to manually recreate property data inside separate OM creation systems, duplicating information and slowing deal closure](https://www.buildout.com/blog-posts/why-cre-technology-is-moving-toward-unified-platforms). [CREBuilder automates OM creation (offering memorandums, sales teasers, leasing packages, property websites) in approximately 30 minutes using templated data entry](https://www.crebuilder.com/offering-memorandum-builder). [CREOP provides instant branded OMs, Deal Rooms, email blasts, comparable grids, and ChatGPT integration for OM assembly and tailoring](https://creop.com/). [TheAnalyst PRO combines investment modeling with OM generation, enabling brokers to produce Reports, Offering Memorandums, Flyers, Brochures, and Infographics in minutes](https://www.theanalystpro.com/).

**Unified Platform Trend:**
[The industry is shifting from point-solution stacking (separate tools for prospecting, marketing, deal management, underwriting) toward unified platforms that eliminate handoffs and data duplication — keeping all deal information in one system so that when data updates, all downstream documents auto-update](https://www.buildout.com/blog-posts/why-cre-technology-is-moving-toward-unified-platforms). [AI workflow automation is accelerating OM production: document assembly that previously consumed days of manual work now finishes in hours with AI-powered templating and narrative generation](https://www.theaiconsultingnetwork.com/blog/ai-workflow-automation-cre-brokers-prospecting-close-2026).

**Implication for Hermes:** Hermes's email-inbound workflow (forwarded OM → shared model link) sits downstream of OM creation. Brokers will continue using CREBuilder/CREOP/TheAnalyst to create the initial OM; Hermes can integrate with those platforms (via API or webhook) to auto-ingest deal data from the OM into Hermes models, eliminating the need for analysts to re-key data. Alternatively, Hermes could position itself as the underwriting layer *inside* a unified platform like TheAnalyst, offering deeper financial modeling than the OM tool itself. Partnership with Buildout (the dominant OM creation platform) would be a high-leverage entry point to the broker workflow.

### Commercial Office Market Recovery Trajectory (2026 Research)

**Market Stabilization Metrics:**
[The national office vacancy rate is projected to decline to 15.9% by year-end 2026, supported by gradual return-to-office trends with office occupancy climbing to nearly 70% of pre-pandemic levels in 2025](https://www.marcusmillichap.com/research/research-brief/2026/02/research-brief-february-2026-office-market-outlook-and-highlights). [Office occupancy is projected to rise in 36 of 50 major U.S. metros, with rents improving in key markets and leasing activity strong among traditional office users](https://www.creshow.com/blog-3-1/office-market-outlook-2026-trends-risks-amp-opportunities-in-commercial-real-estate).

**Institutional Capital Deployment for Repositioning:**
[Institutional investors increased their share of office transactions to 23% in 2025 (up from 18% prior year), with investment strategies ranging from private buyers targeting smaller Class B/C buildings to institutions pursuing portfolio repositioning and value-add on distressed assets](https://www.credaily.com/briefs/office-investment-outlook-strengthens-for-2026/). [Investors are deploying capital via contrarian/opportunistic strategies on distressed assets and positioning for mid-cycle value-add and repositioning plays as interest rates stabilize](https://www.landairnyc.com/articles/commercial-real-estate-in-2026-stress-shift-and-signals-of-recovery).

**Market Dynamics & Repricing:**
[Deal flow has strengthened as repricing, higher cap rates, and evolving investor participation reshape the office investment landscape, with lenders reassessing risk profiles and moving away from leniency on troubled office assets](https://www.pwc.com/us/en/industries/financial-services/asset-wealth-management/real-estate/). [2026 is shaping up to be less about a quick rebound and more about strategic repositioning, pruning supply, and preparing portfolios for an office market that will remain smaller, more flexible, and more quality-driven for years](https://www.landairnyc.com/articles/commercial-real-estate-in-2026-stress-shift-and-signals-of-recovery).

**Implication for Hermes:** Office market recovery is material but slower and more selective than pre-pandemic. Hermes should ensure strong support for office repositioning modeling: (1) intensive renovation/capital plan scenarios (office buildings being retrofitted to mixed-use, hospitality, or residential), (2) lease-up modeling during market transition, (3) scenario stress-testing for different RTO adoption curves by metro. Institutional capital is actively deploying on office; deals will happen. The barrier is underwriting complexity (refurb costs, lease-up uncertainty, regulatory complexity), not opportunity. Tools that make office repositioning modeling faster and more defensible will unlock this tranche of deal flow.

### Lease Abstraction Tool Ecosystem & Integration Strategy (2026 Research)

**Current Accuracy Benchmarks:**
[Modern AI lease abstraction platforms achieve 95–98% field-level accuracy on standard commercial lease formats (NNN, modified gross, full-service gross leases)](https://lextract.io/resources/articles/best-ai-lease-abstraction-tools-2026). For context, [manual abstraction by trained US-based paralegals achieves 85–92% accuracy on a first pass before quality review](https://lextract.io/resources/articles/manual-vs-ai-lease-abstraction).

**Market Segmentation:**
[Prophia is an enterprise SaaS platform designed for institutional real estate investors (REITs, pension fund advisors, large CRE investment managers) managing hundreds to thousands of leases, with a comprehensive lease management and abstractions workflow](https://www.prophia.com). [Prophia recently launched Prophia Abstract, an instant AI-generated lease abstraction tool for CRE professionals requiring fast lease insights without full-scale lease management complexity](https://www.businesswire.com/news/home/20250508928837/en/Prophia-Unveils-Instant-Abstraction-Tool---Accelerating-Trusted-Lease-Insights-for-the-Industry). In contrast, [Lextract offers AI lease abstraction at $10 per lease with no contract, no subscription, and results delivered in minutes for lighter-weight use cases](https://lextract.io/lease-abstraction-software).

**Integration Approach & Build vs. Partner Decision:**
The high baseline accuracy (95%+) achieved by multiple vendors, combined with the availability of human-in-the-loop review services, suggests that lease abstraction is now a commodity capability. The key differentiator is not extraction accuracy but rather how extracted data flows into the underwriting engine — specifically, (1) which lease terms are surfaced as material drivers of cash flow (e.g., escalation clauses, tenant credit adjustments, renewal optionality), (2) how the engine surfaces audit trails connecting every assumption to the source lease, and (3) whether the engine enables "what-if" scenario modeling on lease term changes.

**Implication for Hermes:** Hermes should evaluate lease abstraction as a module integrated with human review (not a fully automated black-box feature). Options: (1) Partner with Prophia or Lextract for extraction, handling integration via API, (2) Build a thin extraction wrapper around a third-party model (e.g., Claude vision or Document AI) with mandatory analyst review for complex clauses, or (3) Start with Google Document AI (already in the Hermes stack) and refine accuracy over time. Partnership (option 1) is recommended initially to ship faster; in-house capability (option 2) becomes valuable once lease-specific underwriting logic is proven and accuracy improvements justify the engineering investment.

---

## 6. Open Research Questions

Priority questions for ongoing research:

**Competitive:**
- [x] What is ARGUS Enterprise's current pricing (per seat, per year)? This anchors our pricing ceiling.
- [x] What is Cactus's pricing model and tier structure?
- [x] What is Primer's pricing model?
- [x] Has any competitor built a broker-specific distribution feature? How are they approaching it?
- [x] What did the Altus Group strategic review reveal about ARGUS's revenue/growth trends?

**Market:**
- [x] What is the total addressable market for CRE underwriting software? (# of firms, # of analysts)
- [x] What percentage of CRE deals are multifamily vs. office/retail/industrial/mixed-use/development?
  This determines how much our non-multifamily coverage matters for TAM.
- [x] What is the typical broker tech stack today? What tools do IS brokers use for deal packaging?
- [x] What does a typical small/mid-sized investment shop's current software spend look like?

**Technical:**
- [x] Google Document AI: any documented limitations for CRE-specific documents (appraisals, rent rolls)?
- [x] Trigger.dev v3 pricing at scale — what does it cost at, say, 1,000 document ingestions/month?
- [x] What are the standard Supabase RLS patterns for multi-tenant SaaS with anonymous shared links?
- [x] Are there any open-source financial calculation libraries (JS/TS) worth evaluating for the
  client-side calculation engine?

**User research:**
- [x] Find and read Reddit/BiggerPockets/WSO discussions where analysts describe their actual
  underwriting workflow in detail
- [x] What does the CRE analyst career path look like, and how does that affect willingness to
  adopt new tools? (Junior analysts may be more open; senior analysts may be more resistant)
- [x] What does "IC-ready" mean across different firm types? (Private equity vs. family office
  vs. developer/operator vs. debt fund)

**CRE domain:**
- [x] Standard T12 line item taxonomy — what are the universal expense categories across asset classes?
- [x] How does ground lease modeling work in practice? (Ground rent escalations, leasehold financing)
- [x] What are the most common waterfall structures in CRE JVs? (Preferred return thresholds,
  promote tiers, catch-up mechanics)
- [x] How do hotel/hospitality deals get underwritten differently from other asset classes?
  (RevPAR, ADR, occupancy, management contract structure)
- [x] What does a broker's typical OM package look like for different asset classes? What's
  always included vs. sometimes included vs. rarely included?

**Additional research (ongoing):**
- [x] What are the key differences between development finance underwriting and acquisition underwriting?
- [x] What is the typical CRE broker commission structure and unit economics? How does deal velocity affect broker earnings?
- [x] Is alternative data (satellite imagery, foot traffic, e-commerce density) being adopted in mainstream CRE underwriting workflows?
- [x] What is the current state of CRE software APIs and integration ecosystems? (ARGUS API, third-party connectors)
- [x] Beyond DCF and cap rate, what other valuation methodologies do institutional investors use?

**Emerging regulatory & institutional expectations (2026 research focus):**
- [x] What are the regulatory expectations (compliance requirements) for AI-generated financial analysis in CRE underwriting for institutional investors?
- [x] What is the current accuracy of AI lease abstraction tools, and how does human-in-the-loop review affect adoption?
- [x] What level of auditability and model validation do institutional investors expect from AI underwriting tools?
- [x] What is the quantified time savings for analysts using AI automation vs. manual underwriting (hours per deal)?

**Integrations & Ecosystem Opportunities (2026 research focus):**
- [x] What specific integrations does Dealpath expose via API? Which are highest-value for a financial modeling tool (comps, deal data, team collaboration)?
- [x] What is the broker workflow for OM creation and packaging? Which tools dominate (Buildout, CREOP, CREBuilder, TheAnalyst)? Are there partnership opportunities?
- [x] What is the commercial office market recovery trajectory in 2026? Are institutions deploying capital for repositioning plays, and what are their underwriting needs?
- [x] What are the accuracy/cost trade-offs between lease abstraction platforms (Prophia, Lextract)? Should Hermes build, partner, or hybrid-integrate?

---

---

## 6. Recent Alerts

**Industrial is now the dominant CRE sector by Q4 2025 transaction volume ($44.9B, +54.4% QoY).**
This marks a shift from the historical multifamily-first market. E-commerce logistics and last-mile
delivery are driving demand. For Hermes, this suggests:
1. Industrial-focused underwriting should be a co-equal priority with multifamily, not secondary
2. Industrial deal mechanics (NNN leases, tenant credit analysis, escalation structures, CAM recovery)
should be first-class engine features, not add-ons
3. The market is increasingly bifurcated: industrial/multifamily dominating; office/retail/hospitality
as secondary but specialized niches

---

**PropTech funding surging in early 2026: $281M in Q1 2026 (9x YoY), $1.04B in February alone.**
February 2026 mega-rounds (Propy $100M, Dwelly $93M, Huspy $59M) indicate intense competitive capital environment.
For Hermes:
1. Well-funded competitors are emerging in overlapping use cases (acquisition underwriting, AI extraction, workflow automation)
2. Capital is flowing to differentiated teams with strong product-market fit and proven retention metrics
3. **Time-critical**: Hermes must establish broker distribution and viral loops within 6–12 months before competitors scale
4. Early entrant advantage for broker partnerships (especially Buildout integration) is shrinking — move now before competitive field hardens

---

**AI regulatory compliance is now table stakes for institutional adoption (2026).**
38 states enacted ~100 AI measures in 2025; Colorado AI Act effective June 30, 2026. CFPB/OCC/FDIC now require
auditable, traceable AI outputs with human-in-the-loop oversight. For Hermes:
1. Regulatory compliance is no longer a nice-to-have — it's a mandatory feature for institutional GTM
2. Hermes's emphasis on first-class provenance (every input/output traceable to source) becomes a competitive moat
3. Firms evaluating Hermes will require proof of auditability and defensibility for IC/LP presentation
4. Marketing messaging should emphasize regulatory alignment as a de-risking mechanism for institutional investors

---

## 8. Research Log

| Date | Topics Covered | Key Findings |
|---|---|---|
| 2026-04-10 | Competitive landscape, ARGUS pain points, market dynamics, user pain points | See sections 1–3 above. Cactus and Primer are the closest direct competitors; neither has the broker distribution mechanic or replaces Excel entirely. ARGUS corporate instability is an opportunity. Market is growing fast with strong tailwinds. |
| 2026-04-11 | T12 taxonomy, ARGUS pricing, JS/TS financial libraries | T12 structure documented with CREFC as canonical industry taxonomy — evaluate for Hermes expense schema. ARGUS pricing is opaque/quote-only; ~$1,500/seat/year is the best available estimate and anchors our pricing strategy. `@lmammino/financial` (TypeScript, zero-dep, browser-compatible) is the recommended library for the client-side calc engine. |
| 2026-04-12 | JV waterfall mechanics, IS broker tech stack, Trigger.dev v3 pricing | Waterfall structures documented (return of capital → pref 7–8% → optional catch-up → tiered promote by IRR hurdle); ARGUS's primitive waterfall handling is a confirmed differentiator gap. Brokers use Buildout for OM creation with no buyer-facing model layer — confirms email-inbound workflow targets the right gap without disrupting broker habits. Trigger.dev v3 is consumption-based; empirical cost test needed before architecture is finalized. |
| 2026-04-13 | CRE market mix by asset class, Cactus pricing model, hotel underwriting | Q4 2025 saw $560.2B CRE volume (+14.4% YoY): industrial $44.9B (+54.4% QoQ, now largest sector), multifamily +19.9%, office in secular decline but high-quality assets still trade. Cactus uses flat-rate subscription (not per-seat); pricing not public. Hotel underwriting is operationally driven (RevPAR, ADR, 55–75% OpEx, 100–300 bps higher cap rates); requires distinct scenario analysis; identified as critical niche within universal coverage. |
| 2026-04-13 | Primer pricing, Google Document AI limitations, OM structure | Primer uses flat monthly team fee (no public pricing; 10+ deals/month minimum). Google Document AI has accuracy variance on complex CRE docs (mixed legal/financial text, dense tables, multi-page layouts); human review layer mandatory in Analyst Studio. OM structure is standardized (exec summary → property → financials → market → risk disclosure) with asset-class-specific variations; validates email workflow entry point and extraction priorities. |
| 2026-04-14 | Competitor broker distribution, analyst workflow pain points, TAM quantification | No competitor has built email-native or broker-facing sharing (Cactus has internal team collaboration only); Hermes's broker distribution is genuinely differentiated. Analyst pain points confirmed: 30–50 hours/deal on data extraction, version control chaos, model fragility on deal changes. CRE investment software TAM is $5.6B (2025) → $9.8B (2030, 11.8% CAGR); broad CRE software is $26.36B (2024) → $49.94B (2032). Market is massive and accelerating. |
| 2026-04-15 | Backfill sources for prior findings; Altus Group strategic details; IC-ready definition; ground lease modeling | Backfilled sources for proptech funding ($16.7B, 2025, 68% YoY), CRE TAM metrics, and transaction volume data via Altus Group, Mordor Intelligence, and market research firms. Added detailed findings on Altus Group strategic review conclusion: modest revenue growth (2.2% to $133.3M), double-digit growth in Argus Intelligence (AI product), CEO leadership change, company at "critical inflection point" — confirms displacement window. Added IC-ready definition as formal IC memo standard (executive summary, market/property/financial analysis, risk/comps/exit strategy). Added ground lease modeling fundamentals: escalation methods (fixed, percentage, CPI-linked), DCF present value calculation, module structure. Both IC-ready and ground lease are first-class Hermes features to differentiate vs. ARGUS's weak support in these areas. |
| 2026-04-16 | Tech spending benchmarks; CRE analyst adoption resistance; Supabase RLS multi-tenant patterns | Small/mid-sized investment shops budget $70K–$150K/year on tech (SMB benchmark: $7.2K–$10.4K per employee). 81% of CRE firms plan to increase tech spend in 2025; AI budgets climbing to 20–25% of IT allocation. CRE adoption resistance driven by job displacement fears and cost concerns, not seniority — industry "tech allergy" is fading with AI momentum. Documented Supabase RLS multi-tenant pattern: org_id columns + JWT custom claims + row policies. Anonymous shared links via share_token JWT claims enable broker distribution without login. Critical: index RLS policy columns; never base policies on user_metadata. Pattern supports Hermes's core architecture. |
| 2026-04-17 | Development finance mechanics; broker commission economics; alternative data adoption; CRE API ecosystem | Documented development vs. acquisition modeling: development uses cost methodology (land + construction costs), acquisitions use income approach (cap rates/NOI). Development is more complex (construction financing, absorption, pre-leasing). CRE brokers earn 3–6% commission on sales (varies by deal size: <$1M at 5–6%, $5M+ at 2–4%); Q4 2025 saw $171.6B volume (+29% QoQ). Alternative data rapidly adopting: Cape Analytics ($75M funded), Density ($125M funded), CRED iQ + Placer.ai partnership; AI models achieving 2.4% valuation error. ARGUS API now enables third-party integrations; ecosystem moving toward API-first architecture. Implications: (1) development modeling is a roadmap feature for universal coverage, not launch blocker; (2) broker incentives align with deal velocity — Hermes speeds underwriting; (3) alternative data extensibility important 2–3 years out; (4) Hermes API strategy de-risked by ARGUS precedent. |
| 2026-04-18 | AI regulatory compliance; lease abstraction SOTA; institutional model validation expectations; analyst time savings quantification | Added four new research areas critical for Hermes GTM and product positioning: (1) **AI Compliance (2026)**: Colorado AI Act effective June 30, 2026 requires AI impact assessments and human-in-the-loop oversight; 38 states enacted ~100 AI measures in 2025 becoming enforceable. CFPB/OCC/FDIC now expect auditable, traceable AI outputs — "the model said so" is not acceptable for investment decisions. Hermes's first-class provenance aligns with regulatory expectations. (2) **Lease Abstraction Accuracy**: Industry SOTA is 90–99.5% accuracy; human-in-the-loop review (analyst verification of complex terms) is standard practice, not premium. Lease abstraction is baseline, not differentiator — focus should be downstream modeling, not extraction perfection. (3) **Institutional Auditability**: Investors require formula-based (not hardcoded) outputs; every number must be traceable, auditable, and defensible for IC/LP review. Alt-X and Gyde exemplify this with end-to-end audit trails in Excel. Governance frameworks now non-negotiable. (4) **Time Savings**: Empirical data: analysts spend 20–30 min/deal on data entry (4–6 hours/week), equivalent to 16–24 hours/month wasted capacity. AI acceleration achieves full 5-year models in <5 min (vs. days manual). Market signal: proptech $16.7B in 2025, AI CRE tools growing 42% annually. Implication: Hermes messaging should emphasize 2–3x deal capacity increase per analyst as ROI anchor. |
| 2026-04-20 | Dealpath API ecosystem; broker OM workflow; office market repositioning opportunity; lease abstraction tool landscape | Conducted focused research on four ecosystem integration and market opportunities: (1) **Dealpath Integration Strategy**: Dealpath API enables integrations with Yardi, MRI Software, Salesforce; MSCI Real Capital Analytics comps integrated directly; Cushman & Wakefield, JLL, CBRE on Dealpath Connect. High-leverage integration opportunity: Hermes could sync deal data from Dealpath into underwriting models (property metadata, rent roll), export underwriting results back to Dealpath for team review, link Hermes assumptions to Dealpath comps. (2) **Broker OM Workflow**: Brokers use 7+ tools per deal; CREBuilder creates OMs in ~30 min, CREOP is enterprise unified platform, TheAnalyst integrates OM + modeling. Industry trend: moving toward unified platforms to eliminate handoffs and data duplication. Implication: Hermes should integrate with Buildout/CREOP/TheAnalyst to auto-ingest deal data from OM, eliminating analyst data entry. Partnership with Buildout (dominant OM platform) is highest-leverage broker entry point. (3) **Office Market Recovery (2026)**: Vacancy declining to 15.9% by end-2026; institutional capital (23% of transactions, up from 18%) targeting repositioning and value-add on distressed assets. Market shaping up to be selective/quality-driven repositioning play, not broad rebound. Implication: Office repositioning modeling (renovation scenarios, lease-up curves, RTO adoption sensitivity, regulatory complexity) is a material underwriting niche that Hermes should support as a co-equal to multifamily/industrial. (4) **Lease Abstraction Tools**: Prophia (enterprise SaaS, 95–99.5% accuracy) vs. Lextract ($10/lease, minutes turnaround, lighter-weight). Manual baseline 85–92%. Human-in-the-loop review is standard, not premium. Implication: Lease abstraction is a commodity; Hermes should partner (Prophia/Lextract API) or integrate with Google Document AI + analyst review rather than build in-house. Differentiation is downstream (how lease terms drive cash flow, auditability, scenario modeling), not extraction accuracy. |
| 2026-04-21 | Cactus pricing (2026 update); Buildout integration ecosystem & broker distribution; PropTech funding momentum; AI regulatory landscape | Autonomous daily research on four priority topics completed: (1) **Cactus Pricing Validation (2026)**: Confirmed Cactus uses flat-rate subscription model (not per-seat tiering); exact pricing remains quote-only and not publicly disclosed on their pricing page as of April 2026. This reinforces market trend away from per-seat licensing (ARGUS model) toward flat-rate team/organization pricing. Implication: Validates Hermes's flat-rate tier strategy for smaller shops. (2) **Buildout Integration Ecosystem & Broker Distribution Network**: Buildout is dominant CRE broker platform with 50,000+ users; API integrations with CommercialEdge Network (10M monthly visitors, 100K+ qualified leads), marketplace partners (RI Marketplace, Brevitas, AnthemIQ). Strategic implication: Buildout is deal origination point (unlike Dealpath which is buyer evaluation stage), making it a higher-leverage partnership opportunity for Hermes to embed underwriting as next-layer feature in broker workflow. (3) **PropTech Funding Momentum (Q1 2026)**: $281M raised across 10 deals (9x increase from Q1 2025 $31M); February 2026 alone saw $1.04B across 38 transactions. Notable mega-rounds: Propy ($100M), Dwelly ($93M), Huspy ($59M). Implication: Competitive capital intensity is high; Hermes must establish broker distribution and viral loops within 6–12 months before well-funded competitors emerge. (4) **AI Regulatory Landscape Update (2026)**: 38 states enacted approximately 100 AI measures in 2025, many becoming enforceable in 2026. Colorado AI Act effective June 30, 2026 requires impact assessments and human-in-the-loop oversight for consequential decisions. CFPB/OCC/FDIC regulatory guidance now expects auditable, traceable AI outputs — "the model said so" is not acceptable justification. Implication: Regulatory compliance is now table stakes for institutional adoption; Hermes's emphasis on first-class provenance (every output traceable to source) directly addresses regulatory requirements and becomes competitive moat. |
