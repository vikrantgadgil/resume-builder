"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ResumeUpload } from "@/components/forms/ResumeUpload";
import { ProfileEditor } from "@/components/forms/ProfileEditor";
import {
  emptyContent,
  emptyHeader,
  type ProfileContent,
  type ProfileHeader,
} from "@/types/profile";

type Profile = {
  header: ProfileHeader;
  content: ProfileContent;
};

export default function ProfilePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showUploader, setShowUploader] = useState(false);
  const [isStructuring, setIsStructuring] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [editorKey, setEditorKey] = useState(0);

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data.profile) {
          setProfile({
            header: data.profile.header,
            content: data.profile.content,
          });
          setShowUploader(false);
        } else {
          setShowUploader(true);
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function handleConfirmedText(rawText: string) {
    setIsStructuring(true);
    setNotice(null);

    const contentOnly = profile !== null;

    try {
      const response = await fetch("/api/profile/structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText, contentOnly }),
      });
      const data = await response.json();

      if (data.fallback) {
        setNotice(
          `AI structuring did not succeed (${data.reason}). Fill in the fields manually below.`,
        );
        setProfile((current) => ({
          header: contentOnly ? current!.header : emptyHeader(),
          content: emptyContent(),
        }));
      } else if (contentOnly) {
        setProfile((current) => ({
          header: current!.header,
          content: data.content,
        }));
      } else {
        setProfile({ header: data.header, content: data.content });
      }
    } catch {
      setNotice(
        "Could not reach the server to structure this resume. Fill in the fields manually below.",
      );
      setProfile((current) => ({
        header: contentOnly ? current!.header : emptyHeader(),
        content: emptyContent(),
      }));
    } finally {
      setIsStructuring(false);
      setShowUploader(false);
      setEditorKey((k) => k + 1);
    }
  }

  if (isLoading) {
    return <p className="text-zinc-600 dark:text-zinc-400">Loading...</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Profile</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Upload a resume to extract and structure its content, then edit and
          save.
        </p>
      </div>

      {profile && !showUploader && (
        <Button
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => setShowUploader(true)}
        >
          Upload a new resume
        </Button>
      )}

      {showUploader && <ResumeUpload onConfirm={handleConfirmedText} />}

      {isStructuring && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Structuring your resume with AI...
        </p>
      )}

      {notice && (
        <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
          {notice}
        </p>
      )}

      {profile && !isStructuring && (
        <ProfileEditor
          key={editorKey}
          initialHeader={profile.header}
          initialContent={profile.content}
          onSaved={() => setNotice(null)}
        />
      )}
    </div>
  );
}
