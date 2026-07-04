"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  roleLabel,
  educationLabel,
  certificationLabel,
} from "@/lib/reconcile-engine";
import type {
  CertificationCandidate,
  Certification,
  EducationCandidate,
  Education,
  Fact,
  FactCandidate,
  ProfileHeader,
  RoleCandidate,
  Role,
  Skeleton,
} from "@/types/profile";

export type NeedsReviewItem<C, E> = {
  existingItem: E;
  candidate: C;
  reason: string;
};

export type ReconcileResult = {
  header?: ProfileHeader;
  roles: {
    autoSkipCount: number;
    newItems: RoleCandidate[];
    needsReview: NeedsReviewItem<RoleCandidate, Role>[];
    overflowCount: number;
  };
  education: {
    autoSkipCount: number;
    newItems: EducationCandidate[];
    needsReview: NeedsReviewItem<EducationCandidate, Education>[];
    overflowCount: number;
  };
  certifications: {
    autoSkipCount: number;
    newItems: CertificationCandidate[];
    needsReview: NeedsReviewItem<CertificationCandidate, Certification>[];
    overflowCount: number;
  };
  facts: {
    autoSkipCount: number;
    newItems: FactCandidate[];
    needsReview: NeedsReviewItem<FactCandidate, { id: string; text: string }>[];
    overflowCount: number;
  };
};

type ResolutionAction = "keep_existing" | "keep_new" | "keep_both";
type FactResolutionAction = ResolutionAction | "merge";

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="text-zinc-500 dark:text-zinc-400">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-zinc-300 bg-white px-2 py-1 text-black dark:border-zinc-700 dark:bg-black dark:text-zinc-50"
      />
    </label>
  );
}

