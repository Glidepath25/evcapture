import path from "node:path";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyReferenceButton } from "@/components/admin/copy-reference-button";
import { StatusBadge } from "@/components/admin/status-badge";
import { getAdminSubmissionDetail } from "@/lib/admin-data";

type SubmissionDetailPageProps = {
  params: Promise<{
    reference: string;
  }>;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: value.includes("T") ? "short" : undefined,
  }).format(new Date(value));
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function SubmissionDetailPage({ params }: SubmissionDetailPageProps) {
  const { reference } = await params;
  const detail = getAdminSubmissionDetail(reference);

  if (!detail) {
    notFound();
  }

  const { submission } = detail;
  const generalPhotos = detail.photos.filter((photo) => !photo.linked_template_id);
  const linkedPhotoGroups = Array.from(
    detail.photos
      .filter((photo) => photo.linked_template_id)
      .reduce(
        (groups, photo) => {
          const key = `${photo.linked_section_name}:::${photo.linked_description}`;
          const existing = groups.get(key);

          if (existing) {
            existing.photos.push(photo);
          } else {
            groups.set(key, {
              title: photo.linked_description,
              section: photo.linked_section_name,
              photos: [photo],
            });
          }

          return groups;
        },
        new Map<
          string,
          {
            title: string;
            section: string;
            photos: typeof detail.photos;
          }
        >(),
      )
      .values(),
  );

  return (
    <div className="space-y-6">
      <section className="surface-card rounded-[2rem] p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link href="/admin" className="text-sm font-semibold text-[var(--brand-navy)] hover:underline">
              Back to submissions
            </Link>
            <h2 className="mt-3 text-3xl font-semibold text-[var(--brand-navy)]">{submission.reference}</h2>
            <p className="mt-2 text-sm text-[var(--brand-muted)]">
              Created {formatDate(submission.created_at)} for {submission.project}.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <CopyReferenceButton reference={submission.reference} />
            {submission.pdf_path ? (
              <Link
                href={`/download/${submission.reference}`}
                className="rounded-full border border-[var(--brand-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--brand-navy)] transition hover:border-[var(--brand-navy)]"
                target="_blank"
                rel="noreferrer"
              >
                Open public PDF download
              </Link>
            ) : null}
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <article className="rounded-[1.5rem] border border-[var(--brand-border)] bg-[var(--brand-surface-alt)] p-5">
            <h3 className="text-lg font-semibold text-[var(--brand-navy)]">Submission summary</h3>
            <dl className="mt-4 grid gap-3 text-sm">
              <div className="grid gap-1 sm:grid-cols-[160px,1fr]">
                <dt className="font-semibold text-[var(--brand-muted)]">Project</dt>
                <dd>{submission.project}</dd>
              </div>
              <div className="grid gap-1 sm:grid-cols-[160px,1fr]">
                <dt className="font-semibold text-[var(--brand-muted)]">Surveyor name</dt>
                <dd>{submission.surveyor_name}</dd>
              </div>
              <div className="grid gap-1 sm:grid-cols-[160px,1fr]">
                <dt className="font-semibold text-[var(--brand-muted)]">Survey date</dt>
                <dd>{formatDate(submission.survey_date)}</dd>
              </div>
              <div className="grid gap-1 sm:grid-cols-[160px,1fr]">
                <dt className="font-semibold text-[var(--brand-muted)]">Site location</dt>
                <dd>{submission.site_location || "Not provided"}</dd>
              </div>
              <div className="grid gap-1 sm:grid-cols-[160px,1fr]">
                <dt className="font-semibold text-[var(--brand-muted)]">General comments</dt>
                <dd className="whitespace-pre-wrap">{submission.general_comments || "None"}</dd>
              </div>
            </dl>
          </article>

          <article className="rounded-[1.5rem] border border-[var(--brand-border)] bg-[var(--brand-surface-alt)] p-5">
            <h3 className="text-lg font-semibold text-[var(--brand-navy)]">Processing</h3>
            <dl className="mt-4 grid gap-3 text-sm">
              <div className="grid gap-1 sm:grid-cols-[160px,1fr] sm:items-center">
                <dt className="font-semibold text-[var(--brand-muted)]">PDF status</dt>
                <dd>
                  <StatusBadge value={submission.pdf_status} />
                </dd>
              </div>
              <div className="grid gap-1 sm:grid-cols-[160px,1fr] sm:items-center">
                <dt className="font-semibold text-[var(--brand-muted)]">Email status</dt>
                <dd>
                  <StatusBadge value={submission.email_status} />
                </dd>
              </div>
              <div className="grid gap-1 sm:grid-cols-[160px,1fr] sm:items-center">
                <dt className="font-semibold text-[var(--brand-muted)]">Record status</dt>
                <dd>
                  <StatusBadge value={submission.status} />
                </dd>
              </div>
              <div className="grid gap-1 sm:grid-cols-[160px,1fr]">
                <dt className="font-semibold text-[var(--brand-muted)]">Client IP</dt>
                <dd>{submission.client_ip || "Not captured"}</dd>
              </div>
              <div className="grid gap-1 sm:grid-cols-[160px,1fr]">
                <dt className="font-semibold text-[var(--brand-muted)]">User agent</dt>
                <dd className="break-words">{submission.user_agent || "Not captured"}</dd>
              </div>
              <div className="grid gap-1 sm:grid-cols-[160px,1fr]">
                <dt className="font-semibold text-[var(--brand-muted)]">Email error</dt>
                <dd className="whitespace-pre-wrap break-words">{submission.email_error || "None"}</dd>
              </div>
            </dl>
          </article>
        </div>
      </section>

      <section className="surface-card rounded-[2rem] p-5 sm:p-6">
        <div className="mb-4">
          <h3 className="text-2xl font-semibold text-[var(--brand-navy)]">Line items</h3>
          <p className="mt-1 text-sm text-[var(--brand-muted)]">Captured schedule-of-rates entries for this survey.</p>
        </div>

        <div className="overflow-hidden rounded-[1.5rem] border border-[var(--brand-border)]">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--brand-border)] text-sm">
              <thead className="data-grid-header">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Section</th>
                  <th className="px-4 py-3 text-left font-semibold">Charge type</th>
                  <th className="px-4 py-3 text-left font-semibold">Description</th>
                  <th className="px-4 py-3 text-left font-semibold">Quantity</th>
                  <th className="px-4 py-3 text-left font-semibold">Notes</th>
                  <th className="px-4 py-3 text-left font-semibold">Additional description</th>
                  <th className="px-4 py-3 text-left font-semibold">Notes guidance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--brand-border)] bg-white align-top">
                {detail.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3">{item.section_name}</td>
                    <td className="px-4 py-3">{item.charge_type}</td>
                    <td className="px-4 py-3 font-medium text-[var(--brand-ink)]">{item.description}</td>
                    <td className="px-4 py-3">{item.quantity ?? "-"}</td>
                    <td className="px-4 py-3 whitespace-pre-wrap">{item.notes || "-"}</td>
                    <td className="px-4 py-3 whitespace-pre-wrap text-[var(--brand-muted)]">{item.additional_description || "-"}</td>
                    <td className="px-4 py-3 whitespace-pre-wrap text-[var(--brand-muted)]">{item.notes_guidance || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="surface-card rounded-[2rem] p-5 sm:p-6">
        <div className="mb-5">
          <h3 className="text-2xl font-semibold text-[var(--brand-navy)]">Photos</h3>
          <p className="mt-1 text-sm text-[var(--brand-muted)]">Uploaded photos are shown through protected admin routes only.</p>
        </div>

        <div className="space-y-6">
          <article>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h4 className="text-lg font-semibold text-[var(--brand-navy)]">General site photos</h4>
              <span className="text-sm text-[var(--brand-muted)]">{generalPhotos.length} photo(s)</span>
            </div>

            {generalPhotos.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {generalPhotos.map((photo) => (
                  <a
                    key={photo.id}
                    href={`/admin/photos/${photo.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-[1.5rem] border border-[var(--brand-border)] bg-[var(--brand-surface-alt)] p-3 transition hover:border-[var(--brand-navy)]"
                  >
                    <Image
                      src={`/admin/photos/${photo.id}`}
                      alt={photo.original_name}
                      width={1200}
                      height={900}
                      unoptimized
                      className="h-44 w-full rounded-[1rem] object-cover"
                    />
                    <p className="mt-3 truncate text-sm font-semibold text-[var(--brand-ink)]">{photo.original_name}</p>
                    <p className="mt-1 text-xs text-[var(--brand-muted)]">{formatFileSize(photo.size_bytes)}</p>
                  </a>
                ))}
              </div>
            ) : (
              <p className="rounded-[1.5rem] border border-dashed border-[var(--brand-border)] px-4 py-6 text-sm text-[var(--brand-muted)]">
                No general site photos were uploaded.
              </p>
            )}
          </article>

          <article>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h4 className="text-lg font-semibold text-[var(--brand-navy)]">Item-linked photos</h4>
              <span className="text-sm text-[var(--brand-muted)]">{detail.photos.length - generalPhotos.length} photo(s)</span>
            </div>

            {linkedPhotoGroups.length > 0 ? (
              <div className="space-y-4">
                {linkedPhotoGroups.map((group) => (
                  <div key={`${group.section}-${group.title}`} className="rounded-[1.5rem] border border-[var(--brand-border)] bg-[var(--brand-surface-alt)] p-4">
                    <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h5 className="font-semibold text-[var(--brand-navy)]">{group.title}</h5>
                        <p className="text-sm text-[var(--brand-muted)]">{group.section}</p>
                      </div>
                      <span className="text-sm text-[var(--brand-muted)]">{group.photos.length} photo(s)</span>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {group.photos.map((photo) => (
                        <a
                          key={photo.id}
                          href={`/admin/photos/${photo.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-[1.25rem] border border-[var(--brand-border)] bg-white p-3 transition hover:border-[var(--brand-navy)]"
                        >
                          <Image
                            src={`/admin/photos/${photo.id}`}
                            alt={photo.original_name}
                            width={1200}
                            height={900}
                            unoptimized
                            className="h-40 w-full rounded-[0.9rem] object-cover"
                          />
                          <p className="mt-3 truncate text-sm font-semibold text-[var(--brand-ink)]">{photo.original_name}</p>
                          <p className="mt-1 text-xs text-[var(--brand-muted)]">{formatFileSize(photo.size_bytes)}</p>
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-[1.5rem] border border-dashed border-[var(--brand-border)] px-4 py-6 text-sm text-[var(--brand-muted)]">
                No item-linked photos were uploaded.
              </p>
            )}
          </article>
        </div>
      </section>

      <section className="surface-card rounded-[2rem] p-5 sm:p-6">
        <div className="mb-4">
          <h3 className="text-2xl font-semibold text-[var(--brand-navy)]">Files</h3>
          <p className="mt-1 text-sm text-[var(--brand-muted)]">Generated files are served through protected admin routes.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <article className="rounded-[1.5rem] border border-[var(--brand-border)] bg-[var(--brand-surface-alt)] p-5">
            <h4 className="text-lg font-semibold text-[var(--brand-navy)]">PDF summary</h4>
            <p className="mt-2 text-sm text-[var(--brand-muted)]">{submission.pdf_path ? path.basename(submission.pdf_path) : "Not available yet"}</p>
            {submission.pdf_path ? (
              <Link
                href={`/admin/files/pdf/${submission.reference}`}
                className="mt-4 inline-flex rounded-full bg-[var(--brand-navy)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-navy-dark)]"
              >
                Download PDF
              </Link>
            ) : null}
          </article>

          <article className="rounded-[1.5rem] border border-[var(--brand-border)] bg-[var(--brand-surface-alt)] p-5">
            <h4 className="text-lg font-semibold text-[var(--brand-navy)]">CSV export</h4>
            <p className="mt-2 text-sm text-[var(--brand-muted)]">{submission.csv_path ? path.basename(submission.csv_path) : "Not available yet"}</p>
            {submission.csv_path ? (
              <Link
                href={`/admin/files/csv/${submission.reference}`}
                className="mt-4 inline-flex rounded-full bg-[var(--brand-navy)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-navy-dark)]"
              >
                Download CSV
              </Link>
            ) : null}
          </article>
        </div>
      </section>
    </div>
  );
}
