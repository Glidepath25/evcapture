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

type BackgroundArtifactsContext = {
  metadata: SubmissionMetadata;
  items: ReturnType<typeof validateEditableItems>;
  storedPhotos: Awaited<ReturnType<typeof saveUploadedPhotos>>;
  reference: string;
  createdAt: string;
};

function updateSubmissionStatus(reference: string, updates: { pdfStatus?: string; emailStatus?: string; emailError?: string | null; pdfPath?: string | null; csvPath?: string | null }) {
  const db = getDb();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.pdfStatus !== undefined) {
    fields.push("pdf_status = ?");
    values.push(updates.pdfStatus);
  }
  if (updates.emailStatus !== undefined) {
    fields.push("email_status = ?");
    values.push(updates.emailStatus);
  }
  if (updates.emailError !== undefined) {
    fields.push("email_error = ?");
    values.push(updates.emailError);
  }
  if (updates.pdfPath !== undefined) {
    fields.push("pdf_path = ?");
    values.push(updates.pdfPath);
  }
  if (updates.csvPath !== undefined) {
    fields.push("csv_path = ?");
    values.push(updates.csvPath);
  }

  if (fields.length === 0) {
    return;
  }

  values.push(reference);
  db.prepare(`UPDATE submissions SET ${fields.join(", ")} WHERE reference = ?`).run(...values);
}

async function finalizeSubmissionArtifacts(context: BackgroundArtifactsContext) {
  let csvBuffer: Buffer | null = null;
  let pdfBuffer: Buffer | null = null;

  try {
    csvBuffer = buildSubmissionCsv({
      ...context.metadata,
      reference: context.reference,
      createdAt: context.createdAt,
      items: context.items,
      photos: context.storedPhotos,
    });

    const csvFile = await saveGeneratedFile(context.reference, `${context.reference}.csv`, csvBuffer);
    updateSubmissionStatus(context.reference, { csvPath: csvFile.relativePath });
    writeLog("info", "Submission CSV generated.", context.reference);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown CSV generation error";
    writeLog("error", "Submission CSV generation failed.", context.reference, { error: message });
  }

  try {
    pdfBuffer = await buildSubmissionPdf({
      ...context.metadata,
      reference: context.reference,
      createdAt: context.createdAt,
      items: context.items,
      photos: context.storedPhotos,
    });

    if (pdfBuffer.length === 0) {
      throw new Error("Generated PDF buffer was empty.");
    }

    const pdfFile = await saveGeneratedFile(context.reference, `${context.reference}.pdf`, pdfBuffer);
    updateSubmissionStatus(context.reference, {
      pdfStatus: "complete",
      pdfPath: pdfFile.relativePath,
    });
    writeLog("info", "Submission PDF generated.", context.reference);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown PDF generation error";
    updateSubmissionStatus(context.reference, {
      pdfStatus: "failed",
      emailStatus: "failed",
      emailError: "PDF generation failed before email could be sent.",
    });
    writeLog("error", "Submission PDF generation failed.", context.reference, { error: message });
    return;
  }

  if (!csvBuffer || !pdfBuffer) {
    updateSubmissionStatus(context.reference, {
      emailStatus: "failed",
      emailError: "Required artifacts were not ready for email sending.",
    });
    writeLog("error", "Submission email skipped because artifacts were incomplete.", context.reference);
    return;
  }

  try {
    await sendSubmissionEmail({
      ...context.metadata,
      reference: context.reference,
      pdfBuffer,
      csvBuffer,
    });

    updateSubmissionStatus(context.reference, {
      emailStatus: "sent",
      emailError: null,
    });
    writeLog("info", "Submission email sent.", context.reference);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown email error";
    updateSubmissionStatus(context.reference, {
      emailStatus: "failed",
      emailError: message,
    });
    writeLog("error", "Submission email failed.", context.reference, { error: message });
  }
}

function queueSubmissionArtifacts(context: BackgroundArtifactsContext) {
  setTimeout(() => {
    void finalizeSubmissionArtifacts(context).catch((error) => {
      const message = error instanceof Error ? error.message : "Unknown background processing error";
      updateSubmissionStatus(context.reference, {
        pdfStatus: "failed",
        emailStatus: "failed",
        emailError: message,
      });
      writeLog("error", "Background submission processing crashed.", context.reference, { error: message });
    });
  }, 0);
}

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

  const db = getDb();
  const saveSubmission = db.transaction(() => {
    const submissionResult = db
      .prepare(
        `
          INSERT INTO submissions (
            reference,
            project,
            survey_type,
            surveyor_name,
            survey_date,
            site_location,
            general_comments,
            created_at,
            pdf_status,
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
            @surveyType,
            @surveyorName,
            @surveyDate,
            @siteLocation,
            @generalComments,
            @createdAt,
            'pending',
            'pending',
            NULL,
            NULL,
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
        surveyType: metadata.surveyType,
        surveyorName: metadata.surveyorName,
        surveyDate: metadata.surveyDate,
        siteLocation: metadata.siteLocation,
        generalComments: metadata.generalComments,
        createdAt,
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
          quantity_breakdown_json,
          notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        JSON.stringify(item.quantityOptions ?? []),
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
    surveyType: metadata.surveyType,
    lineItemCount: SURVEY_TEMPLATE.length,
    photoCount: storedPhotos.length,
  });

  queueSubmissionArtifacts({
    metadata,
    items: normalisedItems,
    storedPhotos,
    reference,
    createdAt,
  });

  return {
    reference,
    emailDelivered: false,
    pdfDownloadPath: `/download/${reference}`,
  };
}

export function getSubmissionPdf(reference: string) {
  const db = getDb();
  return db
    .prepare("SELECT reference, pdf_path, project, survey_type, survey_date FROM submissions WHERE reference = ?")
    .get(reference) as { reference: string; pdf_path: string | null; project: string; survey_type: string; survey_date: string } | undefined;
}
