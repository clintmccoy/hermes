"use client";

/**
 * /deals/new — Deal create form
 *
 * Captures name, asset_class, and business_plan. Calls POST /api/deals and
 * redirects to /deals/[dealId] on success.
 *
 * org_id and created_by are sourced from NEXT_PUBLIC_DEV_ORG_ID /
 * NEXT_PUBLIC_DEV_USER_ID env vars during the service-role bypass period.
 * TODO(MMC-22): remove bypass vars once cookie-based auth lands.
 *
 * References:
 * - MMC-52 — this ticket
 * - Scope spec §3.4 — frontend design
 * - Scope spec §4 Q5 — "Apartments / Multifamily" label
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/layout/Shell";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

// ── Types ──────────────────────────────────────────────────────────────────────

type AssetClass = "office" | "industrial" | "retail" | "multifamily";
type BusinessPlan = "ground_up" | "acquire_lease_hold";

interface FormState {
  name: string;
  asset_class: AssetClass | "";
  business_plan: BusinessPlan | "";
}

interface FieldErrors {
  name?: string;
  asset_class?: string;
  business_plan?: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const ASSET_CLASS_OPTIONS: { value: AssetClass; label: string }[] = [
  { value: "office", label: "Office" },
  { value: "industrial", label: "Industrial" },
  { value: "multifamily", label: "Multifamily" },
  { value: "retail", label: "Retail" },
];

const BUSINESS_PLAN_OPTIONS: { value: BusinessPlan; label: string }[] = [
  { value: "ground_up", label: "Ground Up" },
  { value: "acquire_lease_hold", label: "Acquire / Lease / Hold" },
];

// ── Validation (mirrors API Zod schema) ────────────────────────────────────────

function validate(form: FormState): FieldErrors {
  const errors: FieldErrors = {};
  if (!form.name.trim()) errors.name = "Deal name is required.";
  if (!form.asset_class) errors.asset_class = "Asset type is required.";
  if (!form.business_plan) errors.business_plan = "Business plan is required.";
  return errors;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      style={{
        display: "block",
        font: "500 12px/16px var(--font-sans)",
        color: "var(--fg-2)",
        marginBottom: 6,
      }}
    >
      {children}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      style={{
        font: "400 12px/16px var(--font-sans)",
        color: "var(--critical)",
        marginTop: 5,
      }}
    >
      {message}
    </p>
  );
}

const INPUT_BASE: React.CSSProperties = {
  width: "100%",
  height: 34,
  padding: "0 10px",
  background: "var(--surface-0)",
  border: "1px solid var(--border-strong)",
  borderRadius: "var(--radius-sm)",
  font: "400 13px/1 var(--font-sans)",
  color: "var(--fg-1)",
  outline: "none",
  boxSizing: "border-box",
  transition: `border-color var(--dur-fast) var(--ease-out)`,
};

function TextInput({
  id,
  value,
  onChange,
  placeholder,
  hasError,
  autoFocus,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hasError?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <input
      id={id}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      style={{
        ...INPUT_BASE,
        borderColor: hasError ? "var(--critical)" : undefined,
      }}
      onFocus={(e) => {
        if (!hasError) e.currentTarget.style.borderColor = "var(--border-focus)";
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = hasError ? "var(--critical)" : "var(--border-strong)";
      }}
    />
  );
}

function SelectInput<T extends string>({
  id,
  value,
  onChange,
  options,
  placeholder,
  hasError,
}: {
  id: string;
  value: T | "";
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  placeholder: string;
  hasError?: boolean;
}) {
  return (
    <div style={{ position: "relative" }}>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        style={{
          ...INPUT_BASE,
          appearance: "none",
          paddingRight: 28,
          cursor: "pointer",
          color: value ? "var(--fg-1)" : "var(--fg-3)",
          borderColor: hasError ? "var(--critical)" : undefined,
        }}
        onFocus={(e) => {
          if (!hasError) e.currentTarget.style.borderColor = "var(--border-focus)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = hasError ? "var(--critical)" : "var(--border-strong)";
        }}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <span
        style={{
          position: "absolute",
          right: 9,
          top: "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
          color: "var(--fg-3)",
        }}
        aria-hidden="true"
      >
        <Icon name="chev-d" size={13} />
      </span>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function NewDealPage() {
  const router = useRouter();

  const [form, setForm] = useState<FormState>({
    name: "",
    asset_class: "",
    business_plan: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError(null);

    const fieldErrors = validate(form);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          asset_class: form.asset_class,
          business_plan: form.business_plan,
          // Pre-auth bypass (MMC-22): supply from env vars
          org_id: process.env.NEXT_PUBLIC_DEV_ORG_ID,
          created_by: process.env.NEXT_PUBLIC_DEV_USER_ID,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setApiError(body.error ?? `Server error (${res.status})`);
        return;
      }

      const { deal_id } = await res.json();
      router.push(`/deals/${deal_id}`);
    } catch {
      setApiError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

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
    <Shell activeNav="deals" onNav={handleNav} breadcrumb="Deals" dealName="New deal">
      <div
        style={{
          maxWidth: 520,
          margin: "0 auto",
          padding: "40px 24px",
        }}
      >
        {/* Back link */}
        <button
          type="button"
          onClick={() => router.push("/deals")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            font: "400 12px/1 var(--font-sans)",
            color: "var(--fg-3)",
            background: "none",
            border: "none",
            cursor: "pointer",
            marginBottom: 24,
            padding: 0,
          }}
        >
          <Icon
            name="chev-r"
            size={11}
            style={{ transform: "rotate(180deg)", color: "var(--fg-3)" }}
          />
          Back to deals
        </button>

        {/* Header */}
        <h1
          style={{
            font: "500 24px/32px var(--font-display)",
            letterSpacing: "-0.012em",
            color: "var(--fg-1)",
            marginBottom: 8,
          }}
        >
          New deal
        </h1>
        <p
          style={{
            font: "400 13px/20px var(--font-sans)",
            color: "var(--fg-3)",
            marginBottom: 32,
          }}
        >
          Enter the basics — you can upload documents after the deal is created.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Deal name */}
            <div>
              <FieldLabel htmlFor="name">Deal name</FieldLabel>
              <TextInput
                id="name"
                value={form.name}
                onChange={(v) => set("name", v)}
                placeholder="e.g. 550 Madison Ave"
                hasError={!!errors.name}
                autoFocus
              />
              <FieldError message={errors.name} />
            </div>

            {/* Asset type */}
            <div>
              <FieldLabel htmlFor="asset_class">Asset type</FieldLabel>
              <SelectInput
                id="asset_class"
                value={form.asset_class}
                onChange={(v) => set("asset_class", v)}
                options={ASSET_CLASS_OPTIONS}
                placeholder="Select asset type…"
                hasError={!!errors.asset_class}
              />
              <FieldError message={errors.asset_class} />
            </div>

            {/* Business plan */}
            <div>
              <FieldLabel htmlFor="business_plan">Business plan</FieldLabel>
              <SelectInput
                id="business_plan"
                value={form.business_plan}
                onChange={(v) => set("business_plan", v)}
                options={BUSINESS_PLAN_OPTIONS}
                placeholder="Select business plan…"
                hasError={!!errors.business_plan}
              />
              <FieldError message={errors.business_plan} />
            </div>

            {/* API error */}
            {apiError && (
              <div
                role="alert"
                style={{
                  padding: "10px 12px",
                  background: "var(--critical-tint)",
                  border: "1px solid rgba(216,74,41,0.25)",
                  borderRadius: "var(--radius-sm)",
                  font: "400 13px/20px var(--font-sans)",
                  color: "var(--critical)",
                }}
              >
                {apiError}
              </div>
            )}

            {/* Actions */}
            <div
              style={{
                display: "flex",
                gap: 8,
                justifyContent: "flex-end",
                marginTop: 8,
              }}
            >
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => router.push("/deals")}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="md" disabled={submitting}>
                {submitting ? "Creating…" : "Create deal"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </Shell>
  );
}
