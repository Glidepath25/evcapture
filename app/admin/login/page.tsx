import Link from "next/link";
import { getSafeAdminPath, isAdminConfigured, redirectIfAdminSession } from "@/lib/admin-auth";

type LoginPageProps = {
  searchParams: Promise<{
    next?: string;
    error?: string;
  }>;
};

function getErrorMessage(error?: string) {
  switch (error) {
    case "invalid":
      return "The password was incorrect.";
    case "missing-config":
      return "ADMIN_PASSWORD is not configured on this deployment.";
    default:
      return "";
  }
}

export default async function AdminLoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = getSafeAdminPath(params.next);
  await redirectIfAdminSession(nextPath);

  const configured = isAdminConfigured();
  const errorMessage = getErrorMessage(params.error);

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center justify-center">
        <div className="surface-card w-full max-w-md rounded-[2rem] p-8 sm:p-10">
          <div className="mb-8">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.26em] text-[var(--brand-navy)]">Glidepath Solutions</p>
            <h1 className="text-3xl font-semibold text-[var(--brand-navy)]">EVcapture admin</h1>
            <p className="mt-3 text-sm leading-6 text-[var(--brand-muted)]">
              Enter the shared admin password to view read-only submission records.
            </p>
          </div>

          {!configured ? (
            <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Set <code>ADMIN_PASSWORD</code> in the environment before using the admin area.
            </div>
          ) : null}

          {errorMessage ? (
            <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{errorMessage}</div>
          ) : null}

          <form action="/admin/login/submit" method="post" className="space-y-5">
            <input type="hidden" name="next" value={nextPath} />

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[var(--brand-navy)]">Shared password</span>
              <div className="field-shell rounded-2xl px-4 py-3">
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  className="w-full bg-transparent outline-none"
                  disabled={!configured}
                  required
                />
              </div>
            </label>

            <button
              type="submit"
              className="w-full rounded-2xl bg-[var(--brand-navy)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-navy-dark)] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!configured}
            >
              Open admin
            </button>
          </form>

          <div className="mt-6 text-sm text-[var(--brand-muted)]">
            Need the public form instead?{" "}
            <Link href="/forms/weev-site-survey" className="font-semibold text-[var(--brand-navy)]">
              Open WEEV site survey form
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
