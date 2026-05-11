import type { ScoreHistoryRow } from "@/lib/db";

/** Example-shaped mock when DB has no snapshots yet; shifts to end at `currentScore`. */
export function buildMockScoreSeries(currentScore: number): number[] {
  const e = Math.max(300, Math.min(850, Math.round(currentScore)));
  const template = [680, 689, 699, 694, 709, 720];
  const delta = e - template[template.length - 1]!;
  return template.map((v) => Math.max(300, Math.min(850, v + delta)));
}

function interpolateGaps(perMonth: (number | null)[], fallbackEnd: number): number[] {
  const known: { i: number; v: number }[] = [];
  perMonth.forEach((v, i) => {
    if (v != null) known.push({ i, v: v });
  });
  if (known.length === 0) return buildMockScoreSeries(fallbackEnd);

  const out: number[] = new Array(6);
  for (let i = 0; i < 6; i++) {
    if (perMonth[i] != null) {
      out[i] = perMonth[i]!;
      continue;
    }
    const before = [...known].reverse().find((k) => k.i < i);
    const after = known.find((k) => k.i > i);
    if (!before && after) out[i] = after.v;
    else if (before && !after) out[i] = before.v;
    else if (before && after) {
      const t = (i - before.i) / (after.i - before.i);
      out[i] = Math.round(before.v + t * (after.v - before.v));
    } else out[i] = fallbackEnd;
  }
  return out;
}

/**
 * Six points for the dashboard chart: last six calendar months (oldest → newest).
 * Uses DB snapshots per month when present; fills gaps; falls back to mock from current score.
 */
export function buildSixMonthScoreSeries(
  rows: ScoreHistoryRow[],
  currentScore: number | null
): { values: number[]; monthLabels: string[] } {
  const end = currentScore != null ? Math.max(300, Math.min(850, Math.round(currentScore))) : 710;

  const monthLabels: string[] = [];
  const monthStarts: Date[] = [];
  const monthEnds: Date[] = [];

  for (let o = 5; o >= 0; o--) {
    const d = new Date();
    d.setDate(1);
    d.setHours(12, 0, 0, 0);
    d.setMonth(d.getMonth() - o);
    const y = d.getFullYear();
    const m = d.getMonth();
    monthStarts.push(new Date(y, m, 1, 0, 0, 0, 0));
    monthEnds.push(new Date(y, m + 1, 0, 23, 59, 59, 999));
    monthLabels.push(d.toLocaleDateString(undefined, { month: "short" }));
  }

  const perMonth: (number | null)[] = monthStarts.map((start, i) => {
    const startT = start.getTime();
    const endT = monthEnds[i]!.getTime();
    const inMonth = rows.filter((r) => {
      const t = new Date(r.created_at).getTime();
      return t >= startT && t <= endT;
    });
    if (!inMonth.length) return null;
    inMonth.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return inMonth[0]!.estimated_score;
  });

  const monthsWithData = perMonth.filter((v) => v != null).length;

  let values: number[];
  /** Need at least two months with snapshots so interpolation is meaningful; otherwise use mock. */
  if (monthsWithData < 2) {
    values = buildMockScoreSeries(end);
  } else {
    values = interpolateGaps(perMonth, end);
  }

  if (currentScore != null) {
    values[5] = Math.max(300, Math.min(850, Math.round(currentScore)));
  }

  return { values, monthLabels };
}
