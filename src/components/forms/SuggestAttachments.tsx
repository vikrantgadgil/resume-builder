"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Fact, ProfileHeader, Skeleton } from "@/types/profile";

type Suggestion = {
  factId: string;
  factText: string;
  roleId: string;
  roleLabel: string;
  confidence: string | null;
};

export function SuggestAttachments({
  onApplied,
}: {
  onApplied: (result: {
    header: ProfileHeader;
    skeleton: Skeleton;
    facts: Fact[];
  }) => void;
}) {
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [accepted, setAccepted] = useState<Set<string>>(new Set());
  const [skippedCount, setSkippedCount] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  async function handleRun() {
    setIsRunning(true);
    setError(null);
    setSummary(null);

    try {
      const response = await fetch("/api/profile/suggest-attachments", {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Could not generate suggestions.");
        return;
      }

      setSuggestions(data.suggestions);
      setAccepted(new Set(data.suggestions.map((s: Suggestion) => s.factId)));
      setSkippedCount(data.skippedCount);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setIsRunning(false);
    }
  }

  function toggle(factId: string) {
    setAccepted((prev) => {
      const next = new Set(prev);
      if (next.has(factId)) next.delete(factId);
      else next.add(factId);
      return next;
    });
  }

  async function handleApply() {
    if (!suggestions) return;
    setIsApplying(true);
    setError(null);

    try {
      const response = await fetch("/api/profile/suggest-attachments/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accepted: suggestions
            .filter((s) => accepted.has(s.factId))
            .map((s) => ({ factId: s.factId, roleId: s.roleId })),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Could not apply attachments.");
        return;
      }

      onApplied(data);
      setSummary(`Attached ${data.attachedCount} fact(s) to a role.`);
      setSuggestions(null);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setIsApplying(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-zinc-300 p-4 dark:border-zinc-700">
      <div>
        <h2 className="text-lg font-semibold">
          Suggest role attachments for unattached facts
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Run this to have AI propose which role each unattached fact belongs
          to. Generic or cross-cutting facts are left unattached. Nothing
          changes until you accept and apply.
        </p>
      </div>

      <Button onClick={handleRun} disabled={isRunning} className="self-start">
        {isRunning ? "Analyzing..." : "Suggest attachments"}
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

      {suggestions && skippedCount > 0 && (
        <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
          {skippedCount} fact(s) were not analyzed this run due to volume. Run
          again after applying these to cover the rest.
        </p>
      )}

      {suggestions && suggestions.length === 0 && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No confident role attachments found for the current unattached
          facts.
        </p>
      )}

      {suggestions && suggestions.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setAccepted(new Set(suggestions.map((s) => s.factId)))
              }
            >
              Accept all
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAccepted(new Set())}
            >
              Reject all
            </Button>
          </div>
          {suggestions.map((s) => (
            <label
              key={s.factId}
              className="flex items-start gap-2 rounded-md border border-zinc-200 p-2 text-sm dark:border-zinc-800"
            >
              <input
                type="checkbox"
                checked={accepted.has(s.factId)}
                onChange={() => toggle(s.factId)}
                className="mt-1"
              />
              <div className="flex flex-col">
                <span>{s.factText}</span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  Suggested role: {s.roleLabel}
                  {s.confidence ? ` (${s.confidence} confidence)` : ""}
                </span>
              </div>
            </label>
          ))}
          <Button
            onClick={handleApply}
            disabled={isApplying}
            className="self-start"
          >
            {isApplying ? "Applying..." : "Apply accepted attachments"}
          </Button>
        </div>
      )}
    </div>
  );
}
