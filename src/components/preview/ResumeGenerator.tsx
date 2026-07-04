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
  const [hasSuggested, setHasSuggested] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectNotice, setSelectNotice] = useState<string | null>(null);

  const [phrasedBullets, setPhrasedBullets] = useState<Map<
    string,
    PhrasedEntry
  > | null>(null);
  const [isPhrasing, setIsPhrasing] = useState(false);
  const [phraseNotice, setPhraseNotice] = useState<string | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);

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

  function resetDownstream() {
    setPhrasedBullets(null);
    setPhraseNotice(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPageCount(null);
    setGenerateError(null);
  }

  async function handleSuggestSelection() {
    setIsSelecting(true);
    setSelectNotice(null);
    resetDownstream();

    try {
      const response = await fetch("/api/tailor/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription, keywords }),
      });
      const data = await response.json();

      if (!response.ok || data.fallback) {
        setSelectedFactIds(new Set(facts.map((f) => f.id)));
        setSelectNotice(
          `AI selection did not succeed${data.reason ? ` (${data.reason})` : ""}. Showing everything so you can choose manually.`,
        );
      } else {
        setSelectedFactIds(new Set(data.selectedFactIds));
      }
      setHasSuggested(true);
    } catch {
      setSelectedFactIds(new Set(facts.map((f) => f.id)));
      setSelectNotice(
        "Could not reach the server to suggest a selection. Showing everything so you can choose manually.",
      );
      setHasSuggested(true);
    } finally {
      setIsSelecting(false);
    }
  }

  function toggleFact(id: string) {
    setSelectedFactIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    resetDownstream();
  }

  const unattachedFacts = facts.filter((f) => !f.roleRef);

  async function handlePhrase() {
    setIsPhrasing(true);
    setPhraseNotice(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPageCount(null);

    function fallbackMap(): Map<string, PhrasedEntry> {
      const map = new Map<string, PhrasedEntry>();
      for (const id of selectedFactIds) {
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
          factIds: Array.from(selectedFactIds),
        }),
      });
      const data = await response.json();

      if (!response.ok || data.fallback) {
        setPhraseNotice(
          `AI phrasing did not succeed${data.reason ? ` (${data.reason})` : ""}. Using original fact text instead.`,
        );
        setPhrasedBullets(fallbackMap());
      } else {
        const map = new Map<string, PhrasedEntry>();
        for (const bullet of data.bullets) {
          map.set(bullet.factId, {
            original: bullet.original,
            phrasedText: bullet.phrasedText,
            usePhrased: true,
          });
        }
        setPhrasedBullets(map);
      }
    } catch {
      setPhraseNotice(
        "Could not reach the server to phrase these bullets. Using original fact text instead.",
      );
      setPhrasedBullets(fallbackMap());
    } finally {
      setIsPhrasing(false);
    }
  }

  function toggleUsePhrased(factId: string) {
    setPhrasedBullets((prev) => {
      if (!prev) return prev;
      const next = new Map(prev);
      const entry = next.get(factId);
      if (entry) next.set(factId, { ...entry, usePhrased: !entry.usePhrased });
      return next;
    });
  }

  async function handleGenerate() {
    if (!phrasedBullets) return;
    const bullets = phrasedBullets;
    setIsGenerating(true);
    setGenerateError(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setPageCount(null);

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
            .filter((f) => f.roleRef === role.id && selectedFactIds.has(f.id))
            .map((f) => bulletTextFor(f.id))
            .filter((text): text is string => text !== null),
        })),
        education: skeleton.education,
        certifications: skeleton.certifications,
        highlights: unattachedFacts
          .filter((f) => selectedFactIds.has(f.id))
          .map((f) => bulletTextFor(f.id))
          .filter((text): text is string => text !== null),
      };

      const blob = await pdf(<ResumeDocument data={data} />).toBlob();
      const pages = await countPdfPages(blob);

      if (pages > MAX_PAGES) {
        setGenerateError(
          `This selection produces ${pages} pages, which is over the ${MAX_PAGES} page limit. Uncheck a few facts above and phrase again.`,
        );
        setPageCount(pages);
        return;
      }

      setPreviewUrl(URL.createObjectURL(blob));
      setPageCount(pages);
    } catch {
      setGenerateError(
        "Could not generate the PDF. Check your selections and try again.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  if (isLoading) {
    return <p className="text-zinc-600 dark:text-zinc-400">Loading...</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold">Generate tailored resume PDF</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          AI suggests which facts from your knowledge base fit this job the
          best. Review and adjust before phrasing and generating. Roles,
          education, and certifications always render from your profile as
          stored.
        </p>
      </div>

      <Button
        onClick={handleSuggestSelection}
        disabled={isSelecting}
        className="self-start"
      >
        {isSelecting
          ? "Selecting..."
          : hasSuggested
            ? "Re-suggest selection"
            : "Suggest selection for this job description"}
      </Button>

      {selectNotice && (
        <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
          {selectNotice}
        </p>
      )}

      {hasSuggested && (
        <>
          <div className="flex flex-col gap-4">
            {skeleton.roles.length > 0 && (
              <section className="flex flex-col gap-2">
                <h3 className="font-medium">
                  Experience (all roles always included)
                </h3>
                {skeleton.roles.map((role) => {
                  const roleFacts = facts.filter(
                    (f) => f.roleRef === role.id,
                  );
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
                <h3 className="font-medium">
                  Selected Highlights (unattached facts)
                </h3>
                {unattachedFacts.map((fact) => (
                  <label
                    key={fact.id}
                    className="flex items-center gap-2 text-sm"
                  >
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
          </div>

          <Button
            onClick={handlePhrase}
            disabled={isPhrasing || selectedFactIds.size === 0}
            className="self-start"
          >
            {isPhrasing ? "Phrasing..." : "Phrase selected facts"}
          </Button>
        </>
      )}

      {phraseNotice && (
        <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
          {phraseNotice}
        </p>
      )}

      {phrasedBullets && phrasedBullets.size > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="font-medium">Review phrasing</h3>
          {Array.from(phrasedBullets.entries()).map(([factId, entry]) => (
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
        </section>
      )}

      {phrasedBullets && (
        <div className="flex items-center gap-3">
          <Button onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? "Generating..." : "Generate PDF"}
          </Button>
          {pageCount !== null && (
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              {pageCount} page{pageCount === 1 ? "" : "s"}
            </span>
          )}
        </div>
      )}

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
    </div>
  );
}
