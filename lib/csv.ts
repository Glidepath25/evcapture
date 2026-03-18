import { stringify } from "csv-stringify/sync";
import { formatSubmissionTimestamp } from "@/lib/format";
import type { NormalizedLineItem, StoredPhoto, SubmissionMetadata } from "@/types";

type CsvInput = SubmissionMetadata & {
  reference: string;
  createdAt: string;
  items: NormalizedLineItem[];
  photos: StoredPhoto[];
};

export function buildSubmissionCsv(input: CsvInput) {
  const generalPhotoReferences = input.photos
    .filter((photo) => !photo.linkedTemplateId)
    .map((photo) => photo.storedName)
    .join(", ");

  const records = input.items.map((item) => ({
    reference: input.reference,
    submission_timestamp: formatSubmissionTimestamp(input.createdAt),
    project: input.project,
    surveyor_name: input.surveyorName,
    survey_date: input.surveyDate,
    site_location: input.siteLocation,
    general_comments: input.generalComments,
    charge_type: item.chargeType,
    description: item.description,
    additional_description: item.additionalDescription ?? "",
    quantity: item.quantity ?? "",
    notes: item.notes,
    linked_photo_references: input.photos
      .filter((photo) => photo.linkedTemplateId === item.templateId)
      .map((photo) => photo.storedName)
      .join(", "),
    general_photo_references: generalPhotoReferences,
  }));

  return Buffer.from(
    stringify(records, {
      header: true,
    }),
    "utf8",
  );
}
