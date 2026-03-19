"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { todayIsoDate } from "@/lib/format";
import { buildEmptyOptionQuantities, itemHasAnyQuantity } from "@/lib/quantity";
import { cn } from "@/lib/utils";
import type { EditableLineItem, Project, QuantityOption, SurveyTemplateRow } from "@/types";

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
  linkedTemplateId: string | null;
};

type PhotoPanelProps = {
  entries: PhotoEntry[];
  inputId: string;
  label: string;
  linkedTemplateId: string | null;
  onAddFiles: (files: File[], linkedTemplateId: string | null) => void;
  onRemove: (key: string) => void;
};

const MAX_PROJECT_RESULTS = 10;
const SURVEY_TYPE_OPTIONS = ["Pre-construction survey", "Build complete Survey"] as const;

function buildDefaultItems(rows: SurveyTemplateRow[]): EditableLineItem[] {
  return rows.map((row) => ({
    templateId: row.id,
    quantity: "",
    notes: "",
    optionQuantities: buildEmptyOptionQuantities(row),
  }));
}

function buildPhotoKey(file: File, linkedTemplateId: string | null) {
  return `${linkedTemplateId ?? "general"}-${file.name}-${file.size}-${file.lastModified}`;
}

type QuantityOptionsProps = {
  options: QuantityOption[];
  values: Record<string, string>;
  onChange: (optionId: string, value: string) => void;
  dense?: boolean;
};

