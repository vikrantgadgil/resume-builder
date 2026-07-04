"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  roleLabel,
  educationLabel,
  certificationLabel,
} from "@/lib/reconcile-engine";
import type {
  Certification,
  Education,
  Fact,
  ProfileHeader,
  Role,
  Skeleton,
} from "@/types/profile";

type SelfPair<T> = { a: T; b: T; classification: string };
type FactSelfPair = {
  a: { id: string; text: string };
  b: { id: string; text: string };
  classification: string;
};

type ReconcileExistingResult = {
  roles: { pairs: SelfPair<Role>[]; overflowCount: number };
  education: { pairs: SelfPair<Education>[]; overflowCount: number };
  certifications: { pairs: SelfPair<Certification>[]; overflowCount: number };
  facts: { pairs: FactSelfPair[]; overflowCount: number };
};

type SelfAction = "keep_a" | "keep_b" | "keep_both";
type FactSelfAction = SelfAction | "merge";

function reasonLabel(classification: string, kind: string): string {
  if (classification === "unresolved") return "Could not compare automatically";
  if (classification === "overflow") return "Not compared due to volume";
  if (classification === "duplicate") return `Flagged as an exact duplicate ${kind}`;
  return `Likely the same ${kind}, phrased differently`;
}

export function ReconcileExisting({
  onApplied,
}: {
  onApplied: (result: { header: ProfileHeader; skeleton: Skeleton; facts: Fact[] }) => void;
}) {
  const [result, setResult] = useState<ReconcileExistingResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  const [roleActions, setRoleActions] = useState<SelfAction[]>([]);
  const [educationActions, setEducationActions] = useState<SelfAction[]>([]);
  const [certificationActions, setCertificationActions] = useState<SelfAction[]>([]);
  const [factActions, setFactActions] = useState<FactSelfAction[]>([]);
  const [factMergeText, setFactMergeText] = useState<string[]>([]);

  async function handleRun() {
    setIsRunning(true);
    setError(null);
    setSummary(null);

    try {
      const response = await fetch("/api/profile/reconcile-existing", {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Could not run reconciliation.");
        return;
      }

      setResult(data);
      setRoleActions(data.roles.pairs.map(() => "keep_both" as SelfAction));
      setEducationActions(
        data.education.pairs.map(() => "keep_both" as SelfAction),
      );
      setCertificationActions(
        data.certifications.pairs.map(() => "keep_both" as SelfAction),
      );
      setFactActions(data.facts.pairs.map(() => "keep_both" as FactSelfAction));
      setFactMergeText(
        data.facts.pairs.map(
          (p: FactSelfPair) => `${p.a.text} ${p.b.text}`,
        ),
      );
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setIsRunning(false);
    }
  }

  async function handleApply() {
    if (!result) return;
    setIsApplying(true);
    setError(null);

    try {
      const response = await fetch("/api/profile/reconcile-existing/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleResolutions: result.roles.pairs.map((pair, index) => ({
            aId: pair.a.id,
            bId: pair.b.id,
            action: roleActions[index],
          })),
          educationResolutions: result.education.pairs.map((pair, index) => ({
            aId: pair.a.id,
            bId: pair.b.id,
            action: educationActions[index],
          })),
          certificationResolutions: result.certifications.pairs.map(
            (pair, index) => ({
              aId: pair.a.id,
              bId: pair.b.id,
              action: certificationActions[index],
            }),
          ),
          factResolutions: result.facts.pairs.map((pair, index) => ({
            aId: pair.a.id,
            bId: pair.b.id,
            action: factActions[index],
            value:
              factActions[index] === "merge" ? factMergeText[index] : undefined,
          })),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Could not apply resolutions.");
        return;
      }

      onApplied(data);
      setSummary("Reconciliation applied.");
      setResult(null);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setIsApplying(false);
    }
  }

  const totalPairs = result
    ? result.roles.pairs.length +
      result.education.pairs.length +
      result.certifications.pairs.length +
      result.facts.pairs.length
    : 0;

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-zinc-300 p-4 dark:border-zinc-700">
      <div>
        <h2 className="text-lg font-semibold">Reconcile existing knowledge base</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Run this once to find duplicate or overlapping roles, education,
          certifications, and facts already in your profile.
        </p>
      </div>

      <Button onClick={handleRun} disabled={isRunning} className="self-start">
        {isRunning ? "Analyzing..." : "Run reconciliation"}
      </Button>

      {summary && (
        <p className="text-sm font-medium text-green-600 dark:text-green-400">
          {summary}
        </p>
      )}

      {error && (
        <p className="text-sm font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {result && totalPairs === 0 && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No likely duplicates or overlaps found.
        </p>
      )}

      {result && totalPairs > 0 && (
        <div className="flex flex-col gap-4">
          {result.roles.pairs.map((pair, index) => (
            <div
              key={`role-${index}`}
              className="flex flex-col gap-2 rounded-md border border-amber-300 p-3 text-sm dark:border-amber-800"
            >
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {reasonLabel(pair.classification, "role")}
              </p>
              <p>A: {roleLabel(pair.a)}</p>
              <p>B: {roleLabel(pair.b)}</p>
              <div className="flex flex-wrap gap-3">
                {(["keep_a", "keep_b", "keep_both"] as const).map((action) => (
                  <label key={action} className="flex items-center gap-1">
                    <input
                      type="radio"
                      name={`role-self-${index}`}
                      checked={roleActions[index] === action}
                      onChange={() =>
                        setRoleActions((prev) =>
                          prev.map((a, i) => (i === index ? action : a)),
                        )
                      }
                    />
                    {action === "keep_a"
                      ? "Keep A"
                      : action === "keep_b"
                        ? "Keep B"
                        : "Keep both (different)"}
                  </label>
                ))}
              </div>
            </div>
          ))}

          {result.education.pairs.map((pair, index) => (
            <div
              key={`education-${index}`}
              className="flex flex-col gap-2 rounded-md border border-amber-300 p-3 text-sm dark:border-amber-800"
            >
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {reasonLabel(pair.classification, "education entry")}
              </p>
              <p>A: {educationLabel(pair.a)}</p>
              <p>B: {educationLabel(pair.b)}</p>
              <div className="flex flex-wrap gap-3">
                {(["keep_a", "keep_b", "keep_both"] as const).map((action) => (
                  <label key={action} className="flex items-center gap-1">
                    <input
                      type="radio"
                      name={`education-self-${index}`}
                      checked={educationActions[index] === action}
                      onChange={() =>
                        setEducationActions((prev) =>
                          prev.map((a, i) => (i === index ? action : a)),
                        )
                      }
                    />
                    {action === "keep_a"
                      ? "Keep A"
                      : action === "keep_b"
                        ? "Keep B"
                        : "Keep both (different)"}
                  </label>
                ))}
              </div>
            </div>
          ))}

          {result.certifications.pairs.map((pair, index) => (
            <div
              key={`certification-${index}`}
              className="flex flex-col gap-2 rounded-md border border-amber-300 p-3 text-sm dark:border-amber-800"
            >
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {reasonLabel(pair.classification, "certification")}
              </p>
              <p>A: {certificationLabel(pair.a)}</p>
              <p>B: {certificationLabel(pair.b)}</p>
              <div className="flex flex-wrap gap-3">
                {(["keep_a", "keep_b", "keep_both"] as const).map((action) => (
                  <label key={action} className="flex items-center gap-1">
                    <input
                      type="radio"
                      name={`certification-self-${index}`}
                      checked={certificationActions[index] === action}
                      onChange={() =>
                        setCertificationActions((prev) =>
                          prev.map((a, i) => (i === index ? action : a)),
                        )
                      }
                    />
                    {action === "keep_a"
                      ? "Keep A"
                      : action === "keep_b"
                        ? "Keep B"
                        : "Keep both (different)"}
                  </label>
                ))}
              </div>
            </div>
          ))}

          {result.facts.pairs.map((pair, index) => (
            <div
              key={`fact-${index}`}
              className="flex flex-col gap-2 rounded-md border border-amber-300 p-3 text-sm dark:border-amber-800"
            >
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {reasonLabel(pair.classification, "fact")}
              </p>
              <p>A: {pair.a.text}</p>
              <p>B: {pair.b.text}</p>
              <div className="flex flex-wrap gap-3">
                {(["keep_a", "keep_b", "keep_both", "merge"] as const).map(
                  (action) => (
                    <label key={action} className="flex items-center gap-1">
                      <input
                        type="radio"
                        name={`fact-self-${index}`}
                        checked={factActions[index] === action}
                        onChange={() =>
                          setFactActions((prev) =>
                            prev.map((a, i) => (i === index ? action : a)),
                          )
                        }
                      />
                      {action === "keep_a"
                        ? "Keep A"
                        : action === "keep_b"
                          ? "Keep B"
                          : action === "keep_both"
                            ? "Keep both"
                            : "Merge (edit below)"}
                    </label>
                  ),
                )}
              </div>
              {factActions[index] === "merge" && (
                <textarea
                  value={factMergeText[index]}
                  onChange={(e) =>
                    setFactMergeText((prev) =>
                      prev.map((t, i) => (i === index ? e.target.value : t)),
                    )
                  }
                  rows={2}
                  className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm text-black dark:border-zinc-700 dark:bg-black dark:text-zinc-50"
                />
              )}
            </div>
          ))}

          <Button onClick={handleApply} disabled={isApplying} className="self-start">
            {isApplying ? "Applying..." : "Apply resolutions"}
          </Button>
        </div>
      )}
    </div>
  );
}
