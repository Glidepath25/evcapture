import Link from "next/link";
import { StatusBadge } from "@/components/admin/status-badge";
import { getAdminStats, getAdminSubmissionsList } from "@/lib/admin-data";

type AdminListPageProps = {
  searchParams: Promise<{
    q?: string;
    pdf_status?: string;
    email_status?: string;
    status?: string;
    page?: string;
  }>;
};

function formatDate(value: string) {
  if (!value) {
    return "Not provided";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not provided";
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: value.includes("T") ? "short" : undefined,
  }).format(date);
}

function buildPageHref(page: number, params: { q?: string; pdf_status?: string; email_status?: string; status?: string }) {
  const query = new URLSearchParams();

  if (params.q) {
    query.set("q", params.q);
  }
  if (params.pdf_status) {
    query.set("pdf_status", params.pdf_status);
  }
  if (params.email_status) {
    query.set("email_status", params.email_status);
  }
  if (params.status) {
    query.set("status", params.status);
  }
  query.set("page", String(page));

  return `/admin?${query.toString()}`;
}

export default async function AdminListPage({ searchParams }: AdminListPageProps) {
  const params = await searchParams;
  const page = Number(params.page ?? "1");
  const filters = {
    q: params.q?.trim() || undefined,
    pdfStatus: params.pdf_status || undefined,
    emailStatus: params.email_status || undefined,
    status: params.status || undefined,
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };

  const stats = getAdminStats();
  const submissions = getAdminSubmissionsList(filters);
  const rangeStart = submissions.items.length > 0 ? (submissions.page - 1) * submissions.pageSize + 1 : 0;
  const rangeEnd = (submissions.page - 1) * submissions.pageSize + submissions.items.length;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <article className="surface-card rounded-[1.5rem] px-5 py-5">
          <p className="text-sm font-semibold text-[var(--brand-muted)]">Total submissions</p>
          <p className="mt-3 text-3xl font-semibold text-[var(--brand-navy)]">{stats.totalSubmissions}</p>
        </article>
        <article className="surface-card rounded-[1.5rem] px-5 py-5">
          <p className="text-sm font-semibold text-[var(--brand-muted)]">Failed emails</p>
          <p className="mt-3 text-3xl font-semibold text-[var(--brand-navy)]">{stats.failedEmails}</p>
        </article>
        <article className="surface-card rounded-[1.5rem] px-5 py-5">
          <p className="text-sm font-semibold text-[var(--brand-muted)]">Pending PDFs</p>
          <p className="mt-3 text-3xl font-semibold text-[var(--brand-navy)]">{stats.pendingPdfs}</p>
        </article>
      </section>

      <section className="surface-card rounded-[2rem] p-5 sm:p-6">
        <div className="mb-5 flex flex-col gap-2">
          <h2 className="text-2xl font-semibold text-[var(--brand-navy)]">Submissions</h2>
          <p className="text-sm text-[var(--brand-muted)]">Search by reference, project, surveyor or author, or site location. Newest entries appear first.</p>
        </div>

        <form className="grid gap-3 rounded-[1.5rem] bg-[var(--brand-surface-alt)] p-4 lg:grid-cols-[minmax(0,2fr),repeat(3,minmax(0,1fr)),auto]">
          <div className="field-shell rounded-2xl px-4 py-3">
            <input
              name="q"
              defaultValue={params.q ?? ""}
              placeholder="Search reference, project, surveyor, site"
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>

          <label className="field-shell rounded-2xl px-4 py-3 text-sm">
            <select name="pdf_status" defaultValue={params.pdf_status ?? ""} className="w-full bg-transparent outline-none">
              <option value="">All PDF statuses</option>
              <option value="pending">Pending</option>
              <option value="complete">Complete</option>
              <option value="failed">Failed</option>
            </select>
          </label>

          <label className="field-shell rounded-2xl px-4 py-3 text-sm">
            <select name="email_status" defaultValue={params.email_status ?? ""} className="w-full bg-transparent outline-none">
              <option value="">All email statuses</option>
              <option value="pending">Pending</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
            </select>
          </label>

          <label className="field-shell rounded-2xl px-4 py-3 text-sm">
            <select name="status" defaultValue={params.status ?? ""} className="w-full bg-transparent outline-none">
              <option value="">All record statuses</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="completed">Completed</option>
              <option value="received">Received</option>
              <option value="failed">Failed</option>
            </select>
          </label>

          <button type="submit" className="rounded-2xl bg-[var(--brand-navy)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-navy-dark)]">
            Apply
          </button>
        </form>

        <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-[var(--brand-border)]">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--brand-border)] text-sm">
              <thead className="data-grid-header">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Reference</th>
                  <th className="px-4 py-3 text-left font-semibold">Project</th>
                  <th className="px-4 py-3 text-left font-semibold">Type</th>
                  <th className="px-4 py-3 text-left font-semibold">Surveyor / author</th>
                  <th className="px-4 py-3 text-left font-semibold">Survey date</th>
                  <th className="px-4 py-3 text-left font-semibold">Created</th>
                  <th className="px-4 py-3 text-left font-semibold">Photos / files</th>
                  <th className="px-4 py-3 text-left font-semibold">PDF</th>
                  <th className="px-4 py-3 text-left font-semibold">Email</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--brand-border)] bg-white">
                {submissions.items.length > 0 ? (
                  submissions.items.map((submission) => (
                    <tr key={submission.reference} className="transition hover:bg-[var(--brand-surface-alt)]">
                      <td className="px-4 py-3 font-semibold text-[var(--brand-navy)]">
                        <Link href={`/admin/submissions/${submission.reference}`} className="hover:underline">
                          {submission.reference}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{submission.project}</td>
                      <td className="px-4 py-3">{submission.survey_type || "-"}</td>
                      <td className="px-4 py-3">{submission.surveyor_name}</td>
                      <td className="px-4 py-3">{formatDate(submission.survey_date)}</td>
                      <td className="px-4 py-3">{formatDate(submission.created_at)}</td>
                      <td className="px-4 py-3">{submission.photo_count}</td>
                      <td className="px-4 py-3">
                        <StatusBadge value={submission.pdf_status} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge value={submission.email_status} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge value={submission.status} />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="px-4 py-10 text-center text-[var(--brand-muted)]">
                      No submissions matched the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 text-sm text-[var(--brand-muted)] sm:flex-row sm:items-center sm:justify-between">
          <p>
            Showing {rangeStart}-{rangeEnd} of {submissions.total}
          </p>

          <div className="flex items-center gap-2">
            <Link
              href={buildPageHref(Math.max(1, submissions.page - 1), params)}
              className={`rounded-full border px-4 py-2 font-semibold ${submissions.page <= 1 ? "pointer-events-none border-[var(--brand-border)] text-slate-400" : "border-[var(--brand-border)] text-[var(--brand-navy)] hover:border-[var(--brand-navy)]"}`}
            >
              Previous
            </Link>
            <span>
              Page {submissions.page} of {submissions.totalPages}
            </span>
            <Link
              href={buildPageHref(Math.min(submissions.totalPages, submissions.page + 1), params)}
              className={`rounded-full border px-4 py-2 font-semibold ${submissions.page >= submissions.totalPages ? "pointer-events-none border-[var(--brand-border)] text-slate-400" : "border-[var(--brand-border)] text-[var(--brand-navy)] hover:border-[var(--brand-navy)]"}`}
            >
              Next
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
