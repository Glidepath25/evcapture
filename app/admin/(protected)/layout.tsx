import Link from "next/link";
import { requireAdminSession } from "@/lib/admin-auth";

export default async function AdminProtectedLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireAdminSession();

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="surface-card mb-6 rounded-[2rem] px-6 py-5 sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.26em] text-[var(--brand-navy)]">Glidepath Solutions</p>
              <h1 className="mt-2 text-3xl font-semibold text-[var(--brand-navy)]">EVcapture admin</h1>
              <p className="mt-2 text-sm text-[var(--brand-muted)]">Read-only access to survey submissions, files, and photo records.</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/forms/weev-site-survey"
                className="rounded-full border border-[var(--brand-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--brand-navy)] transition hover:border-[var(--brand-navy)]"
              >
                Open WEEV form
              </Link>

              <form action="/admin/logout" method="post">
                <button
                  type="submit"
                  className="rounded-full bg-[var(--brand-navy)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-navy-dark)]"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </header>

        {children}
      </div>
    </main>
  );
}
