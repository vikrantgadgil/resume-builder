import { compareFactPairs, compareSkeletonPairs } from "@/lib/ai/compare-knowledge";
import { generateSelfPairs } from "@/lib/knowledge-merge";
import { MAX_COMPARISON_PAIRS } from "@/types/reconciliation";
import type { Certification, Education, Role } from "@/types/profile";

export type NeedsReviewReason = "likely_same" | "unresolved" | "overflow";
export type FactNeedsReviewReason = "overlapping" | "unresolved" | "overflow";
export type SelfClassification = "duplicate" | "likely_same" | "unresolved" | "overflow";
export type SelfFactClassification = "duplicate" | "overlapping" | "unresolved" | "overflow";

export function roleLabel(role: {
  title: string;
  employer: string;
  startDate: string;
  endDate: string;
}): string {
  const range = [role.startDate, role.endDate].filter(Boolean).join(" - ");
  return `${role.title} at ${role.employer}${range ? ` (${range})` : ""}`;
}

export function educationLabel(entry: {
  degree: string;
  institution: string;
  year: string;
}): string {
  return `${entry.degree}, ${entry.institution}${entry.year ? ` (${entry.year})` : ""}`;
}

export function certificationLabel(entry: {
  name: string;
  issuer: string;
  year: string;
}): string {
  const parts = [entry.name, entry.issuer].filter(Boolean).join(" - ");
  return `${parts}${entry.year ? ` (${entry.year})` : ""}`;
}

export async function reconcileSkeletonCollection<
  C extends Record<string, unknown>,
  E extends Role | Education | Certification,
>(options: {
  kind: "role" | "education" | "certification";
  candidates: C[];
  existing: E[];
  isExactDuplicate: (candidate: C, existing: E[]) => boolean;
  isLikelyMatch: (candidate: C, existingItem: E) => boolean;
  label: (item: C | E) => string;
}): Promise<{
  autoSkipCount: number;
  newItems: C[];
  needsReview: { existingItem: E; candidate: C; reason: NeedsReviewReason }[];
  overflowCount: number;
}> {
  const { kind, candidates, existing, isExactDuplicate, isLikelyMatch, label } =
    options;

  let autoSkipCount = 0;
  const newItems: C[] = [];
  const queued: { candidate: C; existingItem: E }[] = [];

  for (const candidate of candidates) {
    if (isExactDuplicate(candidate, existing)) {
      autoSkipCount++;
      continue;
    }
    const match = existing.find((item) => isLikelyMatch(candidate, item));
    if (!match) {
      newItems.push(candidate);
    } else {
      queued.push({ candidate, existingItem: match });
    }
  }

  const capped = queued.slice(0, MAX_COMPARISON_PAIRS);
  const overflow = queued.slice(MAX_COMPARISON_PAIRS);

  const needsReview: {
    existingItem: E;
    candidate: C;
    reason: NeedsReviewReason;
  }[] = [];

  if (capped.length > 0) {
    const classifications = await compareSkeletonPairs(
      kind,
      capped.map((pair) => ({
        existingLabel: label(pair.existingItem),
        candidateLabel: label(pair.candidate),
      })),
    );

    capped.forEach((pair, index) => {
      const classification = classifications?.get(index);
      if (classifications === null || classification === undefined) {
        needsReview.push({ ...pair, reason: "unresolved" });
      } else if (classification === "duplicate") {
        autoSkipCount++;
      } else if (classification === "likely_same") {
        needsReview.push({ ...pair, reason: "likely_same" });
      } else {
        newItems.push(pair.candidate);
      }
    });
  }

  for (const pair of overflow) {
    needsReview.push({ ...pair, reason: "overflow" });
  }

  return { autoSkipCount, newItems, needsReview, overflowCount: overflow.length };
}

