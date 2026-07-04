"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  isDuplicateCertification,
  isDuplicateEducation,
  isDuplicateFact,
  isDuplicateRole,
} from "@/lib/knowledge-merge";
import type {
  CertificationCandidate,
  EducationCandidate,
  Fact,
  FactCandidate,
  ProfileHeader,
  RoleCandidate,
  Skeleton,
} from "@/types/profile";

type Candidates = {
  header?: ProfileHeader;
  roles: RoleCandidate[];
  education: EducationCandidate[];
  certifications: CertificationCandidate[];
  facts: FactCandidate[];
};

export function ImportReview({
  candidates,
  existingSkeleton,
  existingFacts,
  onApproved,
  onCancel,
}: {
  candidates: Candidates;
  existingSkeleton: Skeleton;
  existingFacts: Fact[];
  onApproved: (result: {
    header: ProfileHeader;
    skeleton: Skeleton;
    facts: Fact[];
    summary: string;
  }) => void;
  onCancel: () => void;
}) {
  const newRoles = useMemo(
    () =>
      candidates.roles.filter(
        (r) => !isDuplicateRole(r, existingSkeleton.roles),
      ),
    [candidates.roles, existingSkeleton.roles],
  );
  const skippedRoles = candidates.roles.length - newRoles.length;

  const newEducation = useMemo(
    () =>
      candidates.education.filter(
        (e) => !isDuplicateEducation(e, existingSkeleton.education),
      ),
    [candidates.education, existingSkeleton.education],
  );
  const skippedEducation = candidates.education.length - newEducation.length;

  const newCertifications = useMemo(
    () =>
      candidates.certifications.filter(
        (c) => !isDuplicateCertification(c, existingSkeleton.certifications),
      ),
    [candidates.certifications, existingSkeleton.certifications],
  );
  const skippedCertifications =
    candidates.certifications.length - newCertifications.length;

  const newFacts = useMemo(
    () => candidates.facts.filter((f) => !isDuplicateFact(f.text, existingFacts)),
    [candidates.facts, existingFacts],
  );
  const skippedFacts = candidates.facts.length - newFacts.length;

  const [header] = useState<ProfileHeader | undefined>(candidates.header);
  const [roles, setRoles] = useState(newRoles.map((r) => ({ ...r, include: true })));
  const [education, setEducation] = useState(
    newEducation.map((e) => ({ ...e, include: true })),
  );
  const [certifications, setCertifications] = useState(
    newCertifications.map((c) => ({ ...c, include: true })),
  );
  const [facts, setFacts] = useState(
    newFacts.map((f) => ({ ...f, include: true, tagsText: f.tags.join(", ") })),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApprove() {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/profile/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          header,
          approvedRoles: roles.filter((r) => r.include),
          approvedEducation: education.filter((e) => e.include),
          approvedCertifications: certifications.filter((c) => c.include),
          approvedFacts: facts
            .filter((f) => f.include)
            .map((f) => ({
              text: f.text,
              tags: f.tagsText
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean),
            })),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Could not save the merge.");
        return;
      }

      const summary = `Added ${data.addedRoles} role(s), ${data.addedEducation} education entr(y/ies), ${data.addedCertifications} certification(s), and ${data.addedFacts} fact(s). Skipped ${data.skippedDuplicateRoles + data.skippedDuplicateEducation + data.skippedDuplicateCertifications + data.skippedDuplicateFacts} exact duplicate(s).`;

      onApproved({
        header: data.header,
        skeleton: data.skeleton,
        facts: data.facts,
        summary,
      });
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 rounded-lg border border-zinc-300 p-4 dark:border-zinc-700">
      <div>
        <h2 className="text-lg font-semibold">Review import</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Nothing is saved until you approve. Uncheck anything you do not want
          to add.
        </p>
      </div>

      {(skippedRoles > 0 ||
        skippedEducation > 0 ||
        skippedCertifications > 0 ||
        skippedFacts > 0) && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Already in your profile, skipped automatically: {skippedRoles} role(s),{" "}
          {skippedEducation} education entr(y/ies), {skippedCertifications}{" "}
          certification(s), {skippedFacts} fact(s).
        </p>
      )}

      {roles.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="font-medium">New roles</h3>
          {roles.map((role, index) => (
            <label
              key={index}
              className="flex items-start gap-2 rounded-md border border-zinc-200 p-2 text-sm dark:border-zinc-800"
            >
              <input
                type="checkbox"
                checked={role.include}
                onChange={(e) =>
                  setRoles((prev) =>
                    prev.map((r, i) =>
                      i === index ? { ...r, include: e.target.checked } : r,
                    ),
                  )
                }
                className="mt-1"
              />
              <span>
                {role.title} at {role.employer} ({role.startDate}
                {role.endDate ? ` - ${role.endDate}` : ""})
              </span>
            </label>
          ))}
        </section>
      )}

      {education.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="font-medium">New education</h3>
          {education.map((entry, index) => (
            <label
              key={index}
              className="flex items-start gap-2 rounded-md border border-zinc-200 p-2 text-sm dark:border-zinc-800"
            >
              <input
                type="checkbox"
                checked={entry.include}
                onChange={(e) =>
                  setEducation((prev) =>
                    prev.map((ed, i) =>
                      i === index ? { ...ed, include: e.target.checked } : ed,
                    ),
                  )
                }
                className="mt-1"
              />
              <span>
                {entry.degree}, {entry.institution} {entry.year}
              </span>
            </label>
          ))}
        </section>
      )}

      {certifications.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="font-medium">New certifications</h3>
          {certifications.map((entry, index) => (
            <label
              key={index}
              className="flex items-start gap-2 rounded-md border border-zinc-200 p-2 text-sm dark:border-zinc-800"
            >
              <input
                type="checkbox"
                checked={entry.include}
                onChange={(e) =>
                  setCertifications((prev) =>
                    prev.map((c, i) =>
                      i === index ? { ...c, include: e.target.checked } : c,
                    ),
                  )
                }
                className="mt-1"
              />
              <span>
                {entry.name} {entry.issuer ? `(${entry.issuer})` : ""}{" "}
                {entry.year}
              </span>
            </label>
          ))}
        </section>
      )}

      {facts.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="font-medium">New facts</h3>
          {facts.map((fact, index) => (
            <div
              key={index}
              className="flex items-start gap-2 rounded-md border border-zinc-200 p-2 text-sm dark:border-zinc-800"
            >
              <input
                type="checkbox"
                checked={fact.include}
                onChange={(e) =>
                  setFacts((prev) =>
                    prev.map((f, i) =>
                      i === index ? { ...f, include: e.target.checked } : f,
                    ),
                  )
                }
                className="mt-1"
              />
              <div className="flex flex-1 flex-col gap-1">
                <span>{fact.text}</span>
                <input
                  type="text"
                  value={fact.tagsText}
                  onChange={(e) =>
                    setFacts((prev) =>
                      prev.map((f, i) =>
                        i === index ? { ...f, tagsText: e.target.value } : f,
                      ),
                    )
                  }
                  placeholder="Tags (comma separated)"
                  className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-black dark:border-zinc-700 dark:bg-black dark:text-zinc-50"
                />
              </div>
            </div>
          ))}
        </section>
      )}

      {roles.length === 0 &&
        education.length === 0 &&
        certifications.length === 0 &&
        facts.length === 0 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Nothing new was found in this resume beyond what is already in
            your profile.
          </p>
        )}

      <div className="flex items-center gap-3">
        <Button onClick={handleApprove} disabled={isSaving}>
          {isSaving ? "Saving..." : "Approve merge"}
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
      </div>
      {error && (
        <p className="text-sm font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
