"use client";

import { useEffect, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { Button } from "@/components/ui/button";
import { ResumeDocument, type ResumeDocumentData } from "@/lib/pdf/ResumeDocument";
import { countPdfPages } from "@/lib/pdf/count-pages";
import {
  emptyHeader,
  emptySkeleton,
  type Fact,
  type ProfileHeader,
  type Skeleton,
} from "@/types/profile";

const MAX_PAGES = 2;

type PhrasedEntry = { original: string; phrasedText: string; usePhrased: boolean };

export function ResumeGenerator({
  jobDescription,
  keywords,
}: {
  jobDescription: string;
  keywords: string[];
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [header, setHeader] = useState<ProfileHeader>(emptyHeader());
  const [skeleton, setSkeleton] = useState<Skeleton>(emptySkeleton());
  const [facts, setFacts] = useState<Fact[]>([]);

  const [selectedFactIds, setSelectedFactIds] = useState<Set<string>>(new Set());
  const [selectionComputed, setSelectionComputed] = useState(false);
  const [selectNotice, setSelectNotice] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  const [phrasedBullets, setPhrasedBullets] = useState<Map<string, PhrasedEntry>>(
    new Map(),
  );
  const [phraseNotice, setPhraseNotice] = useState<string | null>(null);
  const [isPhrasing, setIsPhrasing] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data.profile) {
          setHeader(data.profile.header);
          setSkeleton(data.profile.skeleton);
        }
        setFacts(data.facts ?? []);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const unattachedFacts = facts.filter((f) => !f.roleRef);

  // Runs the AI selection step fresh, always. Used by the primary action the
  // first time, and by the explicit "Suggest selection" action in the review
  // panel when the user wants a new AI suggestion.
  async function runSelection(): Promise<Set<string>> {
    setIsSelecting(true);
    setSelectNotice(null);

    try {
      const response = await fetch("/api/tailor/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription, keywords }),
      });
      const data = await response.json();

      let ids: Set<string>;
      if (!response.ok || data.fallback) {
        ids = new Set(facts.map((f) => f.id));
        setSelectNotice(
          `AI selection did not succeed${data.reason ? ` (${data.reason})` : ""}. Showing everything so you can choose manually.`,
        );
      } else {
        ids = new Set(data.selectedFactIds);
      }
      setSelectedFactIds(ids);
      setSelectionComputed(true);
      return ids;
    } catch {
      const ids = new Set(facts.map((f) => f.id));
      setSelectedFactIds(ids);
      setSelectionComputed(true);
      setSelectNotice(
        "Could not reach the server to suggest a selection. Showing everything so you can choose manually.",
      );
      return ids;
    } finally {
      setIsSelecting(false);
    }
  }

  // Phrases only the fact ids not already cached in phrasedBullets, merging
  // the result into the existing map rather than replacing it, so adjusting
  // the selection and regenerating never re-phrases facts already done.
  async function ensurePhrasingFor(
    ids: Set<string>,
  ): Promise<Map<string, PhrasedEntry>> {
    const missingIds = Array.from(ids).filter((id) => !phrasedBullets.has(id));

    if (missingIds.length === 0) {
      return phrasedBullets;
    }

    setIsPhrasing(true);
    setPhraseNotice(null);

    function fallbackFor(ids: string[]): Map<string, PhrasedEntry> {
      const map = new Map<string, PhrasedEntry>();
      for (const id of ids) {
        const fact = facts.find((f) => f.id === id);
        if (fact) {
          map.set(id, {
            original: fact.text,
            phrasedText: fact.text,
            usePhrased: true,
          });
        }
      }
      return map;
    }

    try {
      const response = await fetch("/api/tailor/phrase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescription,
          keywords,
          factIds: missingIds,
        }),
      });
      const data = await response.json();

      let newEntries: Map<string, PhrasedEntry>;
      if (!response.ok || data.fallback) {
        setPhraseNotice(
          `AI phrasing did not succeed${data.reason ? ` (${data.reason})` : ""}. Using original fact text for the new items.`,
        );
        newEntries = fallbackFor(missingIds);
      } else {
        newEntries = new Map<string, PhrasedEntry>();
        for (const bullet of data.bullets) {
          newEntries.set(bullet.factId, {
            original: bullet.original,
            phrasedText: bullet.phrasedText,
            usePhrased: true,
          });
        }
      }

      const merged = new Map(phrasedBullets);
      for (const [id, entry] of newEntries) merged.set(id, entry);
      setPhrasedBullets(merged);
      return merged;
    } catch {
      setPhraseNotice(
        "Could not reach the server to phrase these bullets. Using original fact text for the new items.",
      );
      const merged = new Map(phrasedBullets);
      for (const [id, entry] of fallbackFor(missingIds)) merged.set(id, entry);
      setPhrasedBullets(merged);
      return merged;
    } finally {
      setIsPhrasing(false);
    }
  }

  async function renderAndCount(
    ids: Set<string>,
    bullets: Map<string, PhrasedEntry>,
  ) {
    function bulletTextFor(factId: string): string | null {
      const entry = bullets.get(factId);
      if (!entry) return null;
      return entry.usePhrased ? entry.phrasedText : entry.original;
    }

    try {
      const data: ResumeDocumentData = {
        header,
        roles: skeleton.roles.map((role) => ({
          role,
          bullets: facts
            .filter((f) => f.roleRef === role.id && ids.has(f.id))
            .map((f) => bulletTextFor(f.id))
            .filter((text): text is string => text !== null),
        })),
        education: skeleton.education,
        certifications: skeleton.certifications,
        highlights: unattachedFacts
          .filter((f) => ids.has(f.id))
          .map((f) => bulletTextFor(f.id))
          .filter((text): text is string => text !== null),
      };

      const blob = await pdf(<ResumeDocument data={data} />).toBlob();
      const pages = await countPdfPages(blob);

      if (pages > MAX_PAGES) {
        setGenerateError(
          `This selection produces ${pages} pages, which is over the ${MAX_PAGES} page limit. Expand "Review selection" below to remove a few facts and regenerate.`,
        );
        setPageCount(pages);
        return;
      }

      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(blob));
      setPageCount(pages);
    } catch {
      setGenerateError(
        "Could not generate the PDF. Check your selections and try again.",
      );
    }
  }

  // The single primary action: runs selection (if not already computed),
  // phrasing for whatever is selected, and renders the PDF, all in one go.
  async function handleGenerateTailored() {
    setIsGenerating(true);
    setGenerateError(null);

    try {
      const ids = selectionComputed ? selectedFactIds : await runSelection();
      const bullets = await ensurePhrasingFor(ids);
      await renderAndCount(ids, bullets);
      setHasGenerated(true);
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSuggestSelection() {
    await runSelection();
  }

  function toggleFact(id: string) {
    setSelectedFactIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleRegenerateFromSelection() {
    setIsGenerating(true);
    setGenerateError(null);
    try {
      const bullets = await ensurePhrasingFor(selectedFactIds);
      await renderAndCount(selectedFactIds, bullets);
    } finally {
      setIsGenerating(false);
    }
  }

  function toggleUsePhrased(factId: string) {
    setPhrasedBullets((prev) => {
      const next = new Map(prev);
      const entry = next.get(factId);
      if (entry) next.set(factId, { ...entry, usePhrased: !entry.usePhrased });
      return next;
    });
  }

  async function handleRegeneratePdfOnly() {
    setIsGenerating(true);
    setGenerateError(null);
    try {
      await renderAndCount(selectedFactIds, phrasedBullets);
    } finally {
      setIsGenerating(false);
    }
  }

  if (isLoading) {
    return <p className="text-zinc-600 dark:text-zinc-400">Loading...</p>;
  }

  const selectedBulletsInReview = Array.from(phrasedBullets.entries()).filter(
    ([factId]) => selectedFactIds.has(factId),
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold">Generate tailored resume</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          One click selects the most relevant facts for this job, phrases
          them, and produces a two-page PDF. Roles, education, and
          certifications always render from your profile as stored.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={handleGenerateTailored} disabled={isGenerating}>
          {isGenerating
            ? "Generating..."
            : hasGenerated
              ? "Regenerate tailored resume"
              : "Generate tailored resume"}
        </Button>
        {pageCount !== null && (
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {pageCount} page{pageCount === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {generateError && (
        <p className="text-sm font-medium text-red-600 dark:text-red-400">
          {generateError}
        </p>
      )}

      {previewUrl && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <a href={previewUrl} download="resume.pdf">
              <Button variant="outline" size="sm">
                Download PDF
              </Button>
            </a>
          </div>
          <iframe
            src={previewUrl}
            title="Resume preview"
            className="h-[600px] w-full rounded-lg border border-zinc-300 dark:border-zinc-700"
          />
        </div>
      )}

      <details className="rounded-lg border border-zinc-300 p-3 dark:border-zinc-700">
        <summary className="cursor-pointer text-sm font-medium">
          Customize before generating: Review selection
        </summary>
        <div className="mt-3 flex flex-col gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSuggestSelection}
            disabled={isSelecting}
            className="self-start"
          >
            {isSelecting
              ? "Selecting..."
              : selectionComputed
                ? "Re-suggest selection"
                : "Suggest selection for this job description"}
          </Button>

          {selectNotice && (
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
              {selectNotice}
            </p>
          )}

          {skeleton.roles.length > 0 && (
            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">
                Experience (all roles always included)
              </h3>
              {skeleton.roles.map((role) => {
                const roleFacts = facts.filter((f) => f.roleRef === role.id);
                if (roleFacts.length === 0) return null;
                return (
                  <div
                    key={role.id}
                    className="rounded-md border border-zinc-200 p-2 text-sm dark:border-zinc-800"
                  >
                    <p className="font-medium">
                      {role.title} at {role.employer}
                    </p>
                    <div className="mt-1 flex flex-col gap-1 pl-6">
                      {roleFacts.map((fact) => (
                        <label
                          key={fact.id}
                          className="flex items-start gap-2 text-xs text-zinc-700 dark:text-zinc-300"
                        >
                          <input
                            type="checkbox"
                            checked={selectedFactIds.has(fact.id)}
                            onChange={() => toggleFact(fact.id)}
                            className="mt-0.5"
                          />
                          {fact.text}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </section>
          )}

          {unattachedFacts.length > 0 && (
            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">
                Selected Highlights (unattached facts)
              </h3>
              {unattachedFacts.map((fact) => (
                <label key={fact.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedFactIds.has(fact.id)}
                    onChange={() => toggleFact(fact.id)}
                  />
                  {fact.text}
                </label>
              ))}
            </section>
          )}

          <Button
            size="sm"
            onClick={handleRegenerateFromSelection}
            disabled={isGenerating || isPhrasing || !selectionComputed}
            className="self-start"
          >
            {isPhrasing ? "Updating..." : "Regenerate from this selection"}
          </Button>
        </div>
      </details>

      <details className="rounded-lg border border-zinc-300 p-3 dark:border-zinc-700">
        <summary className="cursor-pointer text-sm font-medium">
          Customize before generating: Review phrasing
        </summary>
        <div className="mt-3 flex flex-col gap-4">
          {phraseNotice && (
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
              {phraseNotice}
            </p>
          )}

          {selectedBulletsInReview.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Generate the tailored resume once, or suggest and regenerate a
              selection above, to see phrasing here.
            </p>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                {selectedBulletsInReview.map(([factId, entry]) => (
                  <div
                    key={factId}
                    className="rounded-md border border-zinc-200 p-2 text-sm dark:border-zinc-800"
                  >
                    <label className="flex items-center gap-2 text-xs font-medium">
                      <input
                        type="checkbox"
                        checked={entry.usePhrased}
                        onChange={() => toggleUsePhrased(factId)}
                      />
                      Use phrased version
                    </label>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      Original: {entry.original}
                    </p>
                    <p className="text-xs text-black dark:text-zinc-50">
                      Phrased: {entry.phrasedText}
                    </p>
                  </div>
                ))}
              </div>
              <Button
                size="sm"
                onClick={handleRegeneratePdfOnly}
                disabled={isGenerating}
                className="self-start"
              >
                Regenerate PDF with these choices
              </Button>
            </>
          )}
        </div>
      </details>
    </div>
  );
}