export function ImportReview({
  result,
  onApproved,
  onCancel,
}: {
  result: ReconcileResult;
  onApproved: (result: {
    header: ProfileHeader;
    skeleton: Skeleton;
    facts: Fact[];
    summary: string;
  }) => void;
  onCancel: () => void;
}) {
  const [roles, setRoles] = useState(
    result.roles.newItems.map((r) => ({ ...r, include: true })),
  );
  const [education, setEducation] = useState(
    result.education.newItems.map((e) => ({ ...e, include: true })),
  );
  const [certifications, setCertifications] = useState(
    result.certifications.newItems.map((c) => ({ ...c, include: true })),
  );
  const [facts, setFacts] = useState(
    result.facts.newItems.map((f) => ({
      ...f,
      include: true,
      tagsText: f.tags.join(", "),
      attachSuggestedRole: Boolean(f.suggestedRoleEmployer),
    })),
  );

  const [roleReviews, setRoleReviews] = useState(
    result.roles.needsReview.map((item) => ({
      ...item,
      action: "keep_existing" as ResolutionAction,
      value: item.candidate,
    })),
  );
  const [educationReviews, setEducationReviews] = useState(
    result.education.needsReview.map((item) => ({
      ...item,
      action: "keep_existing" as ResolutionAction,
      value: item.candidate,
    })),
  );
  const [certificationReviews, setCertificationReviews] = useState(
    result.certifications.needsReview.map((item) => ({
      ...item,
      action: "keep_existing" as ResolutionAction,
      value: item.candidate,
    })),
  );
  const [factReviews, setFactReviews] = useState(
    result.facts.needsReview.map((item) => ({
      ...item,
      action: "keep_existing" as FactResolutionAction,
      value: item.candidate.text,
      tagsText: item.candidate.tags.join(", "),
    })),
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
          header: result.header,
          approvedRoles: roles.filter((r) => r.include),
          approvedEducation: education.filter((e) => e.include),
          approvedCertifications: certifications.filter((c) => c.include),
          approvedFacts: facts
            .filter((f) => f.include)
            .map((f) => ({
              text: f.text,
              tags: f.tagsText.split(",").map((t) => t.trim()).filter(Boolean),
              suggestedRoleEmployer:
                f.attachSuggestedRole && f.suggestedRoleEmployer
                  ? f.suggestedRoleEmployer
                  : "",
              suggestedRoleTitle:
                f.attachSuggestedRole && f.suggestedRoleTitle
                  ? f.suggestedRoleTitle
                  : "",
              confidence: null,
            })),
          roleResolutions: roleReviews.map((r) => ({
            existingId: r.existingItem.id,
            action: r.action,
            value: r.value,
          })),
          educationResolutions: educationReviews.map((r) => ({
            existingId: r.existingItem.id,
            action: r.action,
            value: r.value,
          })),
          certificationResolutions: certificationReviews.map((r) => ({
            existingId: r.existingItem.id,
            action: r.action,
            value: r.value,
          })),
          factResolutions: factReviews.map((r) => ({
            existingFactId: r.existingItem.id,
            action: r.action,
            value: r.value,
            tags: r.tagsText.split(",").map((t) => t.trim()).filter(Boolean),
          })),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Could not save the merge.");
        return;
      }

      const skipped =
        data.skippedDuplicateRoles +
        data.skippedDuplicateEducation +
        data.skippedDuplicateCertifications +
        data.skippedDuplicateFacts;
      const resolved =
        data.resolvedRoles +
        data.resolvedEducation +
        data.resolvedCertifications +
        data.resolvedFacts;
      const summary = `Added ${data.addedRoles} role(s), ${data.addedEducation} education entr(y/ies), ${data.addedCertifications} certification(s), and ${data.addedFacts} fact(s). Resolved ${resolved} reviewed pair(s). Skipped ${skipped} exact duplicate(s).`;

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

  const totalNeedsReview =
    roleReviews.length +
    educationReviews.length +
    certificationReviews.length +
    factReviews.length;
  const totalAutoSkip =
    result.roles.autoSkipCount +
    result.education.autoSkipCount +
    result.certifications.autoSkipCount +
    result.facts.autoSkipCount;
  const totalOverflow =
    result.roles.overflowCount +
    result.education.overflowCount +
    result.certifications.overflowCount +
    result.facts.overflowCount;

  return (
    <div className="flex flex-col gap-6 rounded-lg border border-zinc-300 p-4 dark:border-zinc-700">
      <div>
        <h2 className="text-lg font-semibold">Review import</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Nothing is saved until you approve.
        </p>
      </div>

      {totalAutoSkip > 0 && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Already in your profile, skipped automatically: {totalAutoSkip} item(s).
        </p>
      )}

      {totalOverflow > 0 && (
        <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
          {totalOverflow} item(s) were not compared automatically due to volume.
          Review them manually below.
        </p>
      )}

      {totalNeedsReview > 0 && (
        <section className="flex flex-col gap-4">
          <h3 className="font-medium">Needs review</h3>

          {roleReviews.map((item, index) => (
            <div
              key={`role-${index}`}
              className="flex flex-col gap-2 rounded-md border border-amber-300 p-3 text-sm dark:border-amber-800"
            >
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {item.reason === "unresolved"
                  ? "Could not compare automatically"
                  : item.reason === "overflow"
                    ? "Not compared due to volume"
                    : "Likely the same role, phrased differently"}
              </p>
              <p>
                <strong>Existing:</strong> {roleLabel(item.existingItem)}
              </p>
              <p>
                <strong>New:</strong> {roleLabel(item.candidate)}
              </p>
              <div className="flex flex-wrap gap-3">
                {(["keep_existing", "keep_new", "keep_both"] as const).map(
                  (action) => (
                    <label key={action} className="flex items-center gap-1">
                      <input
                        type="radio"
                        name={`role-review-${index}`}
                        checked={item.action === action}
                        onChange={() =>
                          setRoleReviews((prev) =>
                            prev.map((r, i) =>
                              i === index ? { ...r, action } : r,
                            ),
                          )
                        }
                      />
                      {action === "keep_existing"
                        ? "Keep existing"
                        : action === "keep_new"
                          ? "Keep new"
                          : "Keep both (different)"}
                    </label>
                  ),
                )}
              </div>
              {item.action !== "keep_existing" && (
                <div className="grid grid-cols-2 gap-2">
                  <TextField
                    label="Title"
                    value={item.value.title}
                    onChange={(v) =>
                      setRoleReviews((prev) =>
                        prev.map((r, i) =>
                          i === index
                            ? { ...r, value: { ...r.value, title: v } }
                            : r,
                        ),
                      )
                    }
                  />
                  <TextField
                    label="Employer"
                    value={item.value.employer}
                    onChange={(v) =>
                      setRoleReviews((prev) =>
                        prev.map((r, i) =>
                          i === index
                            ? { ...r, value: { ...r.value, employer: v } }
                            : r,
                        ),
                      )
                    }
                  />
                </div>
              )}
            </div>
          ))}

          {educationReviews.map((item, index) => (
            <div
              key={`education-${index}`}
              className="flex flex-col gap-2 rounded-md border border-amber-300 p-3 text-sm dark:border-amber-800"
            >
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {item.reason === "unresolved"
                  ? "Could not compare automatically"
                  : item.reason === "overflow"
                    ? "Not compared due to volume"
                    : "Likely the same education entry, phrased differently"}
              </p>
              <p>
                <strong>Existing:</strong> {educationLabel(item.existingItem)}
              </p>
              <p>
                <strong>New:</strong> {educationLabel(item.candidate)}
              </p>
              <div className="flex flex-wrap gap-3">
                {(["keep_existing", "keep_new", "keep_both"] as const).map(
                  (action) => (
                    <label key={action} className="flex items-center gap-1">
                      <input
                        type="radio"
                        name={`education-review-${index}`}
                        checked={item.action === action}
                        onChange={() =>
                          setEducationReviews((prev) =>
                            prev.map((e, i) =>
                              i === index ? { ...e, action } : e,
                            ),
                          )
                        }
                      />
                      {action === "keep_existing"
                        ? "Keep existing"
                        : action === "keep_new"
                          ? "Keep new"
                          : "Keep both (different)"}
                    </label>
                  ),
                )}
              </div>
            </div>
          ))}

          {certificationReviews.map((item, index) => (
            <div
              key={`certification-${index}`}
              className="flex flex-col gap-2 rounded-md border border-amber-300 p-3 text-sm dark:border-amber-800"
            >
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {item.reason === "unresolved"
                  ? "Could not compare automatically"
                  : item.reason === "overflow"
                    ? "Not compared due to volume"
                    : "Likely the same certification, phrased differently"}
              </p>
              <p>
                <strong>Existing:</strong> {certificationLabel(item.existingItem)}
              </p>
              <p>
                <strong>New:</strong> {certificationLabel(item.candidate)}
              </p>
              <div className="flex flex-wrap gap-3">
                {(["keep_existing", "keep_new", "keep_both"] as const).map(
                  (action) => (
                    <label key={action} className="flex items-center gap-1">
                      <input
                        type="radio"
                        name={`certification-review-${index}`}
                        checked={item.action === action}
                        onChange={() =>
                          setCertificationReviews((prev) =>
                            prev.map((c, i) =>
                              i === index ? { ...c, action } : c,
                            ),
                          )
                        }
                      />
                      {action === "keep_existing"
                        ? "Keep existing"
                        : action === "keep_new"
                          ? "Keep new"
                          : "Keep both (different)"}
                    </label>
                  ),
                )}
              </div>
            </div>
          ))}

          {factReviews.map((item, index) => (
            <div
              key={`fact-${index}`}
              className="flex flex-col gap-2 rounded-md border border-amber-300 p-3 text-sm dark:border-amber-800"
            >
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {item.reason === "unresolved"
                  ? "Could not compare automatically"
                  : item.reason === "overflow"
                    ? "Not compared due to volume"
                    : "Overlapping claim, different level of detail"}
              </p>
              <p>
                <strong>Existing:</strong> {item.existingItem.text}
              </p>
              <p>
                <strong>New:</strong> {item.candidate.text}
              </p>
              <div className="flex flex-wrap gap-3">
                {(
                  ["keep_existing", "keep_new", "keep_both", "merge"] as const
                ).map((action) => (
                  <label key={action} className="flex items-center gap-1">
                    <input
                      type="radio"
                      name={`fact-review-${index}`}
                      checked={item.action === action}
                      onChange={() =>
                        setFactReviews((prev) =>
                          prev.map((f, i) =>
                            i === index
                              ? {
                                  ...f,
                                  action,
                                  value:
                                    action === "merge"
                                      ? `${f.existingItem.text} ${f.candidate.text}`
                                      : f.value,
                                }
                              : f,
                          ),
                        )
                      }
                    />
                    {action === "keep_existing"
                      ? "Keep existing"
                      : action === "keep_new"
                        ? "Keep new"
                        : action === "keep_both"
                          ? "Keep both"
                          : "Merge (edit below)"}
                  </label>
                ))}
              </div>
              {(item.action === "merge" || item.action === "keep_new") && (
                <Textarea
                  value={item.value}
                  onChange={(e) =>
                    setFactReviews((prev) =>
                      prev.map((f, i) =>
                        i === index ? { ...f, value: e.target.value } : f,
                      ),
                    )
                  }
                  rows={2}
                />
              )}
            </div>
          ))}
        </section>
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
              <span>{roleLabel(role)}</span>
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
              <span>{educationLabel(entry)}</span>
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
              <span>{certificationLabel(entry)}</span>
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
                {fact.suggestedRoleEmployer && (
                  <label className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                    <input
                      type="checkbox"
                      checked={fact.attachSuggestedRole}
                      onChange={(e) =>
                        setFacts((prev) =>
                          prev.map((f, i) =>
                            i === index
                              ? { ...f, attachSuggestedRole: e.target.checked }
                              : f,
                          ),
                        )
                      }
                    />
                    Suggested role: {fact.suggestedRoleTitle} at{" "}
                    {fact.suggestedRoleEmployer}
                    {fact.confidence ? ` (${fact.confidence} confidence)` : ""}
                  </label>
                )}
              </div>
            </div>
          ))}
        </section>
      )}

      {roles.length === 0 &&
        education.length === 0 &&
        certifications.length === 0 &&
        facts.length === 0 &&
        totalNeedsReview === 0 && (
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
