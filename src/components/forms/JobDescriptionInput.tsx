"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = [".pdf", ".docx"];

function isAcceptedFile(file: File): boolean {
  const lower = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function JobDescriptionInput({
  onExtracted,
}: {
  onExtracted: (text: string) => void;
}) {
  const [mode, setMode] = useState<"paste" | "upload">("paste");
  const [pastedText, setPastedText] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);

    if (!isAcceptedFile(file)) {
      setError("Unsupported file type. Upload a .pdf or .docx file.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError("File is too large. Maximum size is 5MB.");
      return;
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
        setError(data.error ?? "Something went wrong while reading this file.");
        return;
      }

      onExtracted(data.text);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setIsUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Button
          variant={mode === "paste" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("paste")}
        >
          Paste text
        </Button>
        <Button
          variant={mode === "upload" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("upload")}
        >
          Upload file
        </Button>
      </div>

      {mode === "paste" && (
        <div className="flex flex-col gap-2">
          <Textarea
            placeholder="Paste the job description here"
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            rows={10}
          />
          <Button
            onClick={() => onExtracted(pastedText)}
            disabled={!pastedText.trim()}
            className="self-start"
          >
            Use this text
          </Button>
        </div>
      )}

      {mode === "upload" && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-12 text-center transition-colors ${
            isDragging
              ? "border-black bg-zinc-50 dark:border-zinc-50 dark:bg-zinc-900"
              : "border-zinc-300 dark:border-zinc-700"
          }`}
        >
          <p className="text-sm font-medium text-black dark:text-zinc-50">
            Drag and drop the job description here, or click to browse
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            PDF or DOCX, up to 5MB
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx"
            className="hidden"
            onChange={handleInputChange}
          />
        </div>
      )}

      {isUploading && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Reading file...</p>
      )}

      {error && (
        <p className="text-sm font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
