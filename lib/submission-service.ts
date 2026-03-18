import { SURVEY_TEMPLATE } from "@/data/survey-template";
import { buildSubmissionCsv } from "@/lib/csv";
import { getDb, writeLog } from "@/lib/db";
import { sendSubmissionEmail } from "@/lib/email";
import { buildSubmissionPdf } from "@/lib/pdf";
import { checkRateLimit } from "@/lib/rate-limit";
import { saveGeneratedFile, saveUploadedPhotos } from "@/lib/storage";
import { makeReference } from "@/lib/utils";
import { ensureSubmissionHasContent, validateEditableItems, validatePhotoLinks, validateSubmissionMetadata, validateUploads } from "@/lib/validation";
import type { EditableLineItem, PhotoLinkInput, SubmissionMetadata } from "@/types";

type SubmissionContext = {
  metadata: SubmissionMetadata;
  items: EditableLineItem[];
  photos: File[];
  photoLinks: PhotoLinkInput[];
  honeypotValue: string;
  ipAddress: string;
  userAgent: string;
};

export async function processSubmission(context: SubmissionContext) {
  if (context.honeypotValue.trim()) {
    writeLog("warn", "Submission blocked by honeypot.", undefined, { ipAddress: context.ipAddress });
    throw new Error("Submission could not be accepted.");
  }

  const rateLimit = checkRateLimit(context.ipAddress);
  if (!rateLimit.allowed) {
    const error = new Error("Too many submissions from this device. Try again shortly.");
    (error as Error & { retryAfterSeconds?: number }).retryAfterSeconds = rateLimit.retryAfterSeconds;
    throw error;
  }

  const metadata = validateSubmissionMetadata(context.metadata);
  const normalisedItems = validateEditableItems(context.items);
  validateUploads(context.photos);
  const validatedPhotoLinks = validatePhotoLinks(context.photoLinks, context.photos.length);
  ensureSubmissionHasContent(normalisedItems, context.photos.length);

  const reference = makeReference();
  const createdAt = new Date().toISOString();
  const storedPhotos = await saveUploadedPhotos(reference, context.photos, validatedPhotoLinks);
  const csvBuffer = buildSubmissionCsv({
    ...metadata,
    reference,
    createdAt,
    items: normalisedItems,
    photos: storedPhotos,
  });
  const pdfBuffer = await buildSubmissionPdf({
    ...metadata,
    reference,
    createdAt,
    items: normalisedItems,
    photos: storedPhotos,
  });

  const csvFile = await saveGeneratedFile(reference, `${reference}.csv`, csvBuffer);
  const pdfFile = await saveGeneratedFile(reference, `${reference}.pdf`, pdfBuffer);

  const db = getDb();
  const saveSubmission = db.transaction(() => {
    const submissionResult = db
      .prepare(
        `
          INSERT INTO submissions (
            reference,
            project,
            surveyor_name,
            survey_date,
            site_location,
            general_comments,
            created_at,
            email_status,
            pdf_path,
            csv_path,
            photo_count,
            client_ip,
            user_agent,
            status
          ) VALUES (
            @reference,
            @project,
            @surveyorName,
            @surveyDate,
            @siteLocation,
            @generalComments,
            @createdAt,
            'pending',
            @pdfPath,
            @csvPath,
            @photoCount,
            @clientIp,
            @userAgent,
            'completed'
          )
        `,
      )
      .run({
        reference,
        project: metadata.project,
        surveyorName: metadata.surveyorName,
        surveyDate: metadata.surveyDate,
        siteLocation: metadata.siteLocation,
        generalComments: metadata.generalComments,
        createdAt,
        pdfPath: pdfFile.relativePath,
        csvPath: csvFile.relativePath,
        photoCount: storedPhotos.length,
        clientIp: context.ipAddress,
        userAgent: context.userAgent,
      });

    const submissionId = Number(submissionResult.lastInsertRowid);
    const itemInsert = db.prepare(
      `
        INSERT INTO submission_items (
          submission_id,
          template_id,
          section_name,
          charge_type,
          description,
          additional_description,
          notes_guidance,
          quantity,
          notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    );

    for (const item of normalisedItems) {
      itemInsert.run(
        submissionId,
        item.templateId,
        item.section,
        item.chargeType,
        item.description,
        item.additionalDescription ?? "",
        item.notesGuidance ?? "",
        item.quantity,
        item.notes,
      );
    }

    const photoInsert = db.prepare(
      `
        INSERT INTO submission_photos (
          submission_id,
          original_name,
          stored_name,
          relative_path,
          mime_type,
          size_bytes,
          linked_template_id,
          linked_section_name,
          linked_description
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    );

    for (const photo of storedPhotos) {
      photoInsert.run(
        submissionId,
        photo.originalName,
        photo.storedName,
        photo.relativePath,
        photo.mimeType,
        photo.sizeBytes,
        photo.linkedTemplateId,
        photo.linkedSectionName,
        photo.linkedDescription,
      );
    }
  });

  saveSubmission();
  writeLog("info", "Submission stored successfully.", reference, {
    project: metadata.project,
    lineItemCount: SURVEY_TEMPLATE.length,
    photoCount: storedPhotos.length,
  });

  let emailDelivered = false;
  try {
    await sendSubmissionEmail({
      ...metadata,
      reference,
      pdfBuffer,
      csvBuffer,
    });

    db.prepare("UPDATE submissions SET email_status = 'sent', email_error = NULL WHERE reference = ?").run(reference);
    emailDelivered = true;
    writeLog("info", "Submission email sent.", reference);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown email error";
    db.prepare("UPDATE submissions SET email_status = 'failed', email_error = ? WHERE reference = ?").run(message, reference);
    writeLog("error", "Submission email failed.", reference, { error: message });
  }

  return {
    reference,
    emailDelivered,
    pdfDownloadPath: `/download/${reference}`,
  };
}

export function getSubmissionPdf(reference: string) {
  const db = getDb();
  return db
    .prepare("SELECT reference, pdf_path, project, survey_date FROM submissions WHERE reference = ?")
    .get(reference) as { reference: string; pdf_path: string | null; project: string; survey_date: string } | undefined;
}
