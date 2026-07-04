"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  emptyHeader,
  emptySkeleton,
  type Certification,
  type Education,
  type ProfileHeader,
  type Role,
  type Skeleton,
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

export function ProfileEditor({
  initialHeader,
  initialSkeleton,
  onSaved,
}: {
  initialHeader?: ProfileHeader;
  initialSkeleton?: Skeleton;
  onSaved?: (skeleton: Skeleton) => void;
}) {
  const [header, setHeader] = useState<ProfileHeader>(
    initialHeader ?? emptyHeader(),
  );
  const [skeleton, setSkeleton] = useState<Skeleton>(
    initialSkeleton ?? emptySkeleton(),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  function updateHeader(field: keyof ProfileHeader, value: string) {
    setHeader((h) => ({ ...h, [field]: value }));
  }

  function updateRole(index: number, entry: Role) {
    setSkeleton((s) => ({
      ...s,
      roles: s.roles.map((r, i) => (i === index ? entry : r)),
    }));
  }

  function addRole() {
    setSkeleton((s) => ({
      ...s,
      roles: [
        ...s.roles,
        {
          id: crypto.randomUUID(),
          employer: "",
          title: "",
          startDate: "",
          endDate: "",
          location: "",
        },
      ],
    }));
  }

  function removeRole(index: number) {
    setSkeleton((s) => ({
      ...s,
      roles: s.roles.filter((_, i) => i !== index),
    }));
  }

  function updateEducation(index: number, entry: Education) {
    setSkeleton((s) => ({
      ...s,
      education: s.education.map((e, i) => (i === index ? entry : e)),
    }));
  }

  function addEducation() {
    setSkeleton((s) => ({
      ...s,
      education: [
        ...s.education,
        {
          id: crypto.randomUUID(),
          institution: "",
          degree: "",
          field: "",
          year: "",
        },
      ],
    }));
  }

  function removeEducation(index: number) {
    setSkeleton((s) => ({
      ...s,
      education: s.education.filter((_, i) => i !== index),
    }));
  }

  function updateCertification(index: number, entry: Certification) {
    setSkeleton((s) => ({
      ...s,
      certifications: s.certifications.map((c, i) =>
        i === index ? entry : c,
      ),
    }));
  }

  function addCertification() {
    setSkeleton((s) => ({
      ...s,
      certifications: [
        ...s.certifications,
        { id: crypto.randomUUID(), name: "", issuer: "", year: "" },
      ],
    }));
  }

  function removeCertification(index: number) {
    setSkeleton((s) => ({
      ...s,
      certifications: s.certifications.filter((_, i) => i !== index),
    }));
  }

  async function handleSave() {
    setIsSaving(true);
    setSaveError(null);

    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ header, skeleton }),
      });
      const data = await response.json();

      if (!response.ok) {
        setSaveError(data.error ?? "Could not save the profile.");
        return;
      }

      setSavedAt(new Date());
      onSaved?.(skeleton);
    } catch {
      setSaveError(
        "Could not reach the server. Check your connection and try again.",
      );
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
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Roles</h2>
          <Button variant="outline" size="sm" onClick={addRole}>
            Add role
          </Button>
        </div>
        {skeleton.roles.map((role, index) => (
          <div
            key={role.id}
            className="grid grid-cols-1 gap-3 rounded-lg border border-zinc-300 p-4 sm:grid-cols-2 dark:border-zinc-700"
          >
            <TextField
              label="Title"
              value={role.title}
              onChange={(v) => updateRole(index, { ...role, title: v })}
            />
            <TextField
              label="Employer"
              value={role.employer}
              onChange={(v) => updateRole(index, { ...role, employer: v })}
            />
            <TextField
              label="Location"
              value={role.location}
              onChange={(v) => updateRole(index, { ...role, location: v })}
            />
            <div className="grid grid-cols-2 gap-3">
              <TextField
                label="Start date"
                value={role.startDate}
                onChange={(v) => updateRole(index, { ...role, startDate: v })}
              />
              <TextField
                label="End date"
                value={role.endDate}
                onChange={(v) => updateRole(index, { ...role, endDate: v })}
              />
            </div>
            <Button
              variant="destructive"
              size="sm"
              className="self-start sm:col-span-2"
              onClick={() => removeRole(index)}
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
        {skeleton.education.map((entry, index) => (
          <div
            key={entry.id}
            className="grid grid-cols-1 gap-3 rounded-lg border border-zinc-300 p-4 sm:grid-cols-2 dark:border-zinc-700"
          >
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
            <TextField
              label="Year"
              value={entry.year}
              onChange={(v) => updateEducation(index, { ...entry, year: v })}
            />
            <Button
              variant="destructive"
              size="sm"
              className="self-start sm:col-span-2"
              onClick={() => removeEducation(index)}
            >
              Remove
            </Button>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Certifications</h2>
          <Button variant="outline" size="sm" onClick={addCertification}>
            Add certification
          </Button>
        </div>
        {skeleton.certifications.map((entry, index) => (
          <div
            key={entry.id}
            className="grid grid-cols-1 gap-3 rounded-lg border border-zinc-300 p-4 sm:grid-cols-2 dark:border-zinc-700"
          >
            <TextField
              label="Name"
              value={entry.name}
              onChange={(v) =>
                updateCertification(index, { ...entry, name: v })
              }
            />
            <TextField
              label="Issuer"
              value={entry.issuer}
              onChange={(v) =>
                updateCertification(index, { ...entry, issuer: v })
              }
            />
            <TextField
              label="Year"
              value={entry.year}
              onChange={(v) =>
                updateCertification(index, { ...entry, year: v })
              }
            />
            <Button
              variant="destructive"
              size="sm"
              className="self-start sm:col-span-2"
              onClick={() => removeCertification(index)}
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
    </div>
  );
}
