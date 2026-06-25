# Trend direction semantics are habit-type-relative

**Status: superseded by removal of the trend badge (Jun 2026)**

Trend direction (displayed as a badge icon, color, and percentage) is computed as `favorable` or `unfavorable` relative to the habit type, not raw rate change. For good habits a rising completion rate is favorable; for bad habits a falling rate is favorable. The `trendPercentage` sign is similarly inverted so the badge always communicates "are you doing better?" in cohesive terms.

## Context

The original implementation computed `trend` as `"improving" | "declining" | "stable"` based purely on raw completion-rate change. The badge rendered `TrendingUp` + green for improving, `TrendingDown` + red for declining. This was correct for good habits (where more is better) but backwards for bad habits (where less is better).

The `isRegressing` field had the same semantic bug but was unused in the UI, so it was removed.

## Considered Options

- **Flip at the component layer** — keep compute raw, have `habit-stat-card.tsx` check `habitType` and invert icon/color/sign. Simpler compute layer, but forces every consumer to know the inversion rule. Rejected because the domain logic lives in the domain layer.

- **Invert `percentageChange` only** without changing `trend` values — would leave a mismatch where `trend: "improving"` paired with a negative number. Rejected for incoherence.

- **Fully-typed semantic values** (chosen) — `"favorable" | "unfavorable" | "stable"` plus a sign-corrected `trendPercentage`. One consistent story all the way from compute to render.

## Consequences

- `isRegressing` was unused and is removed; no migration needed.
- All existing `"improving"` / `"declining"` references in compute and render must change together.
- Future consumers (e.g., a trends page or notification system) get semantically correct data without remembering the inversion rule.