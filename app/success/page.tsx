import Link from "next/link";

type SuccessPageProps = {
  searchParams: Promise<{
    reference?: string;
    email?: string;
  }>;
};

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const params = await searchParams;
  const reference = params.reference ?? "Unavailable";
  const emailStatus = params.email === "failed" ? "failed" : "sent";

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <section className="surface-card rounded-[28px] bg-white px-6 py-8 sm:px-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-success)] px-4 py-2 text-sm font-semibold text-[var(--brand-navy)]">
            Submission saved
          </div>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight text-[var(--brand-navy)]">Survey submitted successfully</h1>
          <p className="mt-3 text-base leading-7 text-[var(--brand-muted)]">
            Reference <span className="font-semibold text-[var(--brand-ink)]">{reference}</span> has been saved. The system has generated the site-survey documents and recorded the submission in the database.
          </p>

          <div className="mt-6 rounded-[24px] border border-[var(--brand-border)] bg-[var(--brand-surface-alt)] p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--brand-navy)]">Email status</p>
            <p className="mt-2 text-sm leading-6 text-[var(--brand-ink)]">
              {emailStatus === "sent"
                ? "The notification email was sent to the configured recipients."
                : "The submission was saved, but email delivery failed. The error is retained in the admin-side log and the files remain available on the server."}
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[var(--brand-navy)] px-6 py-3 text-base font-semibold text-white transition hover:bg-[var(--brand-navy-dark)]"
              href={`/download/${encodeURIComponent(reference)}`}
            >
              Download PDF
            </a>
            <Link
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[var(--brand-border)] px-6 py-3 text-base font-semibold text-[var(--brand-navy)] transition hover:bg-[var(--brand-surface-alt)]"
              href="/forms/weev-site-survey"
            >
              Submit another survey
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
