"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "../../components/AuthProvider";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function SignInPage() {
  const { setToken } = useAuth();
  const router = useRouter();
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formState, setFormState] = useState({
    email: "",
    password: "",
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setNotice("");

    if (!formState.email.trim() || !formState.password) {
      setNotice("Email and password are required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formState.email.trim(),
          password: formState.password,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Sign in failed.");
      }

      const token = payload.data?.token || payload.token;
      if (!token) {
        throw new Error("Missing auth token.");
      }

      setToken(token);
      router.push("/");
      router.refresh();
    } catch (error) {
      setNotice(error.message || "Sign in failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white/90 p-8 shadow-sm">
        <div className="space-y-2 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
            Team Task Manager
          </p>
          <h1 className="font-display text-2xl text-zinc-900">Welcome back</h1>
          <p className="text-sm text-zinc-600">
            Sign in to keep projects moving forward.
          </p>
        </div>

        {notice && (
          <div className="mt-4 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700">
            {notice}
          </div>
        )}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Email
            </label>
            <input
              type="email"
              value={formState.email}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, email: event.target.value }))
              }
              className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none"
              placeholder="you@company.com"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Password
            </label>
            <input
              type="password"
              value={formState.password}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, password: event.target.value }))
              }
              className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none"
              placeholder="Enter your password"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-zinc-50 shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-zinc-500">
          Need an account?{" "}
          <Link href="/sign-up" className="font-semibold text-zinc-900">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
