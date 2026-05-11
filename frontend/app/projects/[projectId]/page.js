"use client";

import { useParams } from "next/navigation";
import { useAuth } from "../../../components/AuthProvider";
import DashboardClient from "../../../components/DashboardClient";
import Hero from "../../../components/Hero";

export default function ProjectDetailsPage() {
  const { projectId } = useParams();
  const { token, ready } = useAuth();

  const normalizedProjectId = Array.isArray(projectId)
    ? projectId[0]
    : projectId || "";

  if (!ready) {
    return (
      <main className="pb-16">
        <div className="mx-auto max-w-6xl px-4 py-16 text-sm text-zinc-500">
          Loading your workspace...
        </div>
      </main>
    );
  }

  return (
    <main className="pb-16">
      {token ? (
        <DashboardClient initialProjectId={normalizedProjectId} />
      ) : (
        <Hero />
      )}
    </main>
  );
}
