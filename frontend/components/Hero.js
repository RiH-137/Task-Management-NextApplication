import Link from "next/link";

export default function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-16 pt-12 sm:px-6 lg:px-8">
      <div className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="flex flex-col justify-between gap-10">
          <div className="space-y-6">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
              Team Task Manager
            </p>
            <h1 className="font-display text-4xl leading-tight text-zinc-900 sm:text-5xl lg:text-6xl">
              Lead every project with calm clarity and unmistakable ownership.
            </h1>
            <p className="max-w-xl text-base leading-7 text-zinc-600 sm:text-lg">
              Create projects, assign tasks, and monitor progress with built-in
              roles for admins and members. Keep the stack lean, the workflow
              sharp, and the team always aligned.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/sign-up"
              className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-zinc-50 shadow-sm transition hover:bg-zinc-800"
            >
              Start with a team
            </Link>
            <Link
              href="/sign-in"
              className="rounded-full border border-zinc-300 px-6 py-3 text-sm font-semibold text-zinc-800 transition hover:border-zinc-500"
            >
              I already have access
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              "Admin controlled roles",
              "Task status visibility",
              "Overdue alerts built in",
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-zinc-200 bg-white/90 p-4 text-sm text-zinc-700 shadow-sm"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-6">
          <div className="rounded-3xl border border-zinc-200 bg-white/95 p-6 shadow-[0_25px_60px_-40px_rgba(0,0,0,0.6)]">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                  Live overview
                </p>
                <p className="font-display text-2xl text-zinc-900">Ops Board</p>
              </div>
              <span className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-600">
                3 active
              </span>
            </div>
            <div className="space-y-4">
              {["Research sprint", "Design handoff", "Release checklist"].map(
                (item, index) => (
                  <div
                    key={item}
                    className="flex items-center justify-between rounded-2xl border border-zinc-200 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">{item}</p>
                      <p className="text-xs text-zinc-500">
                        {index === 0 ? "Admin" : "Member"} assigned
                      </p>
                    </div>
                    <div className="h-2 w-16 rounded-full bg-zinc-200">
                      <div
                        className="h-2 rounded-full bg-zinc-800"
                        style={{ width: `${(index + 1) * 24}%` }}
                      />
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
          <div className="rounded-3xl border border-zinc-200 bg-zinc-950 p-6 text-zinc-100">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">
              Role matrix
            </p>
            <h2 className="font-display text-2xl">Admin vs Member</h2>
            <div className="mt-6 grid gap-4">
              {[
                "Admins assign work and manage access",
                "Members update status and deliver",
                "Every action logged per project",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm text-zinc-200"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
