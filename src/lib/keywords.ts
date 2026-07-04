import nlp from "compromise";

export type RankedKeyword = { term: string; score: number };

const STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "our",
  "your",
  "and",
  "or",
  "in",
  "of",
  "to",
  "for",
  "with",
  "is",
  "are",
  "this",
  "that",
  "field",
  "years",
  "year",
  "months",
  "month",
  "weeks",
  "week",
  "days",
  "day",
  "experience",
  "plus",
  "team",
  "responsibilities",
  "requirements",
  "qualifications",
  "role",
  "job",
  "we",
  "you",
  "us",
  "chair",
  "benefits",
  "both",
  "such",
  "etc",
  "including",
  "well",
  "ability",
  "skills",
]);

const LEADING_FILLER_WORDS =
  "a|an|the|our|your|and|or|both|some|all|any|every|various|other";

// Fragments that survive noun-phrase splitting but carry no signal on their
// own, e.g. "(k)" left behind from "401(k)" or "+ years" left behind from
// "5+ years of experience" once the leading number is separated out.
const FRAGMENT_PATTERNS = [
  /^\(\w{1,4}\)$/i,
  /^\+/,
  /^\+?\d+\+?$/,
];

const LEADING_FILLER_PATTERN = new RegExp(
  `^(?:(?:${LEADING_FILLER_WORDS})\\s+)+`,
  "i",
);

function cleanTerm(raw: string): string {
  return raw
    .replace(/^[-*•+\d.)\s]+/, "")
    .replace(/^\(\w{1,4}\)\s*/, "")
    .replace(/^[-*•+\d.)\s]+/, "")
    .replace(/[.,:;]+$/, "")
    .replace(LEADING_FILLER_PATTERN, "")
    .trim();
}

function isNoiseTerm(cleaned: string): boolean {
  if (FRAGMENT_PATTERNS.some((pattern) => pattern.test(cleaned))) return true;

  const words = cleaned.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;

  const meaningful = words.filter(
    (word) => !STOPWORDS.has(word) && !/^\+?\d+\+?$/.test(word),
  );
  return meaningful.length === 0;
}

export function extractKeywords(text: string, limit = 30): RankedKeyword[] {
  const doc = nlp(text);

  const candidates = [
    ...doc.acronyms().out("array"),
    ...doc
      .nouns()
      .out("array")
      .flatMap((phrase: string) =>
        phrase.split(/,|\band\b/i).map((part) => part.trim()),
      ),
  ];

  const counts = new Map<string, { display: string; count: number }>();

  for (const raw of candidates) {
    const cleaned = cleanTerm(raw);
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (key.length < 2) continue;
    if (!/[a-z0-9]/i.test(key)) continue;
    if (isNoiseTerm(cleaned)) continue;

    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(key, { display: cleaned, count: 1 });
    }
  }

  return Array.from(counts.values())
    .sort((a, b) => b.count - a.count || a.display.localeCompare(b.display))
    .slice(0, limit)
    .map((entry) => ({ term: entry.display, score: entry.count }));
}

const TITLE_KEYWORDS = [
  "engineer",
  "manager",
  "director",
  "analyst",
  "specialist",
  "lead",
  "architect",
  "coordinator",
  "consultant",
  "designer",
  "developer",
  "officer",
  "executive",
  "administrator",
  "representative",
  "associate",
  "president",
  "scientist",
  "strategist",
  "advisor",
];

function looksLikeTitle(line: string): boolean {
  const words = line.trim().split(/\s+/);
  if (words.length === 0 || words.length > 8) return false;
  if (line.trim().endsWith(".")) return false;
  return true;
}

const CONNECTOR_WORDS = new Set(["and", "of", "the", "for", "&", "at", "in"]);

function isProperNounPhrase(phrase: string): boolean {
  const words = phrase.split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > 5) return false;
  return words.every(
    (word) =>
      CONNECTOR_WORDS.has(word.toLowerCase()) || /^[A-Z]/.test(word),
  );
}

function frequencyRankedPhrases(phrases: string[]): { term: string; count: number }[] {
  const counts = new Map<string, { display: string; count: number }>();
  for (const raw of phrases) {
    const cleaned = cleanTerm(raw);
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(key, { display: cleaned, count: 1 });
    }
  }
  return Array.from(counts.values())
    .sort((a, b) => b.count - a.count)
    .map((entry) => ({ term: entry.display, count: entry.count }));
}

export function extractTitleAndCompany(text: string): {
  title: string;
  company: string;
} {
  const doc = nlp(text);

  let title = "";
  const firstLine = text
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  if (firstLine && looksLikeTitle(firstLine)) {
    title = firstLine;
  } else {
    const nounPhrases = doc.nouns().out("array");
    const titleCandidate = nounPhrases.find((phrase: string) =>
      TITLE_KEYWORDS.some((keyword) =>
        phrase.toLowerCase().includes(keyword),
      ),
    );
    if (titleCandidate) {
      title = cleanTerm(titleCandidate);
    }
  }

  const orgRanked = frequencyRankedPhrases(doc.organizations().out("array"));
  let company = orgRanked[0]?.term ?? "";

  if (!company) {
    const properNounPhrases = doc
      .nouns()
      .out("array")
      .filter(isProperNounPhrase);
    const ranked = frequencyRankedPhrases(properNounPhrases).filter(
      (entry) =>
        entry.term.toLowerCase() !== title.toLowerCase() &&
        !TITLE_KEYWORDS.some((keyword) =>
          entry.term.toLowerCase().includes(keyword),
        ),
    );
    company = ranked[0]?.term ?? "";
  }

  return { title, company };
}
