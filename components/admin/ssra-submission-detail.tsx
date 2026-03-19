import path from "node:path";
import Image from "next/image";
import Link from "next/link";
import { SSRA_ATTACHMENT_SECTIONS } from "@/data/ssra-config";
import { CopyReferenceButton } from "@/components/admin/copy-reference-button";
import { StatusBadge } from "@/components/admin/status-badge";
import type { AdminSsraSubmissionDetail } from "@/lib/admin-data";

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

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function humanizeKey(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (letter) => letter.toUpperCase());
}

function attachmentLabel(sectionKey: string, questionKey: string) {
  const match = Object.values(SSRA_ATTACHMENT_SECTIONS).find(
    (entry) => entry.sectionKey === sectionKey && entry.questionKey === questionKey,
  );

  return match?.label ?? `${humanizeKey(sectionKey)} / ${humanizeKey(questionKey)}`;
}

function DetailList({
  items,
}: {
  items: Array<{ label: string; value: string }>;
}) {
  return (
    <dl className="grid gap-3 text-sm">
      {items.map((item) => (
        <div key={item.label} className="grid gap-1 sm:grid-cols-[190px,1fr]">
          <dt className="font-semibold text-[var(--brand-muted)]">{item.label}</dt>
          <dd className="whitespace-pre-wrap break-words">{item.value || "-"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function SsraSubmissionDetailView({ detail }: { detail: AdminSsraSubmissionDetail }) {
  const { submission, formData } = detail;
  const attachmentGroups = Array.from(
    detail.attachments.reduce(
      (groups, attachment) => {
        const key = `${attachment.section_key}:${attachment.question_key}`;
        groups.set(key, [...(groups.get(key) ?? []), attachment]);
        return groups;
      },
      new Map<string, typeof detail.attachments>(),
    ),
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
              Created {formatDate(submission.created_at)} for {submission.project || "SSRA"}.
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
            <h3 className="text-lg font-semibold text-[var(--brand-navy)]">SSRA summary</h3>
            <div className="mt-4">
              <DetailList
                items={[
                  { label: "Project", value: submission.project || "-" },
                  { label: "Date & time", value: submission.event_datetime ? formatDate(submission.event_datetime) : "-" },
                  { label: "Location", value: submission.location || "-" },
                  { label: "Author", value: submission.author || "-" },
                  { label: "Description of works", value: submission.description_of_works || "-" },
                ]}
              />
            </div>
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
                <dt className="font-semibold text-[var(--brand-muted)]">Submitted at</dt>
                <dd>{submission.submitted_at ? formatDate(submission.submitted_at) : "Not submitted yet"}</dd>
              </div>
              <div className="grid gap-1 sm:grid-cols-[160px,1fr]">
                <dt className="font-semibold text-[var(--brand-muted)]">Updated at</dt>
                <dd>{formatDate(submission.updated_at)}</dd>
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
          <h3 className="text-2xl font-semibold text-[var(--brand-navy)]">Personnel on site</h3>
          <p className="mt-1 text-sm text-[var(--brand-muted)]">Captured summary and personnel rows from page 1.</p>
        </div>

        <div className="space-y-3">
          {formData.summary.personnel.some((person) => person.name || person.company || person.department) ? (
            formData.summary.personnel.map((person, index) =>
              person.name || person.company || person.department ? (
                <div
                  key={`${person.name}-${index}`}
                  className="rounded-[1.5rem] border border-[var(--brand-border)] bg-[var(--brand-surface-alt)] p-4"
                >
                  <DetailList
                    items={[
                      { label: `Person ${index + 1}`, value: person.name || "-" },
                      { label: "Company", value: person.company || "-" },
                      { label: "Department", value: person.department || "-" },
                    ]}
                  />
                </div>
              ) : null,
            )
          ) : (
            <p className="rounded-[1.5rem] border border-dashed border-[var(--brand-border)] px-4 py-6 text-sm text-[var(--brand-muted)]">
              No personnel were entered on this SSRA.
            </p>
          )}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="surface-card rounded-[2rem] p-5 sm:p-6">
          <h3 className="text-2xl font-semibold text-[var(--brand-navy)]">Hazards and Controls</h3>
          <div className="mt-4">
            <DetailList
              items={[
                { label: "Activities", value: formData.hazards.activities.join(", ") || "-" },
                { label: "Plant & equipment", value: formData.hazards.equipment.join(", ") || "-" },
                { label: "Other equipment", value: formData.hazards.otherEquipment || "-" },
                { label: "Surface removal tools", value: formData.hazards.surfaceRemovalTools.join(", ") || "-" },
                { label: "Surface removal comments", value: formData.hazards.surfaceRemovalComments || "-" },
                { label: "Excavation tools", value: formData.hazards.excavationTools.join(", ") || "-" },
                { label: "Excavation comments", value: formData.hazards.excavationComments || "-" },
              ]}
            />
          </div>
        </article>

        <article className="surface-card rounded-[2rem] p-5 sm:p-6">
          <h3 className="text-2xl font-semibold text-[var(--brand-navy)]">PPE and RPE</h3>
          <div className="mt-4">
            <DetailList
              items={[
                { label: "PPE items", value: formData.ppe.ppeItems.join(", ") || "-" },
                { label: "Comments", value: formData.ppe.comments || "-" },
                {
                  label: "First aider on site",
                  value: formData.ppe.firstAiderNotApplicable ? "N/A" : formData.ppe.firstAiderOnSite || "-",
                },
                {
                  label: "Nearest hospital",
                  value: formData.ppe.nearestHospitalNotApplicable ? "N/A" : formData.ppe.nearestHospital || "-",
                },
                {
                  label: "Nearest defib",
                  value: formData.ppe.nearestDefibNotApplicable ? "N/A" : formData.ppe.nearestDefib || "-",
                },
              ]}
            />
          </div>
        </article>

        <article className="surface-card rounded-[2rem] p-5 sm:p-6">
          <h3 className="text-2xl font-semibold text-[var(--brand-navy)]">Environmental</h3>
          <div className="mt-4">
            <DetailList
              items={[
                { label: "Surrounding area comments", value: formData.environmental.surroundingAreaComments || "-" },
                {
                  label: "Tree trimming activities",
                  value: `${formData.environmental.treeTrimming.answer || "-"}${formData.environmental.treeTrimming.comments ? ` | ${formData.environmental.treeTrimming.comments}` : ""}`,
                },
                {
                  label: "Night works",
                  value: `${formData.environmental.nightWorks.answer || "-"}${formData.environmental.nightWorks.comments ? ` | ${formData.environmental.nightWorks.comments}` : ""}`,
                },
                {
                  label: "Invasive species area",
                  value: `${formData.environmental.invasiveSpecies.answer || "-"}${formData.environmental.invasiveSpecies.comments ? ` | ${formData.environmental.invasiveSpecies.comments}` : ""}`,
                },
                {
                  label: "COSHH materials on site",
                  value: `${formData.environmental.coshhOnSite.answer || "-"}${formData.environmental.coshhOnSite.comments ? ` | ${formData.environmental.coshhOnSite.comments}` : ""}`,
                },
                {
                  label: "Spill kit",
                  value: `${formData.environmental.spillKit.answer || "-"}${formData.environmental.spillKit.comments ? ` | ${formData.environmental.spillKit.comments}` : ""}`,
                },
                {
                  label: "COSHH / MSDS awareness",
                  value: `${formData.environmental.coshhAssessmentsAware.answer || "-"}${formData.environmental.coshhAssessmentsAware.comments ? ` | ${formData.environmental.coshhAssessmentsAware.comments}` : ""}`,
                },
              ]}
            />
          </div>
        </article>

        <article className="surface-card rounded-[2rem] p-5 sm:p-6">
          <h3 className="text-2xl font-semibold text-[var(--brand-navy)]">Streetworks & Traffic Management</h3>
          <div className="mt-4">
            <DetailList
              items={[
                { label: "Traffic Control Permit", value: formData.streetworks.trafficControlPermit || "-" },
                { label: "Permit comments", value: formData.streetworks.trafficControlPermitComments || "-" },
                { label: "Duration of works", value: formData.streetworks.durations.join(", ") || "-" },
                { label: "Road type / classification", value: formData.streetworks.roadTypes.join(", ") || "-" },
                {
                  label: "Traffic management provision",
                  value: formData.streetworks.trafficManagementProvisions.join(", ") || "-",
                },
                { label: "Walkways closed", value: formData.streetworks.pedestrianWalkwaysClosed || "-" },
                { label: "Pedestrian comments", value: formData.streetworks.pedestrianWalkwaysComments || "-" },
                {
                  label: "Advanced SLG",
                  value: `${formData.streetworks.advancedSlg.status || "-"}${formData.streetworks.advancedSlg.comments ? ` | ${formData.streetworks.advancedSlg.comments}` : ""}`,
                },
                {
                  label: "Safety zones",
                  value: `${formData.streetworks.safetyZones.status || "-"}${formData.streetworks.safetyZones.comments ? ` | ${formData.streetworks.safetyZones.comments}` : ""}`,
                },
                { label: "General comments", value: formData.streetworks.generalComments || "-" },
              ]}
            />
          </div>
        </article>

        <article className="surface-card rounded-[2rem] p-5 sm:p-6">
          <h3 className="text-2xl font-semibold text-[var(--brand-navy)]">Openreach PIA Network</h3>
          <div className="mt-4">
            <DetailList
              items={[
                { label: "Accreditation holder names", value: formData.pia.accreditationHolderNames || "-" },
                { label: "Accreditations", value: formData.pia.accreditations.join(", ") || "-" },
                {
                  label: "Underground network interaction",
                  value: `${formData.pia.undergroundInteraction || "-"}${formData.pia.undergroundInteractionComments ? ` | ${formData.pia.undergroundInteractionComments}` : ""}`,
                },
                {
                  label: "Overhead network interaction",
                  value: `${formData.pia.overheadInteraction || "-"}${formData.pia.overheadInteractionComments ? ` | ${formData.pia.overheadInteractionComments}` : ""}`,
                },
              ]}
            />
          </div>
        </article>

        <article className="surface-card rounded-[2rem] p-5 sm:p-6">
          <h3 className="text-2xl font-semibold text-[var(--brand-navy)]">Signature</h3>
          <div className="mt-4 space-y-4">
            <DetailList
              items={[
                { label: "Signed at", value: formData.signature.signatureSignedAt || "Not captured" },
              ]}
            />
            {formData.signature.signatureDataUrl ? (
              <div className="rounded-[1.5rem] border border-[var(--brand-border)] bg-[var(--brand-surface-alt)] p-4">
                <img
                  src={formData.signature.signatureDataUrl}
                  alt="SSRA signature"
                  className="max-h-52 w-full rounded-[1rem] object-contain"
                />
              </div>
            ) : (
              <p className="rounded-[1.5rem] border border-dashed border-[var(--brand-border)] px-4 py-6 text-sm text-[var(--brand-muted)]">
                No signature image stored.
              </p>
            )}
          </div>
        </article>
      </section>

      <section className="surface-card rounded-[2rem] p-5 sm:p-6">
        <div className="mb-5">
          <h3 className="text-2xl font-semibold text-[var(--brand-navy)]">Attachments</h3>
          <p className="mt-1 text-sm text-[var(--brand-muted)]">Attachment references grouped by section and question.</p>
        </div>

        {attachmentGroups.length > 0 ? (
          <div className="space-y-4">
            {attachmentGroups.map(([key, attachments]) => (
              <div key={key} className="rounded-[1.5rem] border border-[var(--brand-border)] bg-[var(--brand-surface-alt)] p-4">
                <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h4 className="font-semibold text-[var(--brand-navy)]">
                      {attachmentLabel(attachments[0].section_key, attachments[0].question_key)}
                    </h4>
                    <p className="text-sm text-[var(--brand-muted)]">
                      {attachments[0].section_key} / {attachments[0].question_key}
                    </p>
                  </div>
                  <span className="text-sm text-[var(--brand-muted)]">{attachments.length} attachment(s)</span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {attachments.map((attachment) => {
                    const isImage = attachment.mime_type.startsWith("image/");

                    return (
                      <a
                        key={attachment.id}
                        href={`/admin/attachments/${attachment.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-[1.25rem] border border-[var(--brand-border)] bg-white p-3 transition hover:border-[var(--brand-navy)]"
                      >
                        {isImage ? (
                          <Image
                            src={`/admin/attachments/${attachment.id}`}
                            alt={attachment.original_name}
                            width={1200}
                            height={900}
                            unoptimized
                            className="h-40 w-full rounded-[0.9rem] object-cover"
                          />
                        ) : (
                          <div className="flex h-40 items-center justify-center rounded-[0.9rem] bg-[var(--brand-surface-alt)] px-4 text-center text-sm font-semibold text-[var(--brand-navy)]">
                            {path.extname(attachment.original_name).replace(".", "").toUpperCase() || "FILE"}
                          </div>
                        )}
                        <p className="mt-3 truncate text-sm font-semibold text-[var(--brand-ink)]">{attachment.original_name}</p>
                        <p className="mt-1 text-xs text-[var(--brand-muted)]">{formatFileSize(attachment.size_bytes)}</p>
                      </a>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-[1.5rem] border border-dashed border-[var(--brand-border)] px-4 py-6 text-sm text-[var(--brand-muted)]">
            No attachments were uploaded against this SSRA.
          </p>
        )}
      </section>

      <section className="surface-card rounded-[2rem] p-5 sm:p-6">
        <div className="mb-4">
          <h3 className="text-2xl font-semibold text-[var(--brand-navy)]">Files</h3>
          <p className="mt-1 text-sm text-[var(--brand-muted)]">Generated SSRA files served through protected admin routes.</p>
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
            <h4 className="text-lg font-semibold text-[var(--brand-navy)]">Stored attachments</h4>
            <p className="mt-2 text-sm text-[var(--brand-muted)]">{submission.attachment_count} stored attachment(s)</p>
            <p className="mt-4 text-sm text-[var(--brand-muted)]">
              Use the attachment cards above to inspect image previews or download supporting files.
            </p>
          </article>
        </div>
      </section>
    </div>
  );
}
