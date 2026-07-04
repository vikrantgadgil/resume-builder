import { signIn } from "@/auth";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white p-16 dark:bg-black">
      <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
        Sign in
      </h1>
      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/profile" });
        }}
      >
        <button
          type="submit"
          className="rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
        >
          Sign in with Google
        </button>
      </form>
    </div>
  );
}
