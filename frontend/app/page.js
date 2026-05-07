import { Show } from "@clerk/nextjs";
import DashboardClient from "../components/DashboardClient";
import Hero from "../components/Hero";

export default function Home() {
  return (
    <main className="pb-16">
      <Show when="signed-out">
        <Hero />
      </Show>
      <Show when="signed-in">
        <DashboardClient />
      </Show>
    </main>
  );
}
