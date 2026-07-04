import type {
  CertificationCandidate,
  Certification,
  EducationCandidate,
  Education,
  RoleCandidate,
  Role,
} from "@/types/profile";

function norm(value: string): string {
  return value.trim().toLowerCase();
}

export function isDuplicateRole(
  candidate: RoleCandidate,
  existing: Role[],
): boolean {
  return existing.some(
    (role) =>
      norm(role.employer) === norm(candidate.employer) &&
      norm(role.title) === norm(candidate.title) &&
      norm(role.startDate) === norm(candidate.startDate) &&
      norm(role.endDate) === norm(candidate.endDate),
  );
}

export function isDuplicateEducation(
  candidate: EducationCandidate,
  existing: Education[],
): boolean {
  return existing.some(
    (entry) =>
      norm(entry.institution) === norm(candidate.institution) &&
      norm(entry.degree) === norm(candidate.degree) &&
      norm(entry.year) === norm(candidate.year),
  );
}

export function isDuplicateCertification(
  candidate: CertificationCandidate,
  existing: Certification[],
): boolean {
  return existing.some(
    (entry) =>
      norm(entry.name) === norm(candidate.name) &&
      norm(entry.issuer) === norm(candidate.issuer) &&
      norm(entry.year) === norm(candidate.year),
  );
}

export function isDuplicateFact(
  candidateText: string,
  existing: { text: string }[],
): boolean {
  return existing.some((fact) => norm(fact.text) === norm(candidateText));
}

// --- Cheap pre-filter for semantic reconciliation (Phase 3.6) ---
// These functions decide whether a pair is worth sending to DeepSeek for
// semantic comparison. They are intentionally permissive: false positives
// just cost one extra AI classification (cheap), false negatives mean a
// real duplicate slips through uncompared, which is the failure mode we
// are trying to reduce.

const SUFFIX_PATTERN =
  /\b(inc|llc|corporation|corp|ltd|co|company)\b\.?/gi;
const PAREN_PATTERN = /\([^)]*\)/g;

export function normalizeEntityName(value: string): string {
  return value
    .toLowerCase()
    .replace(PAREN_PATTERN, "")
    .replace(SUFFIX_PATTERN, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0),
  );
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

export function stringSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

const NAME_SIMILARITY_THRESHOLD = 0.6;

function initials(words: string[]): string {
  return words
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .toLowerCase();
}

export function namesMatchLoosely(a: string, b: string): boolean {
  const normA = normalizeEntityName(a);
  const normB = normalizeEntityName(b);
  if (!normA || !normB) return false;
  if (normA === normB) return true;
  if (normA.includes(normB) || normB.includes(normA)) return true;
  if (stringSimilarity(normA, normB) >= NAME_SIMILARITY_THRESHOLD) return true;

  const rawA = normA.replace(/\s+/g, "");
  const rawB = normB.replace(/\s+/g, "");
  const wordsA = normA.split(" ");
  const wordsB = normB.split(" ");
  if (wordsA.length > 1 && initials(wordsA) === rawB) return true;
  if (wordsB.length > 1 && initials(wordsB) === rawA) return true;

  return false;
}

function parseYear(value: string): number | null {
  const match = value.match(/\d{4}/);
  return match ? parseInt(match[0], 10) : null;
}

export function dateRangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean | null {
  const aStartY = parseYear(aStart);
  const bStartY = parseYear(bStart);
  if (aStartY === null || bStartY === null) return null;

  const aEndY = parseYear(aEnd) ?? new Date().getFullYear();
  const bEndY = parseYear(bEnd) ?? new Date().getFullYear();

  return aStartY <= bEndY && bStartY <= aEndY;
}

export function isLikelyMatchRole(
  a: { employer: string; startDate: string; endDate: string },
  b: { employer: string; startDate: string; endDate: string },
): boolean {
  if (!namesMatchLoosely(a.employer, b.employer)) return false;
  const overlap = dateRangesOverlap(a.startDate, a.endDate, b.startDate, b.endDate);
  return overlap === null || overlap === true;
}

export function isLikelyMatchEducation(
  a: { institution: string; year: string },
  b: { institution: string; year: string },
): boolean {
  if (!namesMatchLoosely(a.institution, b.institution)) return false;
  const yearA = parseYear(a.year);
  const yearB = parseYear(b.year);
  if (yearA === null || yearB === null) return true;
  return Math.abs(yearA - yearB) <= 1;
}

export function isLikelyMatchCertification(
  a: { name: string; year: string },
  b: { name: string; year: string },
): boolean {
  if (!namesMatchLoosely(a.name, b.name)) return false;
  const yearA = parseYear(a.year);
  const yearB = parseYear(b.year);
  if (yearA === null || yearB === null) return true;
  return Math.abs(yearA - yearB) <= 1;
}

function tokenize(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((word) => word.length > 2),
  );
}

const FACT_OVERLAP_THRESHOLD = 0.35;

export function isLikelyMatchFact(a: string, b: string): boolean {
  const tokensA = tokenize(a);
  const tokensB = tokenize(b);
  if (tokensA.size === 0 || tokensB.size === 0) return false;

  let shared = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) shared++;
  }
  const union = new Set([...tokensA, ...tokensB]).size;
  return shared / union >= FACT_OVERLAP_THRESHOLD;
}

// Generates all i < j index pairs, used for comparing a collection against
// itself (the manual "reconcile existing knowledge base" action).
export function generateSelfPairs(length: number): [number, number][] {
  const pairs: [number, number][] = [];
  for (let i = 0; i < length; i++) {
    for (let j = i + 1; j < length; j++) {
      pairs.push([i, j]);
    }
  }
  return pairs;
}
