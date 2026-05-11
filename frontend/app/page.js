"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../components/AuthProvider";
import Hero from "../components/Hero";

export default function Home() {
  const { token, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && token) {
      router.replace("/projects");
    }
  }, [ready, token, router]);

  if (!ready) {
    return (
      <main className="pb-16">
        <div className="mx-auto max-w-6xl px-4 py-16 text-sm text-zinc-500">
          Loading your workspace...
        </div>
      </main>
    );
  }

  if (token) {
    return (
      <main className="pb-16">
        <div className="mx-auto max-w-6xl px-4 py-16 text-sm text-zinc-500">
          Opening your projects...
        </div>
      </main>
    );
  }

  return (
    <main className="pb-16">
      <Hero />
    </main>
  );
}