export async function reconcileFactCollection(options: {
  candidates: { text: string; tags: string[] }[];
  existing: { id: string; text: string }[];
  isExactDuplicate: (
    candidateText: string,
    existing: { text: string }[],
  ) => boolean;
  isLikelyMatch: (candidateText: string, existingText: string) => boolean;
}): Promise<{
  autoSkipCount: number;
  newItems: { text: string; tags: string[] }[];
  needsReview: {
    existingItem: { id: string; text: string };
    candidate: { text: string; tags: string[] };
    reason: FactNeedsReviewReason;
  }[];
  overflowCount: number;
}> {
  const { candidates, existing, isExactDuplicate, isLikelyMatch } = options;

  let autoSkipCount = 0;
  const newItems: { text: string; tags: string[] }[] = [];
  const queued: {
    candidate: { text: string; tags: string[] };
    existingItem: { id: string; text: string };
  }[] = [];

  for (const candidate of candidates) {
    if (isExactDuplicate(candidate.text, existing)) {
      autoSkipCount++;
      continue;
    }
    const match = existing.find((item) => isLikelyMatch(candidate.text, item.text));
    if (!match) {
      newItems.push(candidate);
    } else {
      queued.push({ candidate, existingItem: match });
    }
  }

  const capped = queued.slice(0, MAX_COMPARISON_PAIRS);
  const overflow = queued.slice(MAX_COMPARISON_PAIRS);

  const needsReview: {
    existingItem: { id: string; text: string };
    candidate: { text: string; tags: string[] };
    reason: FactNeedsReviewReason;
  }[] = [];

  if (capped.length > 0) {
    const classifications = await compareFactPairs(
      capped.map((pair) => ({
        existingText: pair.existingItem.text,
        candidateText: pair.candidate.text,
      })),
    );

    capped.forEach((pair, index) => {
      const classification = classifications?.get(index);
      if (classifications === null || classification === undefined) {
        needsReview.push({ ...pair, reason: "unresolved" });
      } else if (classification === "duplicate") {
        autoSkipCount++;
      } else if (classification === "overlapping") {
        needsReview.push({ ...pair, reason: "overlapping" });
      } else {
        newItems.push(pair.candidate);
      }
    });
  }

  for (const pair of overflow) {
    needsReview.push({ ...pair, reason: "overflow" });
  }

  return { autoSkipCount, newItems, needsReview, overflowCount: overflow.length };
}

export async function reconcileSelfCollection<
  T extends Role | Education | Certification,
>(options: {
  kind: "role" | "education" | "certification";
  items: T[];
  isLikelyMatch: (a: T, b: T) => boolean;
  label: (item: T) => string;
}): Promise<{
  pairs: { a: T; b: T; classification: SelfClassification }[];
  overflowCount: number;
}> {
  const { kind, items, isLikelyMatch, label } = options;
  const indexPairs = generateSelfPairs(items.length).filter(([i, j]) =>
    isLikelyMatch(items[i], items[j]),
  );

  const capped = indexPairs.slice(0, MAX_COMPARISON_PAIRS);
  const overflow = indexPairs.slice(MAX_COMPARISON_PAIRS);

  const pairs: { a: T; b: T; classification: SelfClassification }[] = [];

  if (capped.length > 0) {
    const classifications = await compareSkeletonPairs(
      kind,
      capped.map(([i, j]) => ({
        existingLabel: label(items[i]),
        candidateLabel: label(items[j]),
      })),
    );

    capped.forEach(([i, j], index) => {
      const classification = classifications?.get(index);
      if (classifications === null || classification === undefined) {
        pairs.push({ a: items[i], b: items[j], classification: "unresolved" });
      } else if (classification !== "different") {
        pairs.push({ a: items[i], b: items[j], classification });
      }
    });
  }

  for (const [i, j] of overflow) {
    pairs.push({ a: items[i], b: items[j], classification: "overflow" });
  }

  return { pairs, overflowCount: overflow.length };
}

export async function reconcileSelfFacts(options: {
  items: { id: string; text: string }[];
  isLikelyMatch: (a: string, b: string) => boolean;
}): Promise<{
  pairs: {
    a: { id: string; text: string };
    b: { id: string; text: string };
    classification: SelfFactClassification;
  }[];
  overflowCount: number;
}> {
  const { items, isLikelyMatch } = options;
  const indexPairs = generateSelfPairs(items.length).filter(([i, j]) =>
    isLikelyMatch(items[i].text, items[j].text),
  );

  const capped = indexPairs.slice(0, MAX_COMPARISON_PAIRS);
  const overflow = indexPairs.slice(MAX_COMPARISON_PAIRS);

  const pairs: {
    a: { id: string; text: string };
    b: { id: string; text: string };
    classification: SelfFactClassification;
  }[] = [];

  if (capped.length > 0) {
    const classifications = await compareFactPairs(
      capped.map(([i, j]) => ({
        existingText: items[i].text,
        candidateText: items[j].text,
      })),
    );

    capped.forEach(([i, j], index) => {
      const classification = classifications?.get(index);
      if (classifications === null || classification === undefined) {
        pairs.push({ a: items[i], b: items[j], classification: "unresolved" });
      } else if (classification !== "distinct") {
        pairs.push({ a: items[i], b: items[j], classification });
      }
    });
  }

  for (const [i, j] of overflow) {
    pairs.push({ a: items[i], b: items[j], classification: "overflow" });
  }

  return { pairs, overflowCount: overflow.length };
}
