"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { renderProfileMarkdown } from "@/lib/profile-markdown";
import {
  emptyContent,
  emptyHeader,
  type EducationEntry,
  type ExperienceEntry,
  type ProfileContent,
  type ProfileHeader,
  type ProjectEntry,
} from "@/types/profile";

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

function TextAreaField({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="resize-y"
      />
    </label>
  );
}

export function ProfileEditor({
  initialHeader,
  initialContent,
  onSaved,
}: {
  initialHeader?: ProfileHeader;
  initialContent?: ProfileContent;
  onSaved?: () => void;
}) {
  const [header, setHeader] = useState<ProfileHeader>(
    initialHeader ?? emptyHeader(),
  );
  const [content, setContent] = useState<ProfileContent>(
    initialContent ?? emptyContent(),
  );
  const [skillsText, setSkillsText] = useState(
    (initialContent ?? emptyContent()).skills.join(", "),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const markdown = useMemo(
    () => renderProfileMarkdown(header, content),
    [header, content],
  );

  function updateHeader(field: keyof ProfileHeader, value: string) {
    setHeader((h) => ({ ...h, [field]: value }));
  }

  function updateExperience(index: number, entry: ExperienceEntry) {
    setContent((c) => ({
      ...c,
      experience: c.experience.map((e, i) => (i === index ? entry : e)),
    }));
  }

  function addExperience() {
    setContent((c) => ({
      ...c,
      experience: [
        ...c.experience,
        {
          company: "",
          title: "",
          location: "",
          startDate: "",
          endDate: "",
          bullets: [],
        },
      ],
    }));
  }

  function removeExperience(index: number) {
    setContent((c) => ({
      ...c,
      experience: c.experience.filter((_, i) => i !== index),
    }));
  }

  function updateEducation(index: number, entry: EducationEntry) {
    setContent((c) => ({
      ...c,
      education: c.education.map((e, i) => (i === index ? entry : e)),
    }));
  }

  function addEducation() {
    setContent((c) => ({
      ...c,
      education: [
        ...c.education,
        {
          institution: "",
          degree: "",
          field: "",
          startDate: "",
          endDate: "",
          details: "",
        },
      ],
    }));
  }

  function removeEducation(index: number) {
    setContent((c) => ({
      ...c,
      education: c.education.filter((_, i) => i !== index),
    }));
  }

  function updateProject(index: number, entry: ProjectEntry) {
    setContent((c) => ({
      ...c,
      projects: c.projects.map((p, i) => (i === index ? entry : p)),
    }));
  }

  function addProject() {
    setContent((c) => ({
      ...c,
      projects: [
        ...c.projects,
        { name: "", description: "", bullets: [], link: "" },
      ],
    }));
  }

  function removeProject(index: number) {
    setContent((c) => ({
      ...c,
      projects: c.projects.filter((_, i) => i !== index),
    }));
  }

  async function handleSave() {
    setIsSaving(true);
    setSaveError(null);

    const skills = skillsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const contentToSave = {
      ...content,
      skills,
      experience: content.experience.map((entry) => ({
        ...entry,
        bullets: entry.bullets.map((b) => b.trim()).filter(Boolean),
      })),
      projects: content.projects.map((entry) => ({
        ...entry,
        bullets: entry.bullets.map((b) => b.trim()).filter(Boolean),
      })),
    };

    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ header, content: contentToSave }),
      });
      const data = await response.json();

      if (!response.ok) {
        setSaveError(data.error ?? "Could not save the profile.");
        return;
      }

      setContent(contentToSave);
      setSavedAt(new Date());
      onSaved?.();
    } catch {
      setSaveError("Could not reach the server. Check your connection and try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Header</h2>
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

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Summary</h2>
        <TextAreaField
          label="Summary"
          value={content.summary}
          onChange={(v) => setContent((c) => ({ ...c, summary: v }))}
          rows={4}
        />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Experience</h2>
          <Button variant="outline" size="sm" onClick={addExperience}>
            Add experience
          </Button>
        </div>
        {content.experience.map((entry, index) => (
          <div
            key={index}
            className="flex flex-col gap-3 rounded-lg border border-zinc-300 p-4 dark:border-zinc-700"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextField
                label="Title"
                value={entry.title}
                onChange={(v) => updateExperience(index, { ...entry, title: v })}
              />
              <TextField
                label="Company"
                value={entry.company}
                onChange={(v) =>
                  updateExperience(index, { ...entry, company: v })
                }
              />
              <TextField
                label="Location"
                value={entry.location}
                onChange={(v) =>
                  updateExperience(index, { ...entry, location: v })
                }
              />
              <div className="grid grid-cols-2 gap-3">
                <TextField
                  label="Start date"
                  value={entry.startDate}
                  onChange={(v) =>
                    updateExperience(index, { ...entry, startDate: v })
                  }
                />
                <TextField
                  label="End date"
                  value={entry.endDate}
                  onChange={(v) =>
                    updateExperience(index, { ...entry, endDate: v })
                  }
                />
              </div>
            </div>
            <TextAreaField
              label="Bullets (one per line)"
              value={entry.bullets.join("\n")}
              onChange={(v) =>
                updateExperience(index, {
                  ...entry,
                  bullets: v.split("\n"),
                })
              }
              rows={4}
            />
            <Button
              variant="destructive"
              size="sm"
              className="self-start"
              onClick={() => removeExperience(index)}
            >
              Remove
            </Button>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Education</h2>
          <Button variant="outline" size="sm" onClick={addEducation}>
            Add education
          </Button>
        </div>
        {content.education.map((entry, index) => (
          <div
            key={index}
            className="flex flex-col gap-3 rounded-lg border border-zinc-300 p-4 dark:border-zinc-700"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextField
                label="Degree"
                value={entry.degree}
                onChange={(v) => updateEducation(index, { ...entry, degree: v })}
              />
              <TextField
                label="Institution"
                value={entry.institution}
                onChange={(v) =>
                  updateEducation(index, { ...entry, institution: v })
                }
              />
              <TextField
                label="Field"
                value={entry.field}
                onChange={(v) => updateEducation(index, { ...entry, field: v })}
              />
              <div className="grid grid-cols-2 gap-3">
                <TextField
                  label="Start date"
                  value={entry.startDate}
                  onChange={(v) =>
                    updateEducation(index, { ...entry, startDate: v })
                  }
                />
                <TextField
                  label="End date"
                  value={entry.endDate}
                  onChange={(v) =>
                    updateEducation(index, { ...entry, endDate: v })
                  }
                />
              </div>
            </div>
            <TextAreaField
              label="Details"
              value={entry.details}
              onChange={(v) => updateEducation(index, { ...entry, details: v })}
              rows={2}
            />
            <Button
              variant="destructive"
              size="sm"
              className="self-start"
              onClick={() => removeEducation(index)}
            >
              Remove
            </Button>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Skills</h2>
        <TextAreaField
          label="Skills (comma separated)"
          value={skillsText}
          onChange={setSkillsText}
          rows={2}
        />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Projects</h2>
          <Button variant="outline" size="sm" onClick={addProject}>
            Add project
          </Button>
        </div>
        {content.projects.map((entry, index) => (
          <div
            key={index}
            className="flex flex-col gap-3 rounded-lg border border-zinc-300 p-4 dark:border-zinc-700"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextField
                label="Name"
                value={entry.name}
                onChange={(v) => updateProject(index, { ...entry, name: v })}
              />
              <TextField
                label="Link"
                value={entry.link}
                onChange={(v) => updateProject(index, { ...entry, link: v })}
              />
            </div>
            <TextAreaField
              label="Description"
              value={entry.description}
              onChange={(v) =>
                updateProject(index, { ...entry, description: v })
              }
              rows={2}
            />
            <TextAreaField
              label="Bullets (one per line)"
              value={entry.bullets.join("\n")}
              onChange={(v) =>
                updateProject(index, {
                  ...entry,
                  bullets: v.split("\n"),
                })
              }
              rows={3}
            />
            <Button
              variant="destructive"
              size="sm"
              className="self-start"
              onClick={() => removeProject(index)}
            >
              Remove
            </Button>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save profile"}
          </Button>
          {savedAt && (
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              Saved at {savedAt.toLocaleTimeString()}
            </span>
          )}
        </div>
        {saveError && (
          <p className="text-sm font-medium text-red-600 dark:text-red-400">
            {saveError}
          </p>
        )}
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
