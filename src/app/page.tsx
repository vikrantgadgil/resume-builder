export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white p-16 text-center dark:bg-black">
      <h1 className="text-3xl font-semibold text-black dark:text-zinc-50">
        Resume Builder
      </h1>
      <p className="max-w-md text-lg text-zinc-600 dark:text-zinc-400">
        Toolchain scaffold for the personal resume generator and ATS
        optimizer. Phase 0: repo and toolchain setup.
      </p>
    </div>
  );
}
