"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Fact, Role } from "@/types/profile";

export function FactsList({
  facts,
  roles,
  onDeleted,
}: {
  facts: Fact[];
  roles: Role[];
  onDeleted: (id: string) => void;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await fetch(`/api/facts/${id}`, { method: "DELETE" });
      onDeleted(id);
    } finally {
      setDeletingId(null);
    }
  }

  function roleLabel(roleRef: string | null): string {
    if (!roleRef) return "Unattached";
    const role = roles.find((r) => r.id === roleRef);
    return role ? `${role.title} at ${role.employer}` : "Unattached";
  }

  if (facts.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        No facts yet. Add one above or import a resume.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {facts.map((fact) => (
        <li
          key={fact.id}
          className="flex items-start justify-between gap-3 rounded-lg border border-zinc-300 p-3 text-sm dark:border-zinc-700"
        >
          <div className="flex flex-col gap-1">
            <span className="text-black dark:text-zinc-50">{fact.text}</span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {roleLabel(fact.roleRef)}
              {fact.tags && fact.tags.length > 0
                ? ` · ${fact.tags.join(", ")}`
                : ""}
              {" · "}
              {fact.source}
            </span>
          </div>
          <Button
            variant="destructive"
            size="sm"
            disabled={deletingId === fact.id}
            onClick={() => handleDelete(fact.id)}
          >
            Delete
          </Button>
        </li>
      ))}
    </ul>
  );
}
