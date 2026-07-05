"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type {
  CertificationCandidate,
  EducationCandidate,
  FactCandidate,
  ProfileHeader,
  RoleCandidate,
} from "@/types/profile";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = [".pdf", ".docx"];

type Source = { label: string; text: string };

export type SynthesisResult = {
  header: ProfileHeader;
  roles: RoleCandidate[];
  education: EducationCandidate[];
  certifications: CertificationCandidate[];
  facts: FactCandidate[];
};

function isAcceptedFile(file: File): boolean {
  const lower = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function MultiSourceUpload({
  onSynthesized,
}: {
  onSynthesized: (result: SynthesisResult) => void;
}) {
  const [sources, setSources] = useState<Source[]>([]);
  const [pastedText, setPastedText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [synthesizeNotice, setSynthesizeNotice] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList) {
    setError(null);

    for (const file of Array.from(files)) {
      if (!isAcceptedFile(file)) {
        setError(`${file.name}: unsupported file type. Upload .pdf or .docx files.`);
        continue;
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        setError(`${file.name}: file is too large. Maximum size is 5MB.`);
        continue;
      }

      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch("/api/parse", {
          method: "POST",
          body: formData,
        });
        const data = await response.json();

        if (!response.ok) {
          setError(`${file.name}: ${data.error ?? "could not read this file."}`);
          continue;
        }

        setSources((prev) => [...prev, { label: file.name, text: data.text }]);
      } catch {
        setError(
          "Could not reach the server. Check your connection and try again.",
        );
      } finally {
        setIsUploading(false);
      }
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
    e.target.value = "";
  }

  function addPastedText() {
    if (!pastedText.trim()) return;
    setSources((prev) => [
      ...prev,
      { label: `Pasted text ${prev.length + 1}`, text: pastedText },
    ]);
    setPastedText("");
  }

  function removeSource(index: number) {
    setSources((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSynthesize() {
    setIsSynthesizing(true);
    setSynthesizeNotice(null);

    try {
      const response = await fetch("/api/profile/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sources }),
      });
      const data = await response.json();

      if (!response.ok) {
        setSynthesizeNotice(data.error ?? "Could not synthesize these sources.");
        return;
      }

      if (data.fallback) {
        setSynthesizeNotice(
          `AI synthesis did not succeed (${data.reason}). Try again, or use "Import a single resume" below instead.`,
        );
        return;
      }

      onSynthesized(data);
    } catch {
      setSynthesizeNotice(
        "Could not reach the server. Check your connection and try again.",
      );
    } finally {
      setIsSynthesizing(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        onClick={() => inputRef.current?.click()}
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-zinc-300 p-12 text-center transition-colors dark:border-zinc-700"
      >
        <p className="text-sm font-medium text-black dark:text-zinc-50">
          Click to browse and select one or more resume files
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          PDF or DOCX, up to 5MB each, multiple files at once
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx"
          multiple
          className="hidden"
          onChange={handleInputChange}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Textarea
          placeholder="Optionally paste additional freeform text, such as a LinkedIn export or notes"
          value={pastedText}
          onChange={(e) => setPastedText(e.target.value)}
          rows={4}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={addPastedText}
          disabled={!pastedText.trim()}
          className="self-start"
        >
          Add this text as a source
        </Button>
      </div>

      {isUploading && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Reading file...</p>
      )}

      {error && (
        <p className="text-sm font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {sources.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-black dark:text-zinc-50">
            Sources ready to synthesize ({sources.length})
          </p>
          <ul className="flex flex-col gap-1">
            {sources.map((source, index) => (
              <li
                key={index}
                className="flex items-center justify-between rounded-md border border-zinc-200 px-3 py-1.5 text-sm dark:border-zinc-800"
              >
                <span>
                  {source.label}{" "}
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    ({source.text.length.toLocaleString()} characters)
                  </span>
                </span>
                <Button
                  variant="destructive"
                  size="xs"
                  onClick={() => removeSource(index)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
          <Button
            onClick={handleSynthesize}
            disabled={isSynthesizing}
            className="self-start"
          >
            {isSynthesizing ? "Synthesizing..." : "Synthesize knowledge base"}
          </Button>
        </div>
      )}

      {synthesizeNotice && (
        <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
          {synthesizeNotice}
        </p>
      )}
    </div>
  );
}
