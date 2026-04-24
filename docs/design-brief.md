# Hermes Design Brief

## Product Context

Hermes is an AI-powered commercial real estate underwriting platform built to replace ARGUS as the industry standard for deal analysis. Its users are institutional investors, acquisitions analysts, and asset managers who make high-stakes financial decisions daily. They are sophisticated, time-pressured, and deeply skeptical of tools that sacrifice depth for polish. Hermes's core promise is speed without compromise — turning deal documents into institutional-grade financial analysis in minutes, not days. Every design decision should reflect that the stakes are real and the users are experts.

---

## Design Principles

**1. Data density with clarity.**
CRE professionals expect to see a lot of information at once. Resist the urge to simplify by hiding. Instead, organize information so that the most important signals are immediately legible and deeper detail is one step away — never buried.

**2. Trust through transparency.**
Underwriting is a discipline of assumptions. Hermes must show its work. Inputs that drive outputs should always be visible and auditable. Users shouldn't have to wonder where a number came from.

**3. Speed as a feature.**
If Hermes's value prop is minutes instead of days, the interface should feel fast. Transitions should be snappy, actions should resolve immediately, and loading states should be rare and graceful — not the norm.

**4. Professional defaults, flexible overrides.**
Ship sensible defaults for cap rates, discount rates, hold periods, and other standard assumptions. Make them easy to find, understand, and change. The tool should feel opinionated but never rigid.

**5. Quietly bold.**
Hermes is confident without being loud. The UI earns trust by being precise and well-considered, not by making a show of itself. Let the analysis do the talking.

---

## Visual Direction

**Palette**
Restrained and authoritative. A deep navy or charcoal as the primary surface, with a burnt amber-orange accent — think ember, not neon. The orange should feel warm and decisive rather than energetic or playful; somewhere in the range of a deep sienna or cognac, desaturated just enough to read as intentional against dark surfaces. It functions as the action color: CTAs, key data highlights, active states. Light mode should feel like a well-typeset financial report; dark mode should feel like a Bloomberg terminal done right — and in both modes, the amber accent should carry weight without overwhelming.

**Typography**
Geometric sans-serif with authority — Inter or DM Sans as a baseline, or something slightly more editorial if the brand wants to lean into the "next-generation" angle. Type hierarchy should be clear and consistent; financial figures should be tabular and monospaced where alignment matters.

**Density**
Medium-high. This is a power tool, not a consumer app. Tables, data grids, and summary cards will be common UI patterns. Whitespace should serve clarity, not fill space.

**Motion**
Minimal and purposeful. Transitions should feel instantaneous or near-instantaneous. No decorative animations. Loading states should use skeleton screens sparingly and resolve fast.

---

## Anti-Patterns to Avoid

- Playful or consumer-app aesthetics (rounded corners pushed too far, pastel palettes, illustrations)
- Hiding data behind excessive clicks or progressive disclosure that feels patronizing to expert users
- Generic SaaS design language that could belong to any B2B product
- Loading-heavy experiences that undercut the "speed" promise
- Overly opinionated layouts that make it hard to customize or extend views
