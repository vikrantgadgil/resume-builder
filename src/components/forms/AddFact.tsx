"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Fact, Role } from "@/types/profile";

export function AddFact({
  roles,
  onAdded,
}: {
  roles: Role[];
  onAdded: (fact: Fact) => void;
}) {
  const [text, setText] = useState("");
  const [roleRef, setRoleRef] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!text.trim()) return;

    setIsSaving(true);
    setError(null);

    const tags = tagsText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      const response = await fetch("/api/facts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.trim(),
          roleRef: roleRef || null,
          tags,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Could not save this fact.");
        return;
      }

      onAdded(data.fact);
      setText("");
      setRoleRef("");
      setTagsText("");
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-zinc-300 p-4 dark:border-zinc-700">
      <Textarea
        placeholder="Add a fact, e.g. Led a team of 5 engineers through a cloud migration"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
      />
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={roleRef}
          onChange={(e) => setRoleRef(e.target.value)}
          className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm text-black dark:border-zinc-700 dark:bg-black dark:text-zinc-50"
        >
          <option value="">No specific role</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.title} at {role.employer}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Tags (comma separated, optional)"
          value={tagsText}
          onChange={(e) => setTagsText(e.target.value)}
          className="min-w-48 flex-1 rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm text-black dark:border-zinc-700 dark:bg-black dark:text-zinc-50"
        />
        <Button size="sm" onClick={handleSave} disabled={isSaving || !text.trim()}>
          {isSaving ? "Saving..." : "Add fact"}
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
