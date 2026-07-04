"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { JobDescriptionInput } from "@/components/forms/JobDescriptionInput";
import { ResumeGenerator } from "@/components/preview/ResumeGenerator";
import type { RankedKeyword } from "@/types/application";

export default function GeneratorPage() {
  const [jobDescription, setJobDescription] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [keywords, setKeywords] = useState<RankedKeyword[]>([]);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  async function handleExtracted(text: string) {
    setJobDescription(text);
    setIsAnalyzing(true);
    setAnalyzeError(null);
    setSavedNotice(null);

    try {
      const response = await fetch("/api/jd/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await response.json();

      if (!response.ok) {
        setAnalyzeError(
          data.error ?? "Could not analyze this job description.",
        );
        return;
      }

      setJobTitle(data.title);
      setCompany(data.company);
      setKeywords(data.keywords);
    } catch {
      setAnalyzeError(
        "Could not reach the server. Check your connection and try again.",
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleSaveDraft() {
    if (!jobDescription) return;
    setIsSaving(true);
    setSaveError(null);

    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle,
          company,
          jobDescription,
          keywords,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setSaveError(data.error ?? "Could not save this application.");
        return;
      }

      setSavedNotice("Draft application saved.");
    } catch {
      setSaveError(
        "Could not reach the server. Check your connection and try again.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleStartOver() {
    setJobDescription(null);
    setJobTitle("");
    setCompany("");
    setKeywords([]);
    setAnalyzeError(null);
    setSaveError(null);
    setSavedNotice(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Generator</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Paste or upload a job description to extract keywords, save a draft
          application, and generate a tailored resume PDF. ATS scoring and
          the tracking table are built in later phases.
        </p>
      </div>

      {jobDescription === null && (
        <JobDescriptionInput onExtracted={handleExtracted} />
      )}

      {isAnalyzing && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Analyzing job description...
        </p>
      )}

      {analyzeError && (
        <p className="text-sm font-medium text-red-600 dark:text-red-400">
          {analyzeError}
        </p>
      )}

      {jobDescription !== null && !isAnalyzing && (
        <div className="flex flex-col gap-6">
          <Button
            variant="outline"
            size="sm"
            className="self-start"
            onClick={handleStartOver}
          >
            Start over with a different job description
          </Button>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">
                Job title
              </span>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-black dark:border-zinc-700 dark:bg-black dark:text-zinc-50"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">
                Company
              </span>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-black dark:border-zinc-700 dark:bg-black dark:text-zinc-50"
              />
            </label>
          </div>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">Extracted keywords</h2>
            {keywords.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                No keywords found.
              </p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {keywords.map((keyword) => (
                  <li
                    key={keyword.term}
                    className="rounded-full border border-zinc-300 px-3 py-1 text-sm text-black dark:border-zinc-700 dark:text-zinc-50"
                  >
                    {keyword.term}
                    <span className="ml-1 text-xs text-zinc-500 dark:text-zinc-400">
                      x{keyword.score}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">Job description</h2>
            <pre className="max-h-64 overflow-auto rounded-lg border border-zinc-300 bg-white p-4 font-mono text-xs whitespace-pre-wrap text-black dark:border-zinc-700 dark:bg-black dark:text-zinc-50">
              {jobDescription}
            </pre>
          </section>

          <div className="flex items-center gap-3">
            <Button
              onClick={handleSaveDraft}
              disabled={isSaving || !jobTitle.trim() || !company.trim()}
            >
              {isSaving ? "Saving..." : "Save draft application"}
            </Button>
            {savedNotice && (
              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                {savedNotice}
              </span>
            )}
          </div>
          {saveError && (
            <p className="text-sm font-medium text-red-600 dark:text-red-400">
              {saveError}
            </p>
          )}

          <hr className="border-zinc-200 dark:border-zinc-800" />

          <ResumeGenerator
            jobDescription={jobDescription}
            keywords={keywords.map((k) => k.term)}
          />
        </div>
      )}
    </div>
  );
}
