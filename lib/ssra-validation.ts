import { createEmptySsraFormData } from "@/data/ssra-config";
import { getServerConfig } from "@/lib/config";
import { SUPPORTED_ATTACHMENT_TYPES } from "@/lib/storage";
import { bytesToMegabytes, normaliseMultiline } from "@/lib/utils";
import type { SsraAttachmentInput, SsraFormData } from "@/types";
import { z } from "zod";

const personnelSchema = z.object({
  name: z.string().max(120).default(""),
  company: z.string().max(120).default(""),
  department: z.string().max(120).default(""),
});

const yesNoSchema = z.enum(["", "yes", "no"]);
const yesNoNaSchema = z.enum(["", "yes", "no", "na"]);
const complianceSchema = z.enum(["", "compliant", "unable", "na"]);

const ssraFormSchema = z.object({
  summary: z.object({
    project: z.string().max(200).default(""),
    eventDateTime: z.string().max(40).default(""),
    workPackage: z.string().max(200).default(""),
    location: z.string().max(300).default(""),
    descriptionOfWorks: z.string().max(3000).default(""),
    author: z.string().max(120).default(""),
    personnel: z.array(personnelSchema).default([]),
  }),
  hazards: z.object({
    activities: z.array(z.string()).default([]),
    equipment: z.array(z.string()).default([]),
    otherEquipment: z.string().max(500).default(""),
    surfaceRemovalTools: z.array(z.string()).default([]),
    surfaceRemovalComments: z.string().max(1000).default(""),
    excavationTools: z.array(z.string()).default([]),
    excavationComments: z.string().max(1000).default(""),
  }),
  ppe: z.object({
    ppeItems: z.array(z.string()).default([]),
    comments: z.string().max(1000).default(""),
    firstAiderOnSite: z.string().max(200).default(""),
    firstAiderNotApplicable: z.boolean().default(false),
    nearestHospital: z.string().max(200).default(""),
    nearestHospitalNotApplicable: z.boolean().default(false),
    nearestDefib: z.string().max(200).default(""),
    nearestDefibNotApplicable: z.boolean().default(false),
  }),
  environmental: z.object({
    surroundingAreaComments: z.string().max(1000).default(""),
    treeTrimming: z.object({ answer: yesNoSchema.default(""), comments: z.string().max(1000).default("") }),
    nightWorks: z.object({ answer: yesNoSchema.default(""), comments: z.string().max(1000).default("") }),
    invasiveSpecies: z.object({ answer: yesNoSchema.default(""), comments: z.string().max(1000).default("") }),
    coshhOnSite: z.object({ answer: yesNoSchema.default(""), comments: z.string().max(1000).default("") }),
    spillKit: z.object({ answer: yesNoSchema.default(""), comments: z.string().max(1000).default("") }),
    coshhAssessmentsAware: z.object({ answer: yesNoSchema.default(""), comments: z.string().max(1000).default("") }),
  }),
  streetworks: z.object({
    trafficControlPermit: yesNoNaSchema.default(""),
    trafficControlPermitComments: z.string().max(1000).default(""),
    durations: z.array(z.string()).default([]),
    roadTypes: z.array(z.string()).default([]),
    trafficManagementProvisions: z.array(z.string()).default([]),
    pedestrianWalkwaysClosed: yesNoSchema.default(""),
    pedestrianWalkwaysComments: z.string().max(1000).default(""),
    advancedSlg: z.object({ status: complianceSchema.default(""), comments: z.string().max(1000).default("") }),
    safetyZones: z.object({ status: complianceSchema.default(""), comments: z.string().max(1000).default("") }),
    generalComments: z.string().max(1500).default(""),
  }),
  pia: z.object({
    accreditationHolderNames: z.string().max(1000).default(""),
    accreditations: z.array(z.string()).default([]),
    undergroundInteraction: yesNoSchema.default(""),
    undergroundInteractionComments: z.string().max(1000).default(""),
    overheadInteraction: yesNoSchema.default(""),
    overheadInteractionComments: z.string().max(1000).default(""),
  }),
  signature: z.object({
    signatureDataUrl: z.string().max(5_000_000).default(""),
    signatureSignedAt: z.string().max(60).default(""),
  }),
});

const attachmentLinkSchema = z.object({
  key: z.string().min(1),
  sectionKey: z.string().min(1),
  questionKey: z.string().min(1),
  existingAttachmentId: z.number().int().positive().optional(),
  existingName: z.string().optional(),
});

function normalizeText(value: string) {
  return normaliseMultiline(value ?? "");
}

