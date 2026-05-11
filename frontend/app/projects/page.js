"use client";

import { useAuth } from "../../components/AuthProvider";
import DashboardClient from "../../components/DashboardClient";
import Hero from "../../components/Hero";

export default function ProjectsPage() {
  const { token, ready } = useAuth();

  if (!ready) {
    return (
      <main className="pb-18">
        <div className="mx-auto max-w-6xl px-4 py-16 text-sm text-zinc-500">
          Loading your workspace...
        </div>
      </main>
    );
  }

  return (
    <main className="pb-18">
      {token ? <DashboardClient /> : <Hero />}
    </main>
  );
}
