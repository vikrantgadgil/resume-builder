"use client";

import { useEffect, useMemo, useState } from "react";
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

export function ResumeGenerator() {
  const [isLoading, setIsLoading] = useState(true);
  const [header, setHeader] = useState<ProfileHeader>(emptyHeader());
  const [skeleton, setSkeleton] = useState<Skeleton>(emptySkeleton());
  const [facts, setFacts] = useState<Fact[]>([]);

  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(new Set());
  const [selectedEducationIds, setSelectedEducationIds] = useState<Set<string>>(
    new Set(),
  );
  const [selectedCertificationIds, setSelectedCertificationIds] = useState<
    Set<string>
  >(new Set());
  const [selectedFactIds, setSelectedFactIds] = useState<Set<string>>(new Set());

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
        const loadedFacts: Fact[] = data.facts ?? [];
        setFacts(loadedFacts);

        if (data.profile) {
          setSelectedRoleIds(
            new Set(data.profile.skeleton.roles.map((r: { id: string }) => r.id)),
          );
          setSelectedEducationIds(
            new Set(
              data.profile.skeleton.education.map((e: { id: string }) => e.id),
            ),
          );
          setSelectedCertificationIds(
            new Set(
              data.profile.skeleton.certifications.map(
                (c: { id: string }) => c.id,
              ),
            ),
          );
        }
        setSelectedFactIds(new Set(loadedFacts.map((f) => f.id)));
      })
      .finally(() => setIsLoading(false));
  }, []);

  function toggleRole(id: string) {
    setSelectedRoleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleEducation(id: string) {
    setSelectedEducationIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleCertification(id: string) {
    setSelectedCertificationIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleFact(id: string) {
    setSelectedFactIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const unattachedFacts = useMemo(
    () => facts.filter((f) => !f.roleRef),
    [facts],
  );

  async function handleGenerate() {
    setIsGenerating(true);
    setGenerateError(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setPageCount(null);

    try {
      const data: ResumeDocumentData = {
        header,
        roles: skeleton.roles
          .filter((role) => selectedRoleIds.has(role.id))
          .map((role) => ({
            role,
            facts: facts.filter(
              (f) => f.roleRef === role.id && selectedFactIds.has(f.id),
            ),
          })),
        education: skeleton.education.filter((entry) =>
          selectedEducationIds.has(entry.id),
        ),
        certifications: skeleton.certifications.filter((entry) =>
          selectedCertificationIds.has(entry.id),
        ),
        skills: unattachedFacts.filter((f) => selectedFactIds.has(f.id)),
      };

      const blob = await pdf(<ResumeDocument data={data} />).toBlob();
      const pages = await countPdfPages(blob);

      if (pages > MAX_PAGES) {
        setGenerateError(
          `This selection produces ${pages} pages, which is over the ${MAX_PAGES} page limit. Uncheck some items below and try again.`,
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
        <h2 className="text-lg font-semibold">Generate resume PDF</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Everything is included by default. Uncheck items to fit within 2
          pages. Nothing is cut without you choosing to leave it out.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {skeleton.roles.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className="font-medium">Experience</h3>
            {skeleton.roles.map((role) => {
              const roleFacts = facts.filter((f) => f.roleRef === role.id);
              const roleChecked = selectedRoleIds.has(role.id);
              return (
                <div
                  key={role.id}
                  className="rounded-md border border-zinc-200 p-2 text-sm dark:border-zinc-800"
                >
                  <label className="flex items-center gap-2 font-medium">
                    <input
                      type="checkbox"
                      checked={roleChecked}
                      onChange={() => toggleRole(role.id)}
                    />
                    {role.title} at {role.employer}
                  </label>
                  <div className="mt-1 flex flex-col gap-1 pl-6">
                    {roleFacts.map((fact) => (
                      <label
                        key={fact.id}
                        className={`flex items-start gap-2 text-xs ${
                          roleChecked
                            ? "text-zinc-700 dark:text-zinc-300"
                            : "text-zinc-400 dark:text-zinc-600"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedFactIds.has(fact.id)}
                          disabled={!roleChecked}
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

        {skeleton.education.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className="font-medium">Education</h3>
            {skeleton.education.map((entry) => (
              <label
                key={entry.id}
                className="flex items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={selectedEducationIds.has(entry.id)}
                  onChange={() => toggleEducation(entry.id)}
                />
                {entry.degree}, {entry.institution}
              </label>
            ))}
          </section>
        )}

        {skeleton.certifications.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className="font-medium">Certifications</h3>
            {skeleton.certifications.map((entry) => (
              <label
                key={entry.id}
                className="flex items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={selectedCertificationIds.has(entry.id)}
                  onChange={() => toggleCertification(entry.id)}
                />
                {entry.name}
              </label>
            ))}
          </section>
        )}

        {unattachedFacts.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className="font-medium">Skills</h3>
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
      </div>

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
