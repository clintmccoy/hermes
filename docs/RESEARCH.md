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
**Last updated:** 2026-04-12

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

**Corporate status (November 2025):** Altus Group concluded a strategic alternatives review
(essentially explored a sale), replaced its CEO, and opted to remain a public company.
This signals internal instability. The PE/acquirer interest validates ARGUS's strategic value,
but the failed sale and leadership change suggests the business is under pressure.

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

**Primer (proprise.ai/primer)**
- AI-powered document extraction into existing Excel models
- Works across all asset classes (not multifamily-only like most competitors)
- Maps data into your existing model, cites every extracted cell to source document + page
- Top pick for acquisition teams per 2026 comparison reviews

**Hermes vs. Primer:**
Same extraction-to-Excel approach as Cactus. Both are augmentation tools for Excel workflows.
Hermes is building the replacement workflow.

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

- Proptech funding: $16.7B in 2025 (68% YoY increase)
- AI-centered proptech tools growing at 42% annually
- 93% of CRE leaders believe early AI adopters gain competitive edge
- 59% of global CRE leaders plan to make AI a daily tool within one year
- VC poured ~$1.7B into proptech in January 2026 alone (176% increase from Jan 2025)

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

### IS Broker Tech Stack — Tools in Use Today

Investment sales and capital markets brokers in 2025–2026 operate across several distinct
tool categories. Key findings from industry research:

**OM creation and deal packaging:**
- **Buildout** is the dominant platform for IS brokerage OM production — industry standard
  for creating and distributing deal packages to buyers. Deeply embedded in brokerage
  operations; has CRM functionality built in.
- **DealGround** (AI-native, notable 2025/2026 entrant) — AI-driven OM extraction,
  automatic lease data updates, ownership discovery tools. Targeting the broker side
  of the market with intelligence on top of documents they already create.
- High-end boutique brokers still use InDesign/Adobe toolchain for polished OMs; most
  mid-market shops have standardized on Buildout.

**Listing and deal exposure:**
- CoStar / LoopNet (dominant, near-universal for exposure)
- Crexi (challenger, gaining share in smaller/mid-market deals; faster, cheaper than CoStar)
- Brevitas (integrated CRM + listing + data room; appealing to independent brokers)

**CRM:** Salesforce (large shops), HubSpot (mid-market), RealNex (CRE-specific), Buildout

**Data and comps:** CoStar (dominant), MSCI/RCA (institutional), DealGround (AI ownership intel)

**Deal data rooms:** Box, Dropbox, Google Drive (generic); Dealpath for institutional buyers

**Critical gap for Hermes:** No broker tool today includes a buyer-facing underwriting or
model-sharing layer. The standard broker workflow is: create OM in Buildout → upload to
CoStar/Crexi → send a PDF link to buyers. The buyer's analyst then manually re-keys data
into Excel from scratch. Hermes's email-inbound flow (forward a broker email → instant
deal screen) plugs directly into this gap without asking brokers to change their existing
workflow at all. This confirms that Hermes's broker distribution mechanic works *with*
existing broker tools rather than competing with them. Brokers become passive distribution
channels — they don't need to adopt anything.

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

---

## 5. Open Research Questions

Priority questions for ongoing research:

**Competitive:**
- [x] What is ARGUS Enterprise's current pricing (per seat, per year)? This anchors our pricing ceiling.
- [ ] What is Cactus's pricing model and tier structure?
- [ ] What is Primer's pricing model?
- [ ] Has any competitor built a broker-specific distribution feature? How are they approaching it?
- [ ] What did the Altus Group strategic review reveal about ARGUS's revenue/growth trends?

**Market:**
- [ ] What is the total addressable market for CRE underwriting software? (# of firms, # of analysts)
- [ ] What percentage of CRE deals are multifamily vs. office/retail/industrial/mixed-use/development?
  This determines how much our non-multifamily coverage matters for TAM.
- [x] What is the typical broker tech stack today? What tools do IS brokers use for deal packaging?
- [ ] What does a typical small/mid-sized investment shop's current software spend look like?

**Technical:**
- [ ] Google Document AI: any documented limitations for CRE-specific documents (appraisals, rent rolls)?
- [x] Trigger.dev v3 pricing at scale — what does it cost at, say, 1,000 document ingestions/month?
- [ ] What are the standard Supabase RLS patterns for multi-tenant SaaS with anonymous shared links?
- [x] Are there any open-source financial calculation libraries (JS/TS) worth evaluating for the
  client-side calculation engine?

**User research:**
- [ ] Find and read Reddit/BiggerPockets/WSO discussions where analysts describe their actual
  underwriting workflow in detail
- [ ] What does the CRE analyst career path look like, and how does that affect willingness to
  adopt new tools? (Junior analysts may be more open; senior analysts may be more resistant)
- [ ] What does "IC-ready" mean across different firm types? (Private equity vs. family office
  vs. developer/operator vs. debt fund)

**CRE domain:**
- [x] Standard T12 line item taxonomy — what are the universal expense categories across asset classes?
- [ ] How does ground lease modeling work in practice? (Ground rent escalations, leasehold financing)
- [x] What are the most common waterfall structures in CRE JVs? (Preferred return thresholds,
  promote tiers, catch-up mechanics)
- [ ] How do hotel/hospitality deals get underwritten differently from other asset classes?
  (RevPAR, ADR, occupancy, management contract structure)
- [ ] What does a broker's typical OM package look like for different asset classes? What's
  always included vs. sometimes included vs. rarely included?

---

## 6. Research Log

| Date | Topics Covered | Key Findings |
|---|---|---|
| 2026-04-10 | Competitive landscape, ARGUS pain points, market dynamics, user pain points | See sections 1–3 above. Cactus and Primer are the closest direct competitors; neither has the broker distribution mechanic or replaces Excel entirely. ARGUS corporate instability is an opportunity. Market is growing fast with strong tailwinds. |
| 2026-04-11 | T12 taxonomy, ARGUS pricing, JS/TS financial libraries | T12 structure documented with CREFC as canonical industry taxonomy — evaluate for Hermes expense schema. ARGUS pricing is opaque/quote-only; ~$1,500/seat/year is the best available estimate and anchors our pricing strategy. `@lmammino/financial` (TypeScript, zero-dep, browser-compatible) is the recommended library for the client-side calc engine. |
| 2026-04-12 | JV waterfall mechanics, IS broker tech stack, Trigger.dev v3 pricing | Waterfall structures documented (return of capital → pref 7–8% → optional catch-up → tiered promote by IRR hurdle); ARGUS's primitive waterfall handling is a confirmed differentiator gap. Brokers use Buildout for OM creation with no buyer-facing model layer — confirms email-inbound workflow targets the right gap without disrupting broker habits. Trigger.dev v3 is consumption-based; empirical cost test needed before architecture is finalized. |