function QuantityOptionsInputs({ options, values, onChange, dense = false }: QuantityOptionsProps) {
  return (
    <div className="space-y-3">
      {options.map((option) => (
        <div key={option.id} className={cn("rounded-2xl bg-[var(--brand-surface-alt)]", dense ? "p-2.5" : "p-3")}>
          <div className={cn("grid gap-3", dense ? "grid-cols-[minmax(0,1fr),96px] items-start" : "md:grid-cols-[minmax(0,1fr),120px] md:items-start")}>
            <div>
              <p className={cn("font-semibold text-[var(--brand-navy)]", dense ? "text-[13px]" : "text-sm")}>{option.label}</p>
              {option.guidance ? <p className={cn("mt-1 leading-5 text-[var(--brand-navy)]", dense ? "text-[12px]" : "text-sm")}>{option.guidance}</p> : null}
            </div>
            <div className="field-shell rounded-2xl bg-white">
              <input
                className={cn("w-full rounded-2xl bg-transparent outline-none", dense ? "px-3 py-2 text-right text-sm" : "px-4 py-3 text-right text-base")}
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={values[option.id] ?? ""}
                onChange={(event) => onChange(option.id, event.target.value)}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function QuantityOptionGuidanceList({ options }: { options: QuantityOption[] }) {
  return (
    <div className="space-y-2">
      {options.map((option) => (
        <p key={option.id} className="rounded-xl bg-[var(--brand-surface-alt)] px-3 py-2 text-[12px] leading-5 text-[var(--brand-navy)]">
          <span className="font-semibold">{option.label}:</span> {option.guidance ?? "Enter quantity"}
        </p>
      ))}
    </div>
  );
}

function DesktopQuantityOptionInputs({
  options,
  values,
  onChange,
}: {
  options: QuantityOption[];
  values: Record<string, string>;
  onChange: (optionId: string, value: string) => void;
}) {
  return (
    <div className="space-y-3">
      {options.map((option) => (
        <label key={option.id} className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--brand-muted)]">{option.label}</span>
          <div className="field-shell rounded-2xl">
            <input
              className="w-full rounded-2xl bg-transparent px-3 py-3 text-right text-base outline-none"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={values[option.id] ?? ""}
              onChange={(event) => onChange(option.id, event.target.value)}
            />
          </div>
        </label>
      ))}
    </div>
  );
}

function LinkedPhotoPanel({ entries, inputId, label, linkedTemplateId, onAddFiles, onRemove }: PhotoPanelProps) {
  return (
    <div className="rounded-[22px] border border-[var(--brand-border)] bg-[var(--brand-surface-alt)] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--brand-navy)]">{label}</p>
          <p className="mt-1 text-xs leading-5 text-[var(--brand-muted)]">
            Capture from camera or choose from gallery. These photos will be linked to this survey item.
          </p>
        </div>
        <label
          className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-2xl bg-[var(--brand-navy)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-navy-dark)]"
          htmlFor={inputId}
        >
          Add photos
        </label>
        <input
          id={inputId}
          className="hidden"
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            onAddFiles(files, linkedTemplateId);
            event.currentTarget.value = "";
          }}
        />
      </div>

      {entries.length > 0 ? (
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {entries.map((entry) => (
            <div key={entry.key} className="overflow-hidden rounded-[18px] border border-[var(--brand-border)] bg-white">
              <div className="aspect-square bg-slate-100">
                <Image
                  unoptimized
                  alt={entry.file.name}
                  className="h-full w-full object-cover"
                  height={200}
                  src={entry.previewUrl}
                  width={200}
                />
              </div>
              <div className="space-y-2 p-2">
                <p className="line-clamp-2 text-[11px] leading-4 text-[var(--brand-ink)]">{entry.file.name}</p>
                <button className="text-[11px] font-semibold text-red-700" type="button" onClick={() => onRemove(entry.key)}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function SurveyForm({ projects, templateRows, maxUploadCount, maxUploadMb }: SurveyFormProps) {
  const router = useRouter();
  const [items, setItems] = useState<EditableLineItem[]>(() => buildDefaultItems(templateRows));
  const [project, setProject] = useState("");
  const [projectQuery, setProjectQuery] = useState("");
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [surveyType, setSurveyType] = useState("");
  const [surveyorName, setSurveyorName] = useState("");
  const [surveyDate, setSurveyDate] = useState(todayIsoDate());
  const [siteLocation, setSiteLocation] = useState("");
  const [generalComments, setGeneralComments] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [photoEntries, setPhotoEntries] = useState<PhotoEntry[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const photoEntriesRef = useRef<PhotoEntry[]>([]);
  const topRef = useRef<HTMLDivElement | null>(null);

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

  function updateItemOptionQuantity(templateId: string, optionId: string, value: string) {
    setItems((current) =>
      current.map((item) => {
        if (item.templateId !== templateId) {
          return item;
        }

        return {
          ...item,
          optionQuantities: {
            ...(item.optionQuantities ?? {}),
            [optionId]: value,
          },
        };
      }),
    );
  }

  function removePhoto(key: string) {
    setPhotoEntries((current) => {
      const match = current.find((entry) => entry.key === key);
      if (match) {
        URL.revokeObjectURL(match.previewUrl);
      }

      return current.filter((entry) => entry.key !== key);
    });
  }

  function mergePhotos(nextFiles: File[], linkedTemplateId: string | null) {
    const deduped = new Map<string, PhotoEntry>();

    for (const entry of photoEntries) {
      deduped.set(entry.key, entry);
    }

    for (const file of nextFiles.filter((candidate) => candidate.type.startsWith("image/"))) {
      const key = buildPhotoKey(file, linkedTemplateId);
      if (!deduped.has(key)) {
        deduped.set(key, {
          file,
          key,
          previewUrl: URL.createObjectURL(file),
          linkedTemplateId,
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

  function getItemPhotoCount(templateId: string) {
    return photoEntries.filter((entry) => entry.linkedTemplateId === templateId).length;
  }

  function getItemPhotos(templateId: string) {
    return photoEntries.filter((entry) => entry.linkedTemplateId === templateId);
  }

  function validateClientSide() {
    const nextErrors: FieldErrors = {};
    const exactProjectMatch = projects.find((projectOption) => projectOption.name.toLowerCase() === projectQuery.trim().toLowerCase());
    if (!project && exactProjectMatch) {
      setProject(exactProjectMatch.name);
    }

    if (!(project || exactProjectMatch?.name)) {
      nextErrors.project = "Select a project from the list.";
    }
    if (!surveyType) {
      nextErrors.surveyType = "Type of survey is required.";
    }
    if (!surveyorName.trim()) {
      nextErrors.surveyorName = "Surveyor name is required.";
    }
    if (!surveyDate) {
      nextErrors.surveyDate = "Survey date is required.";
    }

    const hasLineItemData = items.some((item) => itemHasAnyQuantity(item) || item.notes.trim());
    if (!hasLineItemData && photoEntries.length === 0) {
      nextErrors.form = "Enter at least one quantity, note, or photo before submitting.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function scrollToTop() {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function submitForm() {
    const selectedProject = projects.find((projectOption) => projectOption.name.toLowerCase() === projectQuery.trim().toLowerCase())?.name ?? project;
    const formData = new FormData();
    formData.set("project", selectedProject);
    formData.set("surveyType", surveyType);
    formData.set("surveyorName", surveyorName);
    formData.set("surveyDate", surveyDate);
    formData.set("siteLocation", siteLocation);
    formData.set("generalComments", generalComments);
    formData.set("companyWebsite", honeypot);
    formData.set("items", JSON.stringify(items));
    formData.set(
      "photoLinks",
      JSON.stringify(
        photoEntries.map((entry) => ({
          linkedTemplateId: entry.linkedTemplateId,
        })),
      ),
    );

    for (const entry of photoEntries) {
      formData.append("photos", entry.file);
    }

    const response = await fetch("/api/submit", {
      method: "POST",
      body: formData,
    });

    let payload: { error?: string; reference?: string; emailDelivered?: boolean } = {};
    try {
      payload = (await response.json()) as { error?: string; reference?: string; emailDelivered?: boolean };
    } catch {
      payload = {
        error: "The server returned an invalid response. Check the server logs.",
      };
    }

    if (!response.ok || !payload.reference) {
      throw new Error(payload.error || "Submission failed.");
    }

    router.push(`/success?reference=${encodeURIComponent(payload.reference)}&email=${payload.emailDelivered ? "sent" : "failed"}`);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError("");

    if (!validateClientSide()) {
      scrollToTop();
      return;
    }

    setIsSubmitting(true);
    void submitForm()
      .catch((error: unknown) => {
        setSubmitError(error instanceof Error ? error.message : "Submission failed.");
        scrollToTop();
      })
      .finally(() => {
        setIsSubmitting(false);
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

  const generalPhotos = photoEntries.filter((entry) => entry.linkedTemplateId === null);
  const normalisedProjectQuery = projectQuery.trim().toLowerCase();
  const filteredProjects = projects
    .filter((projectOption) => projectOption.name.toLowerCase().includes(normalisedProjectQuery))
    .slice(0, MAX_PROJECT_RESULTS);

  function selectProject(projectName: string) {
    setProject(projectName);
    setProjectQuery(projectName);
    setProjectMenuOpen(false);
    setErrors((current) => {
      if (!current.project) {
        return current;
      }

      const next = { ...current };
      delete next.project;
      return next;
    });
  }

  function syncProjectFromQuery() {
    const exactMatch = projects.find((projectOption) => projectOption.name.toLowerCase() === projectQuery.trim().toLowerCase());
    if (exactMatch) {
      selectProject(exactMatch.name);
      return;
    }

    if (projectQuery.trim() !== project) {
      setProject("");
    }
  }

  return (
    <form className="relative" onSubmit={handleSubmit}>
      <div ref={topRef} />
      <div className="space-y-8 pb-32 sm:pb-28">
        <section className="rounded-[24px] border border-[var(--brand-border)] bg-[var(--brand-surface-alt)] p-5 lg:hidden">
          <div className="inline-flex items-center gap-3 rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-navy)]">
            <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
            Glidepath Solutions
          </div>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-[var(--brand-navy)]">EVcapture survey</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--brand-muted)]">
            Built for on-site use. Add quantities, notes, and item-linked photos directly from your phone.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-2xl border border-[var(--brand-border)] bg-white px-3 py-3 text-[var(--brand-ink)]">
              <span className="block font-semibold text-[var(--brand-navy)]">{templateRows.length} survey items</span>
              <span className="mt-1 block text-[var(--brand-muted)]">Capture per-item photos</span>
            </div>
            <div className="rounded-2xl border border-[var(--brand-border)] bg-white px-3 py-3 text-[var(--brand-ink)]">
              <span className="block font-semibold text-[var(--brand-navy)]">{photoEntries.length} photos added</span>
              <span className="mt-1 block text-[var(--brand-muted)]">All linked into the PDF and CSV</span>
            </div>
          </div>
        </section>

        <section className="space-y-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--brand-navy)]">1. Site details</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--brand-navy)]">Start the survey</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--brand-muted)]">
              Complete the project details first. Everything below is designed for quick thumb use on site.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <label className="block rounded-[22px] border border-[var(--brand-border)] bg-white p-4">
              <span className="mb-2 block text-sm font-medium text-[var(--brand-navy)]">Project *</span>
              <div className="relative">
                <div className="field-shell rounded-2xl">
                  <input
                    className="w-full rounded-2xl bg-transparent px-4 py-3 text-base outline-none"
                    value={projectQuery}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      setProjectQuery(nextValue);
                      if (nextValue !== project) {
                        setProject("");
                      }
                      setProjectMenuOpen(true);
                    }}
                    onFocus={() => setProjectMenuOpen(true)}
                    onBlur={() => {
                      window.setTimeout(() => {
                        syncProjectFromQuery();
                        setProjectMenuOpen(false);
                      }, 120);
                    }}
                    placeholder="Start typing project or site name"
                    autoComplete="off"
                  />
                </div>
                {projectMenuOpen && filteredProjects.length > 0 ? (
                  <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 overflow-hidden rounded-[22px] border border-[var(--brand-border)] bg-white shadow-[0_16px_40px_rgba(16,49,90,0.12)]">
                    <div className="max-h-72 overflow-y-auto py-2">
                      {filteredProjects.map((projectOption) => (
                        <button
                          key={projectOption.id}
                          type="button"
                          className={cn(
                            "w-full px-4 py-3 text-left text-sm transition hover:bg-[var(--brand-surface-alt)]",
                            project === projectOption.name ? "bg-[var(--brand-blue-soft)]/55 font-semibold text-[var(--brand-navy)]" : "text-[var(--brand-ink)]",
                          )}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => selectProject(projectOption.name)}
                        >
                          {projectOption.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
              {errors.project ? (
                <p className="mt-2 text-sm text-red-700">{errors.project}</p>
              ) : (
                <p className="mt-2 text-xs leading-5 text-[var(--brand-muted)]">Type a few letters to narrow the list, then tap the correct project.</p>
              )}
            </label>

            <label className="block rounded-[22px] border border-[var(--brand-border)] bg-white p-4">
              <span className="mb-2 block text-sm font-medium text-[var(--brand-navy)]">Type of Survey *</span>
              <div className="field-shell rounded-2xl">
                <select
                  className="w-full rounded-2xl bg-transparent px-4 py-3 text-base outline-none"
                  value={surveyType}
                  onChange={(event) => setSurveyType(event.target.value)}
                >
                  <option value="">Select survey type</option>
                  {SURVEY_TYPE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              {errors.surveyType ? <p className="mt-2 text-sm text-red-700">{errors.surveyType}</p> : null}
            </label>

            <label className="block rounded-[22px] border border-[var(--brand-border)] bg-white p-4">
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

            <label className="block rounded-[22px] border border-[var(--brand-border)] bg-white p-4">
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

            <label className="block rounded-[22px] border border-[var(--brand-border)] bg-white p-4">
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

          <label className="block rounded-[22px] border border-[var(--brand-border)] bg-white p-4">
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
        </section>

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

        <section className="space-y-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--brand-navy)]">2. Survey items</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--brand-navy)]">Complete each line item</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--brand-muted)]">
              Add a quantity, note, photos, or any combination. Smaller screens stay in card mode for easier tapping.
            </p>
          </div>

          <div className="hidden overflow-hidden rounded-[24px] border border-[var(--brand-border)] xl:block">
            <div className="data-grid-header grid grid-cols-[0.9fr_2.25fr_0.55fr_1.2fr] gap-4 px-5 py-4 text-sm font-semibold">
              <div>Charge Type</div>
              <div>Description</div>
              <div className="text-right">Qty</div>
              <div>Notes</div>
            </div>
            {sectionGroups.map((group) => (
              <div key={group.section}>
                <div className="border-t border-[var(--brand-border)] bg-[var(--brand-surface-alt)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--brand-navy)]">
                  {group.section}
                </div>
                {group.rows.map((row) => {
                  const item = items.find((entry) => entry.templateId === row.id);
                  const linkedPhotos = getItemPhotos(row.id);

                  return (
                    <div key={row.id} className="border-t border-[var(--brand-border)] bg-white">
                      <div className="grid grid-cols-[0.9fr_2.25fr_0.55fr_1.2fr] gap-4 px-5 py-4">
                        <div className="text-sm font-medium text-[var(--brand-ink)]">{row.chargeType}</div>
                        <div className="space-y-2 text-sm text-[var(--brand-ink)]">
                          <p className="font-medium">{row.description}</p>
                          {row.additionalDescription ? <p className="text-[13px] leading-5 text-[var(--brand-muted)]">{row.additionalDescription}</p> : null}
                          {row.quantityOptions?.length ? <QuantityOptionGuidanceList options={row.quantityOptions} /> : null}
                          {row.notesGuidance ? (
                            <p className="rounded-xl bg-[var(--brand-surface-alt)] px-3 py-2 text-[12px] leading-5 text-[var(--brand-navy)]">
                              Notes guidance: {row.notesGuidance}
                            </p>
                          ) : null}
                        </div>
                        <div>
                          {row.quantityOptions?.length ? (
                            <DesktopQuantityOptionInputs
                              options={row.quantityOptions}
                              values={item?.optionQuantities ?? {}}
                              onChange={(optionId, value) => updateItemOptionQuantity(row.id, optionId, value)}
                            />
                          ) : (
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
                          )}
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
                      <div className="border-t border-[var(--brand-border)] px-5 py-4">
                        <LinkedPhotoPanel
                          entries={linkedPhotos}
                          inputId={`desktop-photo-${row.id}`}
                          label={`Linked photos (${linkedPhotos.length})`}
                          linkedTemplateId={row.id}
                          onAddFiles={mergePhotos}
                          onRemove={removePhoto}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="space-y-4 xl:hidden">
            {sectionGroups.map((group) => (
              <div key={group.section} className="space-y-3">
                <div className="sticky top-2 z-10 rounded-2xl bg-[var(--brand-navy)] px-4 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white shadow-sm">
                  {group.section}
                </div>
                {group.rows.map((row) => {
                  const item = items.find((entry) => entry.templateId === row.id);
                  const linkedPhotos = getItemPhotos(row.id);

                  return (
                    <article key={row.id} className="rounded-[24px] border border-[var(--brand-border)] bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">{row.chargeType}</div>
                          <h4 className="mt-2 text-lg font-semibold leading-7 text-[var(--brand-ink)]">{row.description}</h4>
                        </div>
                        <div className="rounded-full bg-[var(--brand-surface-alt)] px-3 py-1 text-xs font-semibold text-[var(--brand-navy)]">
                          {getItemPhotoCount(row.id)} photos
                        </div>
                      </div>

                      {row.additionalDescription ? <p className="mt-3 text-sm leading-6 text-[var(--brand-muted)]">{row.additionalDescription}</p> : null}
                      {row.quantityOptions?.length ? <div className="mt-3"><QuantityOptionGuidanceList options={row.quantityOptions} /></div> : null}
                      {row.notesGuidance ? (
                        <p className="mt-3 rounded-2xl bg-[var(--brand-surface-alt)] px-3 py-3 text-sm leading-6 text-[var(--brand-navy)]">
                          Notes guidance: {row.notesGuidance}
                        </p>
                      ) : null}

                      <div className="mt-4 grid gap-3">
                        {row.quantityOptions?.length ? (
                          <div>
                            <span className="mb-2 block text-sm font-medium text-[var(--brand-navy)]">Quantities</span>
                            <QuantityOptionsInputs
                              options={row.quantityOptions}
                              values={item?.optionQuantities ?? {}}
                              onChange={(optionId, value) => updateItemOptionQuantity(row.id, optionId, value)}
                            />
                          </div>
                        ) : (
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
                        )}
                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-[var(--brand-navy)]">Notes</span>
                          <div className="field-shell rounded-2xl">
                            <textarea
                              className="min-h-28 w-full rounded-2xl bg-transparent px-4 py-3 text-base outline-none"
                              value={item?.notes ?? ""}
                              onChange={(event) => updateItem(row.id, "notes", event.target.value)}
                              placeholder="Add item-specific notes"
                            />
                          </div>
                        </label>
                      </div>

                      <div className="mt-4">
                        <LinkedPhotoPanel
                          entries={linkedPhotos}
                          inputId={`mobile-photo-${row.id}`}
                          label="Section photos"
                          linkedTemplateId={row.id}
                          onAddFiles={mergePhotos}
                          onRemove={removePhoto}
                        />
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
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--brand-navy)]">3. General photos</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--brand-navy)]">Add site-wide photos</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--brand-muted)]">
              Use this for overall location context. Item-specific evidence should go on the relevant survey card above.
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
              mergePhotos(Array.from(event.dataTransfer.files), null);
            }}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-base font-semibold text-[var(--brand-navy)]">General site photos</p>
                <p className="mt-1 text-sm leading-6 text-[var(--brand-muted)]">
                  Up to {maxUploadCount} photos total across the whole form, {maxUploadMb}MB each.
                </p>
              </div>
              <label className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-2xl bg-[var(--brand-navy)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-navy-dark)]">
                Choose site photos
                <input
                  className="hidden"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  onChange={(event) => {
                    mergePhotos(Array.from(event.target.files ?? []), null);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
            </div>
          </div>

          {generalPhotos.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {generalPhotos.map((entry) => (
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
                    <button className="text-xs font-semibold text-red-700" type="button" onClick={() => removePhoto(entry.key)}>
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

      <div className="sticky-bar-shadow fixed inset-x-0 bottom-0 z-20 border-t border-[var(--brand-border)] bg-white/95 px-4 py-3 backdrop-blur [padding-bottom:calc(env(safe-area-inset-bottom)+0.75rem)] md:absolute md:inset-x-auto md:bottom-0 md:left-0 md:right-0 md:rounded-b-[28px] md:[padding-bottom:0.75rem]">
        <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-[var(--brand-muted)]" aria-live="polite">
            <p className="font-medium text-[var(--brand-ink)]">{photoEntries.length} photos ready</p>
            {submitError ? (
              <p className="text-red-700">{submitError}</p>
            ) : errors.form ? (
              <p className="text-red-700">{errors.form}</p>
            ) : isSubmitting ? (
              <p className="text-[var(--brand-navy)]">Submitting survey and generating files...</p>
            ) : (
              <p>Submitting saves the survey, generates the PDF and CSV, and emails the office automatically.</p>
            )}
          </div>
          <button
            className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-[var(--brand-navy)] px-6 py-3 text-base font-semibold text-white transition hover:bg-[var(--brand-navy-dark)] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-48"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Submit survey"}
          </button>
        </div>
      </div>
    </form>
  );
}