export function normalizeSsraFormData(input: SsraFormData) {
  const parsed = ssraFormSchema.parse(input);
  const empty = createEmptySsraFormData();

  return {
    ...empty,
    ...parsed,
    summary: {
      ...empty.summary,
      ...parsed.summary,
      project: normalizeText(parsed.summary.project),
      workPackage: normalizeText(parsed.summary.workPackage),
      location: normalizeText(parsed.summary.location),
      descriptionOfWorks: normalizeText(parsed.summary.descriptionOfWorks),
      author: normalizeText(parsed.summary.author),
      personnel: (parsed.summary.personnel.length > 0 ? parsed.summary.personnel : empty.summary.personnel).map((personnel) => ({
        name: normalizeText(personnel.name),
        company: normalizeText(personnel.company),
        department: normalizeText(personnel.department),
      })),
    },
    hazards: {
      ...parsed.hazards,
      otherEquipment: normalizeText(parsed.hazards.otherEquipment),
      surfaceRemovalComments: normalizeText(parsed.hazards.surfaceRemovalComments),
      excavationComments: normalizeText(parsed.hazards.excavationComments),
    },
    ppe: {
      ...parsed.ppe,
      comments: normalizeText(parsed.ppe.comments),
      firstAiderOnSite: normalizeText(parsed.ppe.firstAiderOnSite),
      nearestHospital: normalizeText(parsed.ppe.nearestHospital),
      nearestDefib: normalizeText(parsed.ppe.nearestDefib),
    },
    environmental: {
      surroundingAreaComments: normalizeText(parsed.environmental.surroundingAreaComments),
      treeTrimming: { answer: parsed.environmental.treeTrimming.answer, comments: normalizeText(parsed.environmental.treeTrimming.comments) },
      nightWorks: { answer: parsed.environmental.nightWorks.answer, comments: normalizeText(parsed.environmental.nightWorks.comments) },
      invasiveSpecies: { answer: parsed.environmental.invasiveSpecies.answer, comments: normalizeText(parsed.environmental.invasiveSpecies.comments) },
      coshhOnSite: { answer: parsed.environmental.coshhOnSite.answer, comments: normalizeText(parsed.environmental.coshhOnSite.comments) },
      spillKit: { answer: parsed.environmental.spillKit.answer, comments: normalizeText(parsed.environmental.spillKit.comments) },
      coshhAssessmentsAware: {
        answer: parsed.environmental.coshhAssessmentsAware.answer,
        comments: normalizeText(parsed.environmental.coshhAssessmentsAware.comments),
      },
    },
    streetworks: {
      ...parsed.streetworks,
      trafficControlPermitComments: normalizeText(parsed.streetworks.trafficControlPermitComments),
      pedestrianWalkwaysComments: normalizeText(parsed.streetworks.pedestrianWalkwaysComments),
      advancedSlg: { status: parsed.streetworks.advancedSlg.status, comments: normalizeText(parsed.streetworks.advancedSlg.comments) },
      safetyZones: { status: parsed.streetworks.safetyZones.status, comments: normalizeText(parsed.streetworks.safetyZones.comments) },
      generalComments: normalizeText(parsed.streetworks.generalComments),
    },
    pia: {
      ...parsed.pia,
      accreditationHolderNames: normalizeText(parsed.pia.accreditationHolderNames),
      undergroundInteractionComments: normalizeText(parsed.pia.undergroundInteractionComments),
      overheadInteractionComments: normalizeText(parsed.pia.overheadInteractionComments),
    },
    signature: {
      signatureDataUrl: parsed.signature.signatureDataUrl,
      signatureSignedAt: parsed.signature.signatureSignedAt,
    },
  } satisfies SsraFormData;
}

export function validateSsraAttachmentLinks(attachmentLinks: SsraAttachmentInput[], fileCount: number) {
  const parsed = z.array(attachmentLinkSchema).parse(attachmentLinks);
  const newLinks = parsed.filter((item) => !item.existingAttachmentId);

  if (newLinks.length !== fileCount) {
    throw new Error("SSRA attachment metadata does not match the uploaded files.");
  }

  return parsed;
}

export function validateSsraUploads(files: File[]) {
  const config = getServerConfig();

  if (files.length > config.maxUploadCount * 4) {
    throw new Error(`Upload up to ${config.maxUploadCount * 4} attachments per SSRA.`);
  }

  for (const file of files) {
    if (file.size > config.maxUploadMb * 1024 * 1024) {
      throw new Error(`\"${file.name}\" is ${bytesToMegabytes(file.size)}MB. Max size is ${config.maxUploadMb}MB.`);
    }

    if (file.type && !SUPPORTED_ATTACHMENT_TYPES.includes(file.type)) {
      throw new Error(`\"${file.name}\" has an unsupported format.`);
    }
  }
}

export function validateSsraForSubmit(data: SsraFormData) {
  const errors: string[] = [];

  if (!data.summary.project) errors.push("Project is required.");
  if (!data.summary.eventDateTime) errors.push("Date and time is required.");
  if (!data.summary.location) errors.push("Location is required.");
  if (!data.summary.descriptionOfWorks) errors.push("Description of works is required.");
  if (!data.summary.author) errors.push("Author is required.");

  const hasPersonnel = data.summary.personnel.some((entry) => entry.name || entry.company || entry.department);
  if (!hasPersonnel) errors.push("Enter at least one person on site.");

  if (!data.signature.signatureDataUrl) {
    errors.push("Signature is required before submitting.");
  }

  if (errors.length > 0) {
    throw new Error(errors[0]);
  }
}
