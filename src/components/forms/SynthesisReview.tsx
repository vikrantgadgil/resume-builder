"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  roleLabel,
  educationLabel,
  certificationLabel,
} from "@/lib/reconcile-engine";
import type { SynthesisResult } from "@/components/forms/MultiSourceUpload";
import type { Fact, ProfileHeader, Skeleton } from "@/types/profile";

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
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-black dark:border-zinc-700 dark:bg-black dark:text-zinc-50"
      />
    </label>
  );
}

export function SynthesisReview({
  result,
  onSaved,
  onCancel,
}: {
  result: SynthesisResult;
  onSaved: (result: {
    header: ProfileHeader;
    skeleton: Skeleton;
    facts: Fact[];
  }) => void;
  onCancel: () => void;
}) {
  const [header, setHeader] = useState<ProfileHeader>(result.header);
  const [roles, setRoles] = useState(
    result.roles.map((r) => ({ ...r, include: true })),
  );
  const [education, setEducation] = useState(
    result.education.map((e) => ({ ...e, include: true })),
  );
  const [certifications, setCertifications] = useState(
    result.certifications.map((c) => ({ ...c, include: true })),
  );
  const [facts, setFacts] = useState(
    result.facts.map((f) => ({
      ...f,
      include: true,
      tagsText: f.tags.join(", "),
      attachSuggestedRole: Boolean(f.suggestedRoleEmployer),
    })),
  );

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateHeader(field: keyof ProfileHeader, value: string) {
    setHeader((h) => ({ ...h, [field]: value }));
  }

  async function handleSave() {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/profile/synthesize/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          header,
          roles: roles.filter((r) => r.include),
          education: education.filter((e) => e.include),
          certifications: certifications.filter((c) => c.include),
          facts: facts
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
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Could not save the knowledge base.");
        return;
      }

      onSaved(data);
    } catch {
      setError(
        "Could not reach the server. Check your connection and try again.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 rounded-lg border border-zinc-300 p-4 dark:border-zinc-700">
      <div>
        <h2 className="text-lg font-semibold">Review synthesized knowledge base</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Nothing is saved until you approve. Uncheck anything you do not want
          to include.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h3 className="font-medium">Header</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField
            label="Name"
            value={header.name}
            onChange={(v) => updateHeader("name", v)}
          />
          <TextField
            label="Email"
            value={header.email}
            onChange={(v) => updateHeader("email", v)}
          />
          <TextField
            label="Phone"
            value={header.phone}
            onChange={(v) => updateHeader("phone", v)}
          />
          <TextField
            label="Location"
            value={header.location}
            onChange={(v) => updateHeader("location", v)}
          />
          <TextField
            label="LinkedIn"
            value={header.linkedin}
            onChange={(v) => updateHeader("linkedin", v)}
          />
          <TextField
            label="GitHub"
            value={header.github}
            onChange={(v) => updateHeader("github", v)}
          />
        </div>
      </section>

      {roles.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="font-medium">Roles</h3>
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
          <h3 className="font-medium">Education</h3>
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
          <h3 className="font-medium">Certifications</h3>
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
          <h3 className="font-medium">Facts</h3>
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

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save knowledge base"}
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
