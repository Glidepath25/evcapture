"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  createEmptySsraFormData,
  SSRA_ACTIVITY_OPTIONS,
  SSRA_DEPARTMENT_OPTIONS,
  SSRA_EQUIPMENT_OPTIONS,
  SSRA_EXCAVATION_OPTIONS,
  SSRA_PIA_ACCREDITATION_OPTIONS,
  SSRA_PPE_OPTIONS,
  SSRA_STREETWORK_DURATION_OPTIONS,
  SSRA_STREETWORK_ROAD_OPTIONS,
  SSRA_SURFACE_REMOVAL_OPTIONS,
  SSRA_TRAFFIC_MANAGEMENT_OPTIONS,
} from "@/data/ssra-config";
import { SignaturePad } from "@/components/signature-pad";
import { cn } from "@/lib/utils";
import type { Project, SsraAttachmentInput, SsraEnvironmentalPage, SsraFormData, SsraPiaPage, SsraPpePage, SsraStreetworksPage } from "@/types";

type AttachmentEntry = {
  key: string;
  sectionKey: string;
  questionKey: string;
  name: string;
  file?: File;
  existingAttachmentId?: number;
};

type SsraFormProps = {
  projects: Project[];
};

const PAGE_TITLES = ["Summary Information", "Hazards and Controls", "PPE and RPE", "Environmental", "Streetworks & Traffic Management", "Openreach PIA Network", "Signature / Final"];
const MAX_PROJECT_RESULTS = 10;

const PPE_FIELD_ROWS: Array<{
  label: string;
  textKey: keyof Pick<SsraPpePage, "firstAiderOnSite" | "nearestHospital" | "nearestDefib">;
  naKey: keyof Pick<SsraPpePage, "firstAiderNotApplicable" | "nearestHospitalNotApplicable" | "nearestDefibNotApplicable">;
  attachmentKey: string;
}> = [
  { label: "First Aider on site", textKey: "firstAiderOnSite", naKey: "firstAiderNotApplicable", attachmentKey: "firstAiderAttachments" },
  { label: "Location of nearest Hospital", textKey: "nearestHospital", naKey: "nearestHospitalNotApplicable", attachmentKey: "hospitalAttachments" },
  { label: "Location of nearest Defib", textKey: "nearestDefib", naKey: "nearestDefibNotApplicable", attachmentKey: "defibAttachments" },
];

const ENVIRONMENTAL_QUESTION_ROWS: Array<{
  label: string;
  key: keyof Pick<SsraEnvironmentalPage, "treeTrimming" | "nightWorks" | "invasiveSpecies" | "coshhOnSite" | "spillKit" | "coshhAssessmentsAware">;
  attachmentKey: string;
}> = [
  { label: "Are you undertaking any tree-trimming activities?", key: "treeTrimming", attachmentKey: "treeTrimmingAttachments" },
  { label: "Are night time works being carried out?", key: "nightWorks", attachmentKey: "nightWorksAttachments" },
  { label: "Are work activities close to or within a Non-Native Invasive Species area?", key: "invasiveSpecies", attachmentKey: "invasiveSpeciesAttachments" },
  { label: "Are there any COSHH materials on site?", key: "coshhOnSite", attachmentKey: "coshhOnSiteAttachments" },
  { label: "Do You have a spill kit?", key: "spillKit", attachmentKey: "spillKitAttachments" },
  {
    label: "Are you aware that our COSHH assessments and Material Safety Data Sheets (MSDS) are available on the Evotix Library?",
    key: "coshhAssessmentsAware",
    attachmentKey: "coshhLibraryAttachments",
  },
];

const STREETWORKS_COMPLIANCE_ROWS: Array<{
  label: string;
  key: keyof Pick<SsraStreetworksPage, "advancedSlg" | "safetyZones">;
  attachmentKey: string;
}> = [
  { label: "Evidence of Advanced SLG", key: "advancedSlg", attachmentKey: "advancedSlgAttachments" },
  { label: "Evidence of Safety Zones", key: "safetyZones", attachmentKey: "safetyZoneAttachments" },
];

const PIA_INTERACTION_ROWS: Array<{
  label: string;
  answerKey: keyof Pick<SsraPiaPage, "undergroundInteraction" | "overheadInteraction">;
  commentsKey: keyof Pick<SsraPiaPage, "undergroundInteractionComments" | "overheadInteractionComments">;
}> = [
  {
    label: "Do the works involve interactions with Openreach Underground Network?",
    answerKey: "undergroundInteraction",
    commentsKey: "undergroundInteractionComments",
  },
  {
    label: "Do the works involve interactions with Openreach Overhead Network?",
    answerKey: "overheadInteraction",
    commentsKey: "overheadInteractionComments",
  },
];

