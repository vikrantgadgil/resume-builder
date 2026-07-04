import { ResumeUpload } from "@/components/forms/ResumeUpload";

export default function ProfilePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Profile</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Upload a resume to extract its text. Profile structuring and
          editing are built in Phase 3.
        </p>
      </div>
      <ResumeUpload />
    </div>
  );
}
