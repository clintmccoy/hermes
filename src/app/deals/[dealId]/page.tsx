"use client";

/**
 * /deals/[dealId] — Deal detail page (placeholder)
 *
 * Stub landing page for the redirect target after deal creation (MMC-52).
 * Full deal detail implementation is tracked separately per scope spec §3.4.
 *
 * References:
 * - MMC-52 — deal create redirect target
 * - MMC-40 — parent scope (full detail page is later in sequencing)
 */

import { useParams, useRouter } from "next/navigation";
import { Shell } from "@/components/layout/Shell";
import { Button } from "@/components/ui/Button";

export default function DealDetailPage() {
  const { dealId } = useParams<{ dealId: string }>();
  const router = useRouter();

  function handleNav(id: string) {
    const routes: Record<string, string> = {
      deals: "/deals",
      review: "/jobs",
      outputs: "/deals",
      exports: "/deals",
    };
    router.push(routes[id] ?? "/deals");
  }

  return (
    <Shell activeNav="deals" onNav={handleNav} breadcrumb="Deals" dealName="Deal">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          gap: 16,
          color: "var(--fg-3)",
        }}
      >
        <p
          style={{
            font: "500 14px/22px var(--font-sans)",
            color: "var(--fg-2)",
          }}
        >
          Deal created successfully.
        </p>
        <p
          style={{
            font: "400 12px/18px var(--font-mono)",
            color: "var(--fg-3)",
          }}
        >
          ID: {dealId}
        </p>
        <p
          style={{
            font: "400 13px/20px var(--font-sans)",
            color: "var(--fg-3)",
            marginTop: 4,
          }}
        >
          Full deal detail UI is coming in the next scope.
        </p>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => router.push("/deals")}
          style={{ marginTop: 8 }}
        >
          ← Back to deals
        </Button>
      </div>
    </Shell>
  );
}
