import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  if (!session?.user) {
    redirect("/sign-in");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-black/10 px-8 py-4 dark:border-white/10">
        <span className="text-sm text-zinc-600 dark:text-zinc-400">
          {session.user.email}
        </span>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/sign-in" });
          }}
        >
          <button
            type="submit"
            className="text-sm font-medium text-black underline dark:text-zinc-50"
          >
            Sign out
          </button>
        </form>
      </header>
      <main className="flex flex-1 flex-col p-8">{children}</main>
    </div>
  );
}