function makeAttachmentKey(sectionKey: string, questionKey: string, name: string) {
  return `${sectionKey}:${questionKey}:${name}:${Math.random().toString(36).slice(2, 8)}`;
}

function currentDateTimeLocal() {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 16);
}

function FieldShell({ children }: { children: React.ReactNode }) {
  return <div className="field-shell rounded-2xl">{children}</div>;
}

function CheckboxGroup({ options, values, onToggle, columns = 2 }: { options: readonly string[]; values: string[]; onToggle: (value: string) => void; columns?: 1 | 2 }) {
  return (
    <div className={cn("grid gap-3", columns === 2 ? "md:grid-cols-2" : "grid-cols-1")}>
      {options.map((option) => (
        <label key={option} className="flex items-start gap-3 rounded-2xl border border-[var(--brand-border)] bg-white px-4 py-3 text-sm">
          <input type="checkbox" checked={values.includes(option)} onChange={() => onToggle(option)} className="mt-1 h-4 w-4" />
          <span>{option}</span>
        </label>
      ))}
    </div>
  );
}

function RadioGroup({ value, options, onChange }: { value: string; options: Array<{ label: string; value: string }>; onChange: (value: string) => void }) {
  return (
    <div className="flex flex-wrap gap-3">
      {options.map((option) => (
        <label key={option.value} className="flex items-center gap-2 rounded-full border border-[var(--brand-border)] bg-white px-4 py-2 text-sm">
          <input type="radio" checked={value === option.value} onChange={() => onChange(option.value)} />
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  );
}

function AttachmentPicker({
  title,
  entries,
  sectionKey,
  questionKey,
  onAdd,
  onRemove,
}: {
  title: string;
  entries: AttachmentEntry[];
  sectionKey: string;
  questionKey: string;
  onAdd: (sectionKey: string, questionKey: string, files: File[]) => void;
  onRemove: (key: string) => void;
}) {
  return (
    <div className="rounded-[22px] border border-[var(--brand-border)] bg-[var(--brand-surface-alt)] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--brand-navy)]">{title}</p>
          <p className="mt-1 text-xs text-[var(--brand-muted)]">{entries.length} attachment(s)</p>
        </div>
        <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-2xl bg-[var(--brand-navy)] px-4 py-2 text-sm font-semibold text-white">
          Add attachments
          <input className="hidden" type="file" multiple onChange={(event) => { onAdd(sectionKey, questionKey, Array.from(event.target.files ?? [])); event.currentTarget.value = ""; }} />
        </label>
      </div>
      {entries.length > 0 ? (
        <div className="mt-4 space-y-2">
          {entries.map((entry) => (
            <div key={entry.key} className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--brand-border)] bg-white px-3 py-2 text-sm">
              <span className="truncate">{entry.name}</span>
              <button type="button" onClick={() => onRemove(entry.key)} className="font-semibold text-red-700">Remove</button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function SsraForm({ projects }: SsraFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [page, setPage] = useState(0);
  const [reference, setReference] = useState("");
  const [formData, setFormData] = useState<SsraFormData>(() => ({
    ...createEmptySsraFormData(),
    summary: {
      ...createEmptySsraFormData().summary,
      eventDateTime: currentDateTimeLocal(),
    },
  }));
  const [projectQuery, setProjectQuery] = useState("");
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentEntry[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const draftReference = searchParams.get("reference");
    if (!draftReference) return;
    let cancelled = false;
    void fetch(`/api/ssra?reference=${encodeURIComponent(draftReference)}`)
      .then(async (response) => {
        const payload = (await response.json()) as { reference: string; formData: SsraFormData; attachments: Array<{ id: number; sectionKey: string; questionKey: string; originalName: string }> };
        if (!response.ok || cancelled) return;
        setReference(payload.reference);
        setFormData(payload.formData);
        setProjectQuery(payload.formData.summary.project);
        setAttachments(payload.attachments.map((item) => ({ key: makeAttachmentKey(item.sectionKey, item.questionKey, item.originalName), sectionKey: item.sectionKey, questionKey: item.questionKey, name: item.originalName, existingAttachmentId: item.id })));
        setNotice(`Loaded SSRA draft ${payload.reference}.`);
      })
      .catch(() => {
        if (!cancelled) setError("Unable to load that SSRA draft.");
      });
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  const attachmentMap = useMemo(() => {
    const map = new Map<string, AttachmentEntry[]>();
    attachments.forEach((entry) => {
      const key = `${entry.sectionKey}:${entry.questionKey}`;
      map.set(key, [...(map.get(key) ?? []), entry]);
    });
    return map;
  }, [attachments]);

  const toggle = (values: string[], value: string) => (values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  const filesFor = (sectionKey: string, questionKey: string) => attachmentMap.get(`${sectionKey}:${questionKey}`) ?? [];
  const addFiles = (sectionKey: string, questionKey: string, files: File[]) => setAttachments((current) => [...current, ...files.map((file) => ({ key: makeAttachmentKey(sectionKey, questionKey, file.name), sectionKey, questionKey, name: file.name, file }))]);
  const removeFile = (key: string) => setAttachments((current) => current.filter((entry) => entry.key !== key));
  const normalisedProjectQuery = projectQuery.trim().toLowerCase();
  const filteredProjects = projects
    .filter((projectOption) => projectOption.name.toLowerCase().includes(normalisedProjectQuery))
    .slice(0, MAX_PROJECT_RESULTS);

  function selectProject(projectName: string) {
    setProjectQuery(projectName);
    setProjectMenuOpen(false);
    setFormData((current) => ({
      ...current,
      summary: {
        ...current.summary,
        project: projectName,
      },
    }));
  }

  function syncProjectFromQuery() {
    const exactMatch = projects.find((projectOption) => projectOption.name.toLowerCase() === projectQuery.trim().toLowerCase());

    if (exactMatch) {
      selectProject(exactMatch.name);
      return;
    }

    setFormData((current) => ({
      ...current,
      summary: {
        ...current.summary,
        project: projectQuery.trim(),
      },
    }));
  }

  async function persist(mode: "draft" | "submit") {
    setIsSaving(true);
    setError("");
    setNotice("");
    try {
      const payload = new FormData();
      payload.set("mode", mode);
      if (reference) payload.set("reference", reference);
      payload.set("payload", JSON.stringify(formData));
      payload.set("attachmentLinks", JSON.stringify(attachments.map<SsraAttachmentInput>((entry) => ({ key: entry.key, sectionKey: entry.sectionKey, questionKey: entry.questionKey, existingAttachmentId: entry.existingAttachmentId, existingName: entry.name }))));
      attachments.forEach((entry) => { if (entry.file) payload.append("attachments", entry.file); });
      const response = await fetch("/api/ssra", { method: "POST", body: payload });
      const result = (await response.json()) as { error?: string; reference?: string };
      if (!response.ok || !result.reference) throw new Error(result.error || "SSRA request failed.");
      setReference(result.reference);
      router.replace(`/forms/ssra?reference=${encodeURIComponent(result.reference)}`);
      if (mode === "submit") {
        router.push(`/forms/ssra/success?reference=${encodeURIComponent(result.reference)}`);
      } else {
        setNotice(`SSRA draft ${result.reference} saved.`);
      }
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "SSRA request failed.");
    } finally {
      setIsSaving(false);
    }
  }

  const summaryField = (label: string, value: string, update: (value: string) => void, type = "text") => (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-[var(--brand-navy)]">{label}</span>
      <FieldShell>
        <input className="w-full rounded-2xl bg-transparent px-4 py-3 text-base outline-none" type={type} value={value} onChange={(event) => update(event.target.value)} />
      </FieldShell>
    </label>
  );

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="surface-card rounded-[28px] px-6 py-6 sm:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--brand-navy)]">Glidepath Solutions</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--brand-navy)]">SSRA</h1>
              <p className="mt-2 text-sm leading-6 text-[var(--brand-muted)]">Site Specific Risk Assessment with draft save, attachments, and final PDF generation.</p>
              {reference ? <p className="mt-3 text-sm font-semibold text-[var(--brand-navy)]">Reference: {reference}</p> : null}
            </div>
            <div className="rounded-[22px] border border-[var(--brand-border)] bg-[var(--brand-surface-alt)] px-4 py-3 text-sm text-[var(--brand-muted)]">Page {page + 1} of {PAGE_TITLES.length}</div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
            {PAGE_TITLES.map((title, index) => (
              <button key={title} type="button" onClick={() => setPage(index)} className={cn("rounded-2xl border px-3 py-3 text-left text-sm transition", page === index ? "border-[var(--brand-navy)] bg-[var(--brand-navy)] text-white" : "border-[var(--brand-border)] bg-white text-[var(--brand-navy)] hover:border-[var(--brand-navy)]")}>
                {index + 1}. {title}
              </button>
            ))}
          </div>
        </section>

        <section className="surface-card rounded-[28px] px-6 py-6 sm:px-8">
          {page === 0 ? (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[var(--brand-navy)]">Project</span>
                  <div className="relative">
                    <FieldShell>
                      <input
                        className="w-full rounded-2xl bg-transparent px-4 py-3 text-base outline-none"
                        type="text"
                        value={projectQuery}
                        placeholder="Start typing a project"
                        onChange={(event) => {
                          const nextValue = event.target.value;
                          setProjectQuery(nextValue);
                          setProjectMenuOpen(true);
                          setFormData((current) => ({
                            ...current,
                            summary: {
                              ...current.summary,
                              project: nextValue,
                            },
                          }));
                        }}
                        onFocus={() => setProjectMenuOpen(true)}
                        onBlur={() => {
                          window.setTimeout(() => {
                            syncProjectFromQuery();
                            setProjectMenuOpen(false);
                          }, 120);
                        }}
                      />
                    </FieldShell>

                    {projectMenuOpen && filteredProjects.length > 0 ? (
                      <div className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-[20px] border border-[var(--brand-border)] bg-white shadow-[0_24px_60px_rgba(16,49,90,0.16)]">
                        <ul className="max-h-72 overflow-y-auto py-2">
                          {filteredProjects.map((projectOption) => (
                            <li key={projectOption.id}>
                              <button
                                type="button"
                                className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left text-sm text-[var(--brand-ink)] transition hover:bg-[var(--brand-surface-alt)]"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => selectProject(projectOption.name)}
                              >
                                <span>{projectOption.name}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </label>
                {summaryField("Date & time", formData.summary.eventDateTime, (value) => setFormData((current) => ({ ...current, summary: { ...current.summary, eventDateTime: value } })), "datetime-local")}
                {summaryField("Work Package", formData.summary.workPackage, (value) => setFormData((current) => ({ ...current, summary: { ...current.summary, workPackage: value } })))}
                {summaryField("Location", formData.summary.location, (value) => setFormData((current) => ({ ...current, summary: { ...current.summary, location: value } })))}
                {summaryField("Author", formData.summary.author, (value) => setFormData((current) => ({ ...current, summary: { ...current.summary, author: value } })))}
              </div>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[var(--brand-navy)]">Description of works</span>
                <FieldShell><textarea className="min-h-32 w-full rounded-2xl bg-transparent px-4 py-3 text-base outline-none" value={formData.summary.descriptionOfWorks} onChange={(event) => setFormData((current) => ({ ...current, summary: { ...current.summary, descriptionOfWorks: event.target.value } }))} /></FieldShell>
              </label>
              <div className="space-y-4">
                <div><h3 className="text-lg font-semibold text-[var(--brand-navy)]">Personnel on site</h3><p className="mt-1 text-sm text-[var(--brand-muted)]">Three rows are shown by default and can be extended later.</p></div>
                {formData.summary.personnel.map((person, index) => (
                  <div key={index} className="grid gap-4 rounded-[24px] border border-[var(--brand-border)] bg-[var(--brand-surface-alt)] p-4 md:grid-cols-3">
                    {["name", "company", "department"].map((field) => (
                      <label key={field} className="block">
                        <span className="mb-2 block text-sm font-medium capitalize text-[var(--brand-navy)]">{field}</span>
                        <FieldShell>
                          {field === "department" && SSRA_DEPARTMENT_OPTIONS.length > 0 ? (
                            <select className="w-full rounded-2xl bg-transparent px-4 py-3 outline-none" value={person.department} onChange={(event) => setFormData((current) => ({ ...current, summary: { ...current.summary, personnel: current.summary.personnel.map((entry, entryIndex) => entryIndex === index ? { ...entry, department: event.target.value } : entry) } }))}>
                              <option value="">Select department</option>
                              {SSRA_DEPARTMENT_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                            </select>
                          ) : (
                            <input className="w-full rounded-2xl bg-transparent px-4 py-3 outline-none" value={person[field as "name" | "company" | "department"]} onChange={(event) => setFormData((current) => ({ ...current, summary: { ...current.summary, personnel: current.summary.personnel.map((entry, entryIndex) => entryIndex === index ? { ...entry, [field]: event.target.value } : entry) } }))} />
                          )}
                        </FieldShell>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {page === 1 ? (
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-[var(--brand-navy)]">Type of Activity</h3>
                <p className="mt-1 text-sm text-[var(--brand-muted)]">Select all that apply.</p>
                <div className="mt-4">
                  <CheckboxGroup options={SSRA_ACTIVITY_OPTIONS} values={formData.hazards.activities} onToggle={(value) => setFormData((current) => ({ ...current, hazards: { ...current.hazards, activities: toggle(current.hazards.activities, value) } }))} />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[var(--brand-navy)]">Plant & Equipment</h3>
                <div className="mt-4">
                  <CheckboxGroup options={SSRA_EQUIPMENT_OPTIONS} values={formData.hazards.equipment} onToggle={(value) => setFormData((current) => ({ ...current, hazards: { ...current.hazards, equipment: toggle(current.hazards.equipment, value) } }))} />
                </div>
                <label className="mt-4 block">
                  <span className="mb-2 block text-sm font-medium text-[var(--brand-navy)]">Other Equipment</span>
                  <FieldShell><textarea className="min-h-24 w-full rounded-2xl bg-transparent px-4 py-3 outline-none" value={formData.hazards.otherEquipment} onChange={(event) => setFormData((current) => ({ ...current, hazards: { ...current.hazards, otherEquipment: event.target.value } }))} /></FieldShell>
                </label>
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[var(--brand-navy)]">First Tools of Choice - Surface Removal</h3>
                  <CheckboxGroup options={SSRA_SURFACE_REMOVAL_OPTIONS} values={formData.hazards.surfaceRemovalTools} onToggle={(value) => setFormData((current) => ({ ...current, hazards: { ...current.hazards, surfaceRemovalTools: toggle(current.hazards.surfaceRemovalTools, value) } }))} columns={1} />
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-[var(--brand-navy)]">Comments</span>
                    <FieldShell><textarea className="min-h-28 w-full rounded-2xl bg-transparent px-4 py-3 outline-none" value={formData.hazards.surfaceRemovalComments} onChange={(event) => setFormData((current) => ({ ...current, hazards: { ...current.hazards, surfaceRemovalComments: event.target.value } }))} /></FieldShell>
                  </label>
                  <AttachmentPicker title="Surface removal attachments" entries={filesFor("hazards", "surfaceRemovalAttachments")} sectionKey="hazards" questionKey="surfaceRemovalAttachments" onAdd={addFiles} onRemove={removeFile} />
                </div>
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[var(--brand-navy)]">First Tools of Choice - Excavation Below the surface</h3>
                  <CheckboxGroup options={SSRA_EXCAVATION_OPTIONS} values={formData.hazards.excavationTools} onToggle={(value) => setFormData((current) => ({ ...current, hazards: { ...current.hazards, excavationTools: toggle(current.hazards.excavationTools, value) } }))} columns={1} />
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-[var(--brand-navy)]">Comments</span>
                    <FieldShell><textarea className="min-h-28 w-full rounded-2xl bg-transparent px-4 py-3 outline-none" value={formData.hazards.excavationComments} onChange={(event) => setFormData((current) => ({ ...current, hazards: { ...current.hazards, excavationComments: event.target.value } }))} /></FieldShell>
                  </label>
                  <AttachmentPicker title="Excavation attachments" entries={filesFor("hazards", "excavationAttachments")} sectionKey="hazards" questionKey="excavationAttachments" onAdd={addFiles} onRemove={removeFile} />
                </div>
              </div>
            </div>
          ) : null}
          {page === 2 ? (
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-[var(--brand-navy)]">PPE and RPE</h3>
                <div className="mt-4">
                  <CheckboxGroup options={SSRA_PPE_OPTIONS} values={formData.ppe.ppeItems} onToggle={(value) => setFormData((current) => ({ ...current, ppe: { ...current.ppe, ppeItems: toggle(current.ppe.ppeItems, value) } }))} />
                </div>
              </div>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[var(--brand-navy)]">Comments</span>
                <FieldShell><textarea className="min-h-28 w-full rounded-2xl bg-transparent px-4 py-3 outline-none" value={formData.ppe.comments} onChange={(event) => setFormData((current) => ({ ...current, ppe: { ...current.ppe, comments: event.target.value } }))} /></FieldShell>
              </label>
              <AttachmentPicker title="PPE attachments" entries={filesFor("ppe", "ppeAttachments")} sectionKey="ppe" questionKey="ppeAttachments" onAdd={addFiles} onRemove={removeFile} />
              <div className="grid gap-4 lg:grid-cols-3">
                {PPE_FIELD_ROWS.map((row) => {
                  const textValue = formData.ppe[row.textKey];
                  const naValue = formData.ppe[row.naKey];
                  return (
                    <div key={row.label} className="rounded-[24px] border border-[var(--brand-border)] bg-[var(--brand-surface-alt)] p-4">
                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-[var(--brand-navy)]">{row.label}</span>
                        <FieldShell><input className="w-full rounded-2xl bg-transparent px-4 py-3 outline-none disabled:text-slate-400" value={textValue} disabled={naValue} onChange={(event) => setFormData((current) => ({ ...current, ppe: { ...current.ppe, [row.textKey]: event.target.value } }))} /></FieldShell>
                      </label>
                      <label className="mt-3 flex items-center gap-2 text-sm text-[var(--brand-navy)]">
                        <input type="checkbox" checked={naValue} onChange={(event) => setFormData((current) => ({ ...current, ppe: { ...current.ppe, [row.naKey]: event.target.checked, ...(event.target.checked ? { [row.textKey]: "" } : {}) } }))} />
                        N/A
                      </label>
                      <div className="mt-4">
                        <AttachmentPicker title={`${row.label} attachments`} entries={filesFor("ppe", row.attachmentKey)} sectionKey="ppe" questionKey={row.attachmentKey} onAdd={addFiles} onRemove={removeFile} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
          {page === 3 ? (
            <div className="space-y-6">
              <div className="rounded-[24px] border border-[var(--brand-border)] bg-[var(--brand-surface-alt)] p-4">
                <h3 className="text-lg font-semibold text-[var(--brand-navy)]">Provide Photos of the surrounding area before work</h3>
                <label className="mt-4 block">
                  <span className="mb-2 block text-sm font-medium text-[var(--brand-navy)]">Comments</span>
                  <FieldShell><textarea className="min-h-24 w-full rounded-2xl bg-transparent px-4 py-3 outline-none" value={formData.environmental.surroundingAreaComments} onChange={(event) => setFormData((current) => ({ ...current, environmental: { ...current.environmental, surroundingAreaComments: event.target.value } }))} /></FieldShell>
                </label>
                <div className="mt-4">
                  <AttachmentPicker title="Surrounding area attachments" entries={filesFor("environmental", "surroundingAreaAttachments")} sectionKey="environmental" questionKey="surroundingAreaAttachments" onAdd={addFiles} onRemove={removeFile} />
                </div>
              </div>
              {ENVIRONMENTAL_QUESTION_ROWS.map((row) => {
                const field = formData.environmental[row.key];
                return (
                  <div key={row.label} className="rounded-[24px] border border-[var(--brand-border)] bg-[var(--brand-surface-alt)] p-4">
                    <h3 className="text-lg font-semibold text-[var(--brand-navy)]">{row.label}</h3>
                    <div className="mt-4">
                      <RadioGroup value={field.answer} options={[{ label: "Yes", value: "yes" }, { label: "No", value: "no" }]} onChange={(value) => setFormData((current) => ({ ...current, environmental: { ...current.environmental, [row.key]: { ...current.environmental[row.key], answer: value } } }))} />
                    </div>
                    <label className="mt-4 block">
                      <span className="mb-2 block text-sm font-medium text-[var(--brand-navy)]">Comments</span>
                      <FieldShell><textarea className="min-h-24 w-full rounded-2xl bg-transparent px-4 py-3 outline-none" value={field.comments} onChange={(event) => setFormData((current) => ({ ...current, environmental: { ...current.environmental, [row.key]: { ...current.environmental[row.key], comments: event.target.value } } }))} /></FieldShell>
                    </label>
                    <div className="mt-4">
                      <AttachmentPicker title={`${row.label} attachments`} entries={filesFor("environmental", row.attachmentKey)} sectionKey="environmental" questionKey={row.attachmentKey} onAdd={addFiles} onRemove={removeFile} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
          {page === 4 ? (
            <div className="space-y-6">
              <div className="rounded-[24px] border border-[var(--brand-border)] bg-[var(--brand-surface-alt)] p-4">
                <h3 className="text-lg font-semibold text-[var(--brand-navy)]">Streetworks & Traffic Management</h3>
                <p className="mt-2 text-sm text-[var(--brand-muted)]">Guidance: <a href="https://slg.pjkeary.net/traffic-control/en" target="_blank" rel="noreferrer" className="font-semibold text-[var(--brand-navy)] underline">https://slg.pjkeary.net/traffic-control/en</a></p>
              </div>
              <div className="rounded-[24px] border border-[var(--brand-border)] bg-[var(--brand-surface-alt)] p-4">
                <h3 className="text-lg font-semibold text-[var(--brand-navy)]">Is a Traffic Control Permit required for the work?</h3>
                <div className="mt-4"><RadioGroup value={formData.streetworks.trafficControlPermit} options={[{ label: "Yes", value: "yes" }, { label: "No", value: "no" }, { label: "N/A", value: "na" }]} onChange={(value) => setFormData((current) => ({ ...current, streetworks: { ...current.streetworks, trafficControlPermit: value as "yes" | "no" | "na" } }))} /></div>
                <label className="mt-4 block">
                  <span className="mb-2 block text-sm font-medium text-[var(--brand-navy)]">Comments</span>
                  <FieldShell><textarea className="min-h-24 w-full rounded-2xl bg-transparent px-4 py-3 outline-none" value={formData.streetworks.trafficControlPermitComments} onChange={(event) => setFormData((current) => ({ ...current, streetworks: { ...current.streetworks, trafficControlPermitComments: event.target.value } }))} /></FieldShell>
                </label>
                <div className="mt-4"><AttachmentPicker title="Traffic Control Permit attachments" entries={filesFor("streetworks", "trafficControlPermitAttachments")} sectionKey="streetworks" questionKey="trafficControlPermitAttachments" onAdd={addFiles} onRemove={removeFile} /></div>
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                <div><h3 className="mb-4 text-lg font-semibold text-[var(--brand-navy)]">Duration of works</h3><CheckboxGroup options={SSRA_STREETWORK_DURATION_OPTIONS} values={formData.streetworks.durations} onToggle={(value) => setFormData((current) => ({ ...current, streetworks: { ...current.streetworks, durations: toggle(current.streetworks.durations, value) } }))} columns={1} /></div>
                <div><h3 className="mb-4 text-lg font-semibold text-[var(--brand-navy)]">Road Type / Classification</h3><CheckboxGroup options={SSRA_STREETWORK_ROAD_OPTIONS} values={formData.streetworks.roadTypes} onToggle={(value) => setFormData((current) => ({ ...current, streetworks: { ...current.streetworks, roadTypes: toggle(current.streetworks.roadTypes, value) } }))} columns={1} /></div>
              </div>
              <div className="rounded-[24px] border border-[var(--brand-border)] bg-[var(--brand-surface-alt)] p-4">
                <h3 className="text-lg font-semibold text-[var(--brand-navy)]">Traffic Management Provision</h3>
                <div className="mt-4"><CheckboxGroup options={SSRA_TRAFFIC_MANAGEMENT_OPTIONS} values={formData.streetworks.trafficManagementProvisions} onToggle={(value) => setFormData((current) => ({ ...current, streetworks: { ...current.streetworks, trafficManagementProvisions: toggle(current.streetworks.trafficManagementProvisions, value) } }))} /></div>
                <div className="mt-4"><AttachmentPicker title="Traffic management provision attachments" entries={filesFor("streetworks", "trafficManagementProvisionAttachments")} sectionKey="streetworks" questionKey="trafficManagementProvisionAttachments" onAdd={addFiles} onRemove={removeFile} /></div>
              </div>
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="rounded-[24px] border border-[var(--brand-border)] bg-[var(--brand-surface-alt)] p-4">
                  <h3 className="text-lg font-semibold text-[var(--brand-navy)]">Pedestrian Safety Provision - Are Walkways Closed?</h3>
                  <div className="mt-4"><RadioGroup value={formData.streetworks.pedestrianWalkwaysClosed} options={[{ label: "Yes", value: "yes" }, { label: "No", value: "no" }]} onChange={(value) => setFormData((current) => ({ ...current, streetworks: { ...current.streetworks, pedestrianWalkwaysClosed: value as "yes" | "no" } }))} /></div>
                  <label className="mt-4 block">
                    <span className="mb-2 block text-sm font-medium text-[var(--brand-navy)]">Comments</span>
                    <FieldShell><textarea className="min-h-24 w-full rounded-2xl bg-transparent px-4 py-3 outline-none" value={formData.streetworks.pedestrianWalkwaysComments} onChange={(event) => setFormData((current) => ({ ...current, streetworks: { ...current.streetworks, pedestrianWalkwaysComments: event.target.value } }))} /></FieldShell>
                  </label>
                  <div className="mt-4"><AttachmentPicker title="Pedestrian safety attachments" entries={filesFor("streetworks", "pedestrianAttachments")} sectionKey="streetworks" questionKey="pedestrianAttachments" onAdd={addFiles} onRemove={removeFile} /></div>
                </div>
                {STREETWORKS_COMPLIANCE_ROWS.map((row) => {
                  const field = formData.streetworks[row.key];
                  return (
                    <div key={row.label} className="rounded-[24px] border border-[var(--brand-border)] bg-[var(--brand-surface-alt)] p-4">
                      <h3 className="text-lg font-semibold text-[var(--brand-navy)]">{row.label}</h3>
                      <div className="mt-4"><RadioGroup value={field.status} options={[{ label: "Compliant", value: "compliant" }, { label: "Unable to meet requirements", value: "unable" }, { label: "N/A", value: "na" }]} onChange={(value) => setFormData((current) => ({ ...current, streetworks: { ...current.streetworks, [row.key]: { ...current.streetworks[row.key], status: value as "compliant" | "unable" | "na" } } }))} /></div>
                      <label className="mt-4 block">
                        <span className="mb-2 block text-sm font-medium text-[var(--brand-navy)]">Comments</span>
                        <FieldShell><textarea className="min-h-24 w-full rounded-2xl bg-transparent px-4 py-3 outline-none" value={field.comments} onChange={(event) => setFormData((current) => ({ ...current, streetworks: { ...current.streetworks, [row.key]: { ...current.streetworks[row.key], comments: event.target.value } } }))} /></FieldShell>
                      </label>
                      <div className="mt-4"><AttachmentPicker title={`${row.label} attachments`} entries={filesFor("streetworks", row.attachmentKey)} sectionKey="streetworks" questionKey={row.attachmentKey} onAdd={addFiles} onRemove={removeFile} /></div>
                    </div>
                  );
                })}
              </div>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[var(--brand-navy)]">General Comments</span>
                <FieldShell><textarea className="min-h-28 w-full rounded-2xl bg-transparent px-4 py-3 outline-none" value={formData.streetworks.generalComments} onChange={(event) => setFormData((current) => ({ ...current, streetworks: { ...current.streetworks, generalComments: event.target.value } }))} /></FieldShell>
              </label>
            </div>
          ) : null}
          {page === 5 ? (
            <div className="space-y-6">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[var(--brand-navy)]">Name(s) of person holding PIA accreditations for these works</span>
                <FieldShell><textarea className="min-h-24 w-full rounded-2xl bg-transparent px-4 py-3 outline-none" value={formData.pia.accreditationHolderNames} onChange={(event) => setFormData((current) => ({ ...current, pia: { ...current.pia, accreditationHolderNames: event.target.value } }))} /></FieldShell>
              </label>
              <div>
                <h3 className="mb-4 text-lg font-semibold text-[var(--brand-navy)]">PIA accreditations</h3>
                <CheckboxGroup options={SSRA_PIA_ACCREDITATION_OPTIONS} values={formData.pia.accreditations} onToggle={(value) => setFormData((current) => ({ ...current, pia: { ...current.pia, accreditations: toggle(current.pia.accreditations, value) } }))} />
              </div>
              {PIA_INTERACTION_ROWS.map((row) => (
                <div key={row.label} className="rounded-[24px] border border-[var(--brand-border)] bg-[var(--brand-surface-alt)] p-4">
                  <h3 className="text-lg font-semibold text-[var(--brand-navy)]">{row.label}</h3>
                  <div className="mt-4"><RadioGroup value={formData.pia[row.answerKey]} options={[{ label: "Yes", value: "yes" }, { label: "No", value: "no" }]} onChange={(value) => setFormData((current) => ({ ...current, pia: { ...current.pia, [row.answerKey]: value as "yes" | "no" } }))} /></div>
                  <label className="mt-4 block">
                    <span className="mb-2 block text-sm font-medium text-[var(--brand-navy)]">Comments</span>
                    <FieldShell><textarea className="min-h-24 w-full rounded-2xl bg-transparent px-4 py-3 outline-none" value={formData.pia[row.commentsKey]} onChange={(event) => setFormData((current) => ({ ...current, pia: { ...current.pia, [row.commentsKey]: event.target.value } }))} /></FieldShell>
                  </label>
                </div>
              ))}
            </div>
          ) : null}
          {page === 6 ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-[var(--brand-navy)]">Signature</h3>
                <p className="mt-1 text-sm text-[var(--brand-muted)]">Sign below before the final submit.</p>
                <div className="mt-4">
                  <SignaturePad value={formData.signature.signatureDataUrl} onChange={(value) => setFormData((current) => ({ ...current, signature: { signatureDataUrl: value, signatureSignedAt: value ? new Date().toISOString() : "" } }))} />
                </div>
              </div>
              <AttachmentPicker title="Additional attachments" entries={filesFor("signature", "additionalAttachments")} sectionKey="signature" questionKey="additionalAttachments" onAdd={addFiles} onRemove={removeFile} />
            </div>
          ) : null}
        </section>
        {(error || notice) ? <div className={cn("rounded-2xl px-4 py-3 text-sm", error ? "border border-red-200 bg-red-50 text-red-800" : "border border-emerald-200 bg-emerald-50 text-emerald-800")}>{error || notice}</div> : null}
        <section className="surface-card rounded-[28px] px-6 py-5 sm:px-8">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-3">
              {page > 0 ? <button type="button" onClick={() => setPage((current) => Math.max(0, current - 1))} className="rounded-2xl border border-[var(--brand-border)] px-5 py-3 font-semibold text-[var(--brand-navy)]">Back</button> : null}
              <button type="button" onClick={() => void persist("draft")} disabled={isSaving} className="rounded-2xl border border-[var(--brand-border)] px-5 py-3 font-semibold text-[var(--brand-navy)] disabled:opacity-60">Save SSRA</button>
              <button type="button" onClick={() => router.push("/")} className="rounded-2xl border border-[var(--brand-border)] px-5 py-3 font-semibold text-[var(--brand-navy)]">Cancel SSRA</button>
            </div>
            <div className="flex flex-wrap gap-3">
              {page < PAGE_TITLES.length - 1 ? (
                <button type="button" onClick={() => setPage((current) => Math.min(PAGE_TITLES.length - 1, current + 1))} className="rounded-2xl bg-[var(--brand-navy)] px-5 py-3 font-semibold text-white">Next Page</button>
              ) : (
                <button type="button" onClick={() => void persist("submit")} disabled={isSaving} className="rounded-2xl bg-[var(--brand-navy)] px-5 py-3 font-semibold text-white disabled:opacity-60">Submit</button>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
