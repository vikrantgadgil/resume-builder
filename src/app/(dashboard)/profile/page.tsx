"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ResumeUpload } from "@/components/forms/ResumeUpload";
import { ProfileEditor } from "@/components/forms/ProfileEditor";
import { ImportReview } from "@/components/forms/ImportReview";
import { AddFact } from "@/components/forms/AddFact";
import { FactsList } from "@/components/forms/FactsList";
import { renderProfileMarkdown } from "@/lib/profile-markdown";
import {
  emptyHeader,
  emptySkeleton,
  type CertificationCandidate,
  type EducationCandidate,
  type Fact,
  type FactCandidate,
  type ProfileHeader,
  type RoleCandidate,
  type Skeleton,
} from "@/types/profile";

type Candidates = {
  header?: ProfileHeader;
  roles: RoleCandidate[];
  education: EducationCandidate[];
  certifications: CertificationCandidate[];
  facts: FactCandidate[];
};

export default function ProfilePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [header, setHeader] = useState<ProfileHeader>(emptyHeader());
  const [skeleton, setSkeleton] = useState<Skeleton>(emptySkeleton());
  const [facts, setFacts] = useState<Fact[]>([]);
  const [hasProfile, setHasProfile] = useState(false);

  const [showUploader, setShowUploader] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractNotice, setExtractNotice] = useState<string | null>(null);
  const [pendingCandidates, setPendingCandidates] = useState<Candidates | null>(
    null,
  );
  const [mergeNotice, setMergeNotice] = useState<string | null>(null);
  const [editorKey, setEditorKey] = useState(0);

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data.profile) {
          setHeader(data.profile.header);
          setSkeleton(data.profile.skeleton);
          setHasProfile(true);
        } else {
          setShowUploader(true);
        }
        setFacts(data.facts ?? []);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const markdown = useMemo(
    () => renderProfileMarkdown(header, skeleton, facts),
    [header, skeleton, facts],
  );

  async function handleConfirmedText(rawText: string) {
    setIsExtracting(true);
    setExtractNotice(null);
    setMergeNotice(null);

    try {
      const response = await fetch("/api/profile/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText }),
      });
      const data = await response.json();

      if (data.fallback) {
        setExtractNotice(
          `AI extraction did not succeed (${data.reason}). Add facts manually below, or edit the skeleton by hand.`,
        );
        setPendingCandidates(null);
      } else {
        setPendingCandidates({
          header: data.hasHeader ? data.header : undefined,
          roles: data.roles,
          education: data.education,
          certifications: data.certifications,
          facts: data.facts,
        });
      }
    } catch {
      setExtractNotice(
        "Could not reach the server to extract this resume. Add facts manually below, or edit the skeleton by hand.",
      );
      setPendingCandidates(null);
    } finally {
      setIsExtracting(false);
      setShowUploader(false);
    }
  }

  function handleApproved(result: {
    header: ProfileHeader;
    skeleton: Skeleton;
    facts: Fact[];
    summary: string;
  }) {
    setHeader(result.header);
    setSkeleton(result.skeleton);
    setFacts(result.facts);
    setHasProfile(true);
    setPendingCandidates(null);
    setMergeNotice(result.summary);
    setEditorKey((k) => k + 1);
  }

  if (isLoading) {
    return <p className="text-zinc-600 dark:text-zinc-400">Loading...</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold">Profile</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Your profile is a knowledge base: a verified skeleton of roles,
          education, and certifications, plus a pool of facts you can draw on
          for any tailored resume.
        </p>
      </div>

      {hasProfile && !showUploader && !pendingCandidates && (
        <Button
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => setShowUploader(true)}
        >
          Import another resume
        </Button>
      )}

      {showUploader && <ResumeUpload onConfirm={handleConfirmedText} />}

      {isExtracting && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Extracting your resume with AI...
        </p>
      )}

      {extractNotice && (
        <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
          {extractNotice}
        </p>
      )}

      {mergeNotice && (
        <p className="text-sm font-medium text-green-600 dark:text-green-400">
          {mergeNotice}
        </p>
      )}

      {pendingCandidates && (
        <ImportReview
          candidates={pendingCandidates}
          existingSkeleton={skeleton}
          existingFacts={facts}
          onApproved={handleApproved}
          onCancel={() => setPendingCandidates(null)}
        />
      )}

      <ProfileEditor
        key={editorKey}
        initialHeader={header}
        initialSkeleton={skeleton}
        onSaved={(savedSkeleton) => {
          setSkeleton(savedSkeleton);
          setHasProfile(true);
        }}
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Add a fact</h2>
        <AddFact
          roles={skeleton.roles}
          onAdded={(fact) => setFacts((prev) => [...prev, fact])}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Facts</h2>
        <FactsList
          facts={facts}
          roles={skeleton.roles}
          onDeleted={(id) =>
            setFacts((prev) => prev.filter((f) => f.id !== id))
          }
        />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Markdown preview</h2>
        <pre className="max-h-96 overflow-auto rounded-lg border border-zinc-300 bg-white p-4 font-mono text-xs whitespace-pre-wrap text-black dark:border-zinc-700 dark:bg-black dark:text-zinc-50">
          {markdown || "Nothing to preview yet."}
        </pre>
      </section>
    </div>
  );
}
