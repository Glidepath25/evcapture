import Link from "next/link";

const FORM_OPTIONS = [
  {
    name: "WEEV site survey form",
    href: "/forms/weev-site-survey",
    description: "Mobile-first site survey capture with quantities, notes, linked photos, PDF and CSV outputs.",
    status: "Live now",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="surface-card overflow-hidden rounded-[32px] bg-white">
          <div className="border-b border-[var(--brand-border)] px-6 py-8 sm:px-8 lg:px-10">
            <p className="text-sm font-semibold uppercase tracking-[0.26em] text-[var(--brand-navy)]">Glidepath Solutions</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-[var(--brand-navy)] sm:text-5xl">
              EVcapture form launcher
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--brand-muted)]">
              Choose the workflow you want to open. This landing page is intended to grow as new survey and capture forms are added.
            </p>
          </div>

          <div className="grid gap-5 px-6 py-6 sm:px-8 lg:grid-cols-[minmax(0,1.5fr),minmax(280px,0.8fr)] lg:px-10 lg:py-8">
            <div className="space-y-4">
              {FORM_OPTIONS.map((option) => (
                <Link
                  key={option.href}
                  href={option.href}
                  className="group block rounded-[28px] border border-[var(--brand-border)] bg-[var(--brand-surface-alt)] p-5 transition hover:border-[var(--brand-navy)] hover:bg-white"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-navy)]">
                        {option.status}
                      </div>
                      <h2 className="mt-4 text-2xl font-semibold tracking-tight text-[var(--brand-navy)]">{option.name}</h2>
                      <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--brand-muted)]">{option.description}</p>
                    </div>

                    <div className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[var(--brand-navy)] px-5 py-3 text-sm font-semibold text-white transition group-hover:bg-[var(--brand-navy-dark)]">
                      Open form
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <aside className="rounded-[28px] border border-[var(--brand-border)] bg-[var(--brand-surface-alt)] p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--brand-navy)]">What this enables</p>
              <div className="mt-4 space-y-3 text-sm leading-6 text-[var(--brand-muted)]">
                <p>Keep one public EVcapture URL while adding more customer-specific or workflow-specific forms later.</p>
                <p>Start with WEEV today, then add alternative survey templates or operational forms without changing the entry point.</p>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}
