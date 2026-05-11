"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";

export default function AuthHeader() {
  const { token, ready, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = () => {
    signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-300 bg-white shadow-sm">
          <span className="font-display text-lg text-zinc-900">T</span>
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-zinc-900">Team Task Manager</p>
          <p className="text-xs text-zinc-500">Admin and member workspaces</p>
        </div>
      </div>
      <nav className="flex items-center gap-2">
        {!ready || !token ? (
          <>
            <Link
              href="/sign-in"
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 transition hover:border-zinc-500 hover:text-zinc-900"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-50 shadow-sm transition hover:bg-zinc-800"
            >
              Create account
            </Link>
          </>
        ) : (
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 transition hover:border-zinc-500 hover:text-zinc-900"
          >
            Sign out
          </button>
        )}
      </nav>
    </header>
  );
}
