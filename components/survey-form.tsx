"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { todayIsoDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { EditableLineItem, Project, SurveyTemplateRow } from "@/types";

type SurveyFormProps = {
  projects: Project[];
  templateRows: SurveyTemplateRow[];
  maxUploadCount: number;
  maxUploadMb: number;
};

type FieldErrors = Record<string, string>;
type PhotoEntry = {
  file: File;
  key: string;
  previewUrl: string;
};

function buildDefaultItems(rows: SurveyTemplateRow[]): EditableLineItem[] {
  return rows.map((row) => ({
    templateId: row.id,
    quantity: "",
    notes: "",
  }));
}

export function SurveyForm({ projects, templateRows, maxUploadCount, maxUploadMb }: SurveyFormProps) {
  const router = useRouter();
  const [items, setItems] = useState<EditableLineItem[]>(() => buildDefaultItems(templateRows));
  const [project, setProject] = useState("");
  const [surveyorName, setSurveyorName] = useState("");
  const [surveyDate, setSurveyDate] = useState(todayIsoDate());
  const [siteLocation, setSiteLocation] = useState("");
  const [generalComments, setGeneralComments] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [photoEntries, setPhotoEntries] = useState<PhotoEntry[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [isPending, startTransition] = useTransition();
  const photoEntriesRef = useRef<PhotoEntry[]>([]);

  useEffect(() => {
    return () => {
      photoEntriesRef.current.forEach((entry) => URL.revokeObjectURL(entry.previewUrl));
    };
  }, []);

  useEffect(() => {
    photoEntriesRef.current = photoEntries;
  }, [photoEntries]);

  function updateItem(templateId: string, field: "quantity" | "notes", value: string) {
    setItems((current) =>
      current.map((item) => {
        if (item.templateId !== templateId) {
          return item;
        }

        return {
          ...item,
          [field]: value,
        };
      }),
    );
  }

  function mergePhotos(nextFiles: File[]) {
    const deduped = new Map<string, PhotoEntry>();

    for (const entry of photoEntries) {
      deduped.set(entry.key, entry);
    }

    for (const file of nextFiles) {
      const key = `${file.name}-${file.size}-${file.lastModified}`;
      if (!deduped.has(key)) {
        deduped.set(key, {
          file,
          key,
          previewUrl: URL.createObjectURL(file),
        });
      }
    }

    const merged = Array.from(deduped.values());
    const limited = merged.slice(0, maxUploadCount);
    const keptKeys = new Set(limited.map((entry) => entry.key));

    for (const entry of merged) {
      if (!keptKeys.has(entry.key)) {
        URL.revokeObjectURL(entry.previewUrl);
      }
    }

    setPhotoEntries(limited);
  }

  function validateClientSide() {
    const nextErrors: FieldErrors = {};
    if (!project) {
      nextErrors.project = "Project is required.";
    }
    if (!surveyorName.trim()) {
      nextErrors.surveyorName = "Surveyor name is required.";
    }
    if (!surveyDate) {
      nextErrors.surveyDate = "Survey date is required.";
    }

    const hasLineItemData = items.some((item) => item.quantity.trim() || item.notes.trim());
    if (!hasLineItemData && photoEntries.length === 0) {
      nextErrors.form = "Enter at least one quantity, note, or photo before submitting.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function submitForm() {
    const formData = new FormData();
    formData.set("project", project);
    formData.set("surveyorName", surveyorName);
    formData.set("surveyDate", surveyDate);
    formData.set("siteLocation", siteLocation);
    formData.set("generalComments", generalComments);
    formData.set("companyWebsite", honeypot);
    formData.set("items", JSON.stringify(items));

    for (const entry of photoEntries) {
      formData.append("photos", entry.file);
    }

    const response = await fetch("/api/submit", {
      method: "POST",
      body: formData,
    });

    const payload = (await response.json()) as { error?: string; reference?: string; emailDelivered?: boolean };

    if (!response.ok || !payload.reference) {
      throw new Error(payload.error || "Submission failed.");
    }

    router.push(`/success?reference=${encodeURIComponent(payload.reference)}&email=${payload.emailDelivered ? "sent" : "failed"}`);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError("");

    if (!validateClientSide()) {
      return;
    }

    startTransition(() => {
      void submitForm().catch((error: unknown) => {
        setSubmitError(error instanceof Error ? error.message : "Submission failed.");
      });
    });
  }

  const sectionGroups = templateRows.reduce<Array<{ section: string; rows: SurveyTemplateRow[] }>>((groups, row) => {
    const existing = groups.find((group) => group.section === row.section);
    if (existing) {
      existing.rows.push(row);
      return groups;
    }

    groups.push({ section: row.section, rows: [row] });
    return groups;
  }, []);

  return (
    <form className="relative" onSubmit={handleSubmit}>
      <div className="space-y-6 pb-28 sm:pb-24">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--brand-navy)]">Survey form</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--brand-muted)]">
            Complete the project details, update the schedule-of-rates line items, and upload any supporting photos from site.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[var(--brand-navy)]">Project *</span>
            <div className="field-shell rounded-2xl">
              <select
                className="w-full rounded-2xl bg-transparent px-4 py-3 text-base outline-none"
                value={project}
                onChange={(event) => setProject(event.target.value)}
              >
                <option value="">Select a project</option>
                {projects.map((projectOption) => (
                  <option key={projectOption.id} value={projectOption.name}>
                    {projectOption.name}
                  </option>
                ))}
              </select>
            </div>
            {errors.project ? <p className="mt-2 text-sm text-red-700">{errors.project}</p> : null}
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[var(--brand-navy)]">Surveyor name *</span>
            <div className="field-shell rounded-2xl">
              <input
                className="w-full rounded-2xl bg-transparent px-4 py-3 text-base outline-none"
                value={surveyorName}
                onChange={(event) => setSurveyorName(event.target.value)}
                placeholder="Enter full name"
              />
            </div>
            {errors.surveyorName ? <p className="mt-2 text-sm text-red-700">{errors.surveyorName}</p> : null}
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[var(--brand-navy)]">Survey date *</span>
            <div className="field-shell rounded-2xl">
              <input
                className="w-full rounded-2xl bg-transparent px-4 py-3 text-base outline-none"
                type="date"
                value={surveyDate}
                onChange={(event) => setSurveyDate(event.target.value)}
              />
            </div>
            {errors.surveyDate ? <p className="mt-2 text-sm text-red-700">{errors.surveyDate}</p> : null}
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[var(--brand-navy)]">Site location</span>
            <div className="field-shell rounded-2xl">
              <input
                className="w-full rounded-2xl bg-transparent px-4 py-3 text-base outline-none"
                value={siteLocation}
                onChange={(event) => setSiteLocation(event.target.value)}
                placeholder="Street, site, or grid reference"
              />
            </div>
          </label>
        </div>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--brand-navy)]">General comments</span>
          <div className="field-shell rounded-2xl">
            <textarea
              className="min-h-28 w-full rounded-2xl bg-transparent px-4 py-3 text-base outline-none"
              value={generalComments}
              onChange={(event) => setGeneralComments(event.target.value)}
              placeholder="Optional site-wide comments"
            />
          </div>
        </label>

        <div className="hidden">
          <label htmlFor="company-website">Company website</label>
          <input
            id="company-website"
            autoComplete="off"
            tabIndex={-1}
            value={honeypot}
            onChange={(event) => setHoneypot(event.target.value)}
          />
        </div>

        <section className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-[var(--brand-navy)]">Survey table</h3>
            <p className="mt-1 text-sm text-[var(--brand-muted)]">
              Charge type and description are fixed. Enter only the quantity and notes that apply on site.
            </p>
          </div>

          <div className="hidden overflow-hidden rounded-[24px] border border-[var(--brand-border)] md:block">
            <div className="data-grid-header grid grid-cols-[1fr_2.2fr_0.6fr_1.2fr] gap-4 px-5 py-4 text-sm font-semibold">
              <div>Charge Type</div>
              <div>Description of Product/Service</div>
              <div className="text-right">Quantity</div>
              <div>Notes</div>
            </div>
            {sectionGroups.map((group) => (
              <div key={group.section}>
                <div className="border-t border-[var(--brand-border)] bg-[var(--brand-surface-alt)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--brand-navy)]">
                  {group.section}
                </div>
                {group.rows.map((row) => {
                  const item = items.find((entry) => entry.templateId === row.id);
                  return (
                    <div
                      key={row.id}
                      className="grid grid-cols-[1fr_2.2fr_0.6fr_1.2fr] gap-4 border-t border-[var(--brand-border)] px-5 py-4"
                    >
                      <div className="text-sm font-medium text-[var(--brand-ink)]">{row.chargeType}</div>
                      <div className="space-y-2 text-sm text-[var(--brand-ink)]">
                        <p className="font-medium">{row.description}</p>
                        {row.additionalDescription ? <p className="text-[13px] leading-5 text-[var(--brand-muted)]">{row.additionalDescription}</p> : null}
                        {row.notesGuidance ? (
                          <p className="rounded-xl bg-[var(--brand-surface-alt)] px-3 py-2 text-[12px] leading-5 text-[var(--brand-navy)]">
                            Notes guidance: {row.notesGuidance}
                          </p>
                        ) : null}
                      </div>
                      <div>
                        <div className="field-shell rounded-2xl">
                          <input
                            className="w-full rounded-2xl bg-transparent px-3 py-3 text-right text-base outline-none"
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="0.01"
                            value={item?.quantity ?? ""}
                            onChange={(event) => updateItem(row.id, "quantity", event.target.value)}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="field-shell rounded-2xl">
                          <textarea
                            className="min-h-24 w-full rounded-2xl bg-transparent px-3 py-3 text-base outline-none"
                            value={item?.notes ?? ""}
                            onChange={(event) => updateItem(row.id, "notes", event.target.value)}
                            placeholder="Add item-specific notes"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          
          <div className="space-y-4 md:hidden">
            {sectionGroups.map((group) => (
              <div key={group.section} className="space-y-3">
                <h4 className="px-1 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--brand-navy)]">{group.section}</h4>
                {group.rows.map((row) => {
                  const item = items.find((entry) => entry.templateId === row.id);
                  return (
                    <article key={row.id} className="rounded-[24px] border border-[var(--brand-border)] bg-white p-4 shadow-sm">
                      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">{row.chargeType}</div>
                      <h5 className="mt-2 text-base font-semibold text-[var(--brand-ink)]">{row.description}</h5>
                      {row.additionalDescription ? <p className="mt-2 text-sm leading-6 text-[var(--brand-muted)]">{row.additionalDescription}</p> : null}
                      {row.notesGuidance ? (
                        <p className="mt-3 rounded-2xl bg-[var(--brand-surface-alt)] px-3 py-3 text-sm leading-6 text-[var(--brand-navy)]">
                          Notes guidance: {row.notesGuidance}
                        </p>
                      ) : null}
                      <div className="mt-4 grid gap-3">
                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-[var(--brand-navy)]">Quantity</span>
                          <div className="field-shell rounded-2xl">
                            <input
                              className="w-full rounded-2xl bg-transparent px-4 py-3 text-base outline-none"
                              type="number"
                              inputMode="decimal"
                              min="0"
                              step="0.01"
                              value={item?.quantity ?? ""}
                              onChange={(event) => updateItem(row.id, "quantity", event.target.value)}
                            />
                          </div>
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-[var(--brand-navy)]">Notes</span>
                          <div className="field-shell rounded-2xl">
                            <textarea
                              className="min-h-24 w-full rounded-2xl bg-transparent px-4 py-3 text-base outline-none"
                              value={item?.notes ?? ""}
                              onChange={(event) => updateItem(row.id, "notes", event.target.value)}
                              placeholder="Add item-specific notes"
                            />
                          </div>
                        </label>
                      </div>
                    </article>
                  );
                })}
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-[var(--brand-navy)]">Photos</h3>
            <p className="mt-1 text-sm text-[var(--brand-muted)]">
              Upload from gallery or capture on site. Up to {maxUploadCount} photos, {maxUploadMb}MB each.
            </p>
          </div>

          <div
            className={cn(
              "rounded-[24px] border-2 border-dashed p-5 transition-colors",
              dragActive ? "border-[var(--brand-navy)] bg-[var(--brand-blue-soft)]/45" : "border-[var(--brand-border)] bg-[var(--brand-surface-alt)]",
            )}
            onDragEnter={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setDragActive(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setDragActive(false);
              mergePhotos(Array.from(event.dataTransfer.files).filter((file) => file.type.startsWith("image/")));
            }}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-base font-semibold text-[var(--brand-navy)]">Tap to add photos</p>
                <p className="mt-1 text-sm leading-6 text-[var(--brand-muted)]">
                  Camera capture is enabled on supported mobile browsers. Desktop users can also drag and drop files here.
                </p>
              </div>
              <label className="inline-flex cursor-pointer items-center justify-center rounded-2xl bg-[var(--brand-navy)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-navy-dark)]">
                Choose photos
                <input
                  className="hidden"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  onChange={(event) => {
                    const nextFiles = Array.from(event.target.files ?? []);
                    mergePhotos(nextFiles);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
            </div>
          </div>

          {photoEntries.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {photoEntries.map((entry, index) => (
                <div key={entry.key} className="overflow-hidden rounded-[22px] border border-[var(--brand-border)] bg-white">
                  <div className="aspect-[4/3] bg-[var(--brand-surface-alt)]">
                    <Image
                      unoptimized
                      alt={entry.file.name}
                      className="h-full w-full object-cover"
                      height={240}
                      src={entry.previewUrl}
                      width={320}
                    />
                  </div>
                  <div className="space-y-2 p-3">
                    <p className="line-clamp-2 text-xs font-medium leading-5 text-[var(--brand-ink)]">{entry.file.name}</p>
                    <button
                      className="text-xs font-semibold text-red-700"
                      type="button"
                      onClick={() =>
                        setPhotoEntries((current) => {
                          const match = current[index];
                          if (match) {
                            URL.revokeObjectURL(match.previewUrl);
                          }

                          return current.filter((_, photoIndex) => photoIndex !== index);
                        })
                      }
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        {errors.form ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{errors.form}</div> : null}
        {submitError ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{submitError}</div> : null}
      </div>

      <div className="sticky-bar-shadow fixed inset-x-0 bottom-0 z-20 border-t border-[var(--brand-border)] bg-white/92 px-4 py-3 backdrop-blur md:absolute md:inset-x-auto md:bottom-0 md:left-0 md:right-0 md:rounded-b-[28px]">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <p className="hidden text-sm text-[var(--brand-muted)] sm:block">Submitting saves the record, generates a PDF and CSV, and emails the office automatically.</p>
          <button
            className="ml-auto inline-flex min-h-12 min-w-40 items-center justify-center rounded-2xl bg-[var(--brand-navy)] px-6 py-3 text-base font-semibold text-white transition hover:bg-[var(--brand-navy-dark)] disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={isPending}
          >
            {isPending ? "Submitting..." : "Submit survey"}
          </button>
        </div>
      </div>
    </form>
  );
}
