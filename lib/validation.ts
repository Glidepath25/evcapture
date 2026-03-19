import { SURVEY_TEMPLATE } from "@/data/survey-template";
import { getServerConfig } from "@/lib/config";
import { buildQuantityDisplay } from "@/lib/quantity";
import { SUPPORTED_IMAGE_TYPES } from "@/lib/storage";
import { bytesToMegabytes, normaliseMultiline } from "@/lib/utils";
import type { EditableLineItem, NormalizedLineItem, PhotoLinkInput, SubmissionMetadata } from "@/types";
import { z } from "zod";

const metadataSchema = z.object({
  project: z.string().trim().min(1, "Project is required.").max(120),
  surveyorName: z.string().trim().min(1, "Surveyor name is required.").max(120),
  surveyDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Survey date is required."),
  siteLocation: z.string().trim().max(200, "Site location must be 200 characters or fewer.").default(""),
  generalComments: z.string().trim().max(2000, "General comments must be 2000 characters or fewer.").default(""),
});

const editableLineItemSchema = z.object({
  templateId: z.string().trim().min(1),
  quantity: z.string().trim().max(40),
  notes: z.string().trim().max(500, "Line item notes must be 500 characters or fewer."),
  optionQuantities: z.record(z.string(), z.string().trim().max(40)).optional(),
});

const photoLinkSchema = z.object({
  linkedTemplateId: z.string().trim().min(1).nullable(),
});

export function validateSubmissionMetadata(input: SubmissionMetadata) {
  const parsed = metadataSchema.parse({
    ...input,
    siteLocation: input.siteLocation ?? "",
    generalComments: input.generalComments ?? "",
  });

  return {
    ...parsed,
    siteLocation: normaliseMultiline(parsed.siteLocation),
    generalComments: normaliseMultiline(parsed.generalComments),
  };
}

export function validateEditableItems(items: EditableLineItem[]) {
  const parsedItems = z.array(editableLineItemSchema).parse(items);
  const itemMap = new Map(parsedItems.map((item) => [item.templateId, item]));

  return SURVEY_TEMPLATE.map<NormalizedLineItem>((templateRow) => {
    const current = itemMap.get(templateRow.id);
    const quantityText = current?.quantity?.trim() ?? "";
    const parsedQuantity = quantityText === "" ? null : Number(quantityText);
    const parsedOptionQuantities =
      templateRow.quantityOptions?.map((option) => {
        const rawValue = current?.optionQuantities?.[option.id]?.trim() ?? "";
        const parsedValue = rawValue === "" ? null : Number(rawValue);

        if (rawValue !== "" && (parsedValue === null || !Number.isFinite(parsedValue) || parsedValue < 0)) {
          throw new Error(`Quantity for "${templateRow.description}" option "${option.label}" must be a valid number.`);
        }

        return {
          ...option,
          quantity: parsedValue,
        };
      }) ?? [];

    if (quantityText !== "" && (parsedQuantity === null || !Number.isFinite(parsedQuantity) || parsedQuantity < 0)) {
      throw new Error(`Quantity for "${templateRow.description}" must be a valid number.`);
    }

    return {
      templateId: templateRow.id,
      chargeType: templateRow.chargeType,
      description: templateRow.description,
      additionalDescription: templateRow.additionalDescription,
      notesGuidance: templateRow.notesGuidance,
      quantity: parsedQuantity,
      notes: normaliseMultiline(current?.notes ?? ""),
      section: templateRow.section,
      quantityOptions: parsedOptionQuantities,
      quantityDisplay: buildQuantityDisplay(parsedQuantity, parsedOptionQuantities),
    };
  });
}

export function validateUploads(files: File[]) {
  const config = getServerConfig();

  if (files.length > config.maxUploadCount) {
    throw new Error(`Upload up to ${config.maxUploadCount} photos per submission.`);
  }

  for (const file of files) {
    if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
      throw new Error("Supported photo formats are JPEG, PNG, WebP, HEIC, and HEIF.");
    }

    if (file.size > config.maxUploadMb * 1024 * 1024) {
      throw new Error(`"${file.name}" is ${bytesToMegabytes(file.size)}MB. Max size is ${config.maxUploadMb}MB.`);
    }
  }
}

export function validatePhotoLinks(photoLinks: PhotoLinkInput[], fileCount: number) {
  const parsedLinks = z.array(photoLinkSchema).parse(photoLinks);
  if (parsedLinks.length !== fileCount) {
    throw new Error("Photo metadata does not match the uploaded files.");
  }

  const validTemplateIds = new Set(SURVEY_TEMPLATE.map((row) => row.id));
  for (const link of parsedLinks) {
    if (link.linkedTemplateId && !validTemplateIds.has(link.linkedTemplateId)) {
      throw new Error("A photo was linked to an unknown survey item.");
    }
  }

  return parsedLinks;
}

export function ensureSubmissionHasContent(items: NormalizedLineItem[], photoCount: number) {
  const hasLineData = items.some(
    (item) => item.quantity !== null || item.notes.length > 0 || (item.quantityOptions ?? []).some((option) => option.quantity !== null),
  );

  if (!hasLineData && photoCount === 0) {
    throw new Error("Enter at least one quantity, note, or photo before submitting.");
  }
}
