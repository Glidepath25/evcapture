import path from "node:path";
import { getDb, writeLog } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendSsraEmail } from "@/lib/ssra-email";
import { buildSsraPdf } from "@/lib/ssra-pdf";
import { buildSubmissionArtifactBaseName } from "@/lib/submission-artifacts";
import { normalizeSsraFormData, validateSsraAttachmentLinks, validateSsraForSubmit, validateSsraUploads } from "@/lib/ssra-validation";
import { removeStoredFiles, saveGeneratedFile, saveSsraAttachments } from "@/lib/storage";
import { makeTypedReference } from "@/lib/utils";
import type { SsraAttachmentInput, SsraFormData, StoredAttachment } from "@/types";

type SsraSaveContext = {
  mode: "draft" | "submit";
  reference?: string;
  formData: SsraFormData;
  attachments: File[];
  attachmentLinks: SsraAttachmentInput[];
  honeypotValue: string;
  ipAddress: string;
  userAgent: string;
};

type SsraArtifactContext = {
  reference: string;
  project: string;
  eventDateTime: string;
  author: string;
  location: string;
  createdAt: string;
  formData: SsraFormData;
  attachments: StoredAttachment[];
};

function getExistingSsra(reference: string) {
  const db = getDb();
  return db
    .prepare(
      `
        SELECT id, reference, status
        FROM ssra_submissions
        WHERE reference = ?
      `,
    )
    .get(reference) as { id: number; reference: string; status: string } | undefined;
}

function getStoredSsraAttachments(submissionId: number) {
  const db = getDb();
  return db
    .prepare(
      `
        SELECT
          id,
          original_name as originalName,
          stored_name as storedName,
          relative_path as relativePath,
          mime_type as mimeType,
          size_bytes as sizeBytes,
          section_key as sectionKey,
          question_key as questionKey
        FROM ssra_attachments
        WHERE ssra_submission_id = ?
        ORDER BY id ASC
      `,
    )
    .all(submissionId) as Array<Omit<StoredAttachment, "absolutePath"> & { id: number }>;
}

function updateSsraStatus(
  reference: string,
  updates: { status?: string; pdfStatus?: string; emailStatus?: string; emailError?: string | null; pdfPath?: string | null; submittedAt?: string | null },
) {
  const db = getDb();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.status !== undefined) {
    fields.push("status = ?");
    values.push(updates.status);
  }
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
  if (updates.submittedAt !== undefined) {
    fields.push("submitted_at = ?");
    values.push(updates.submittedAt);
  }

  if (fields.length === 0) {
    return;
  }

  fields.push("updated_at = ?");
  values.push(new Date().toISOString());
  values.push(reference);
  db.prepare(`UPDATE ssra_submissions SET ${fields.join(", ")} WHERE reference = ?`).run(...values);
}

async function finalizeSsraArtifacts(context: SsraArtifactContext) {
  let pdfBuffer: Buffer | null = null;

  try {
    pdfBuffer = await buildSsraPdf({
      reference: context.reference,
      createdAt: context.createdAt,
      status: "submitted",
      formData: context.formData,
      attachments: context.attachments,
    });

    const filenameBase = buildSubmissionArtifactBaseName(
      context.project || "SSRA",
      "SSRA",
      context.eventDateTime || context.createdAt,
    );
    const pdfFile = await saveGeneratedFile(context.reference, `${filenameBase || context.reference}.pdf`, pdfBuffer);
    updateSsraStatus(context.reference, { pdfStatus: "complete", pdfPath: pdfFile.relativePath });
    writeLog("info", "SSRA PDF generated.", context.reference);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown SSRA PDF generation error";
    updateSsraStatus(context.reference, {
      status: "failed",
      pdfStatus: "failed",
      emailStatus: "failed",
      emailError: "SSRA PDF generation failed before email could be sent.",
    });
    writeLog("error", "SSRA PDF generation failed.", context.reference, { error: message });
    return;
  }

  try {
    await sendSsraEmail({
      reference: context.reference,
      project: context.project,
      eventDateTime: context.eventDateTime,
      author: context.author,
      location: context.location,
      pdfBuffer: pdfBuffer!,
    });

    updateSsraStatus(context.reference, {
      status: "completed",
      emailStatus: "sent",
      emailError: null,
    });
    writeLog("info", "SSRA email sent.", context.reference);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown SSRA email error";
    updateSsraStatus(context.reference, {
      status: "completed",
      emailStatus: "failed",
      emailError: message,
    });
    writeLog("error", "SSRA email failed.", context.reference, { error: message });
  }
}

function queueSsraArtifacts(context: SsraArtifactContext) {
  setTimeout(() => {
    void finalizeSsraArtifacts(context).catch((error) => {
      const message = error instanceof Error ? error.message : "Unknown SSRA background processing error";
      updateSsraStatus(context.reference, {
        status: "failed",
        pdfStatus: "failed",
        emailStatus: "failed",
        emailError: message,
      });
      writeLog("error", "SSRA background processing crashed.", context.reference, { error: message });
    });
  }, 0);
}

export async function saveSsra(context: SsraSaveContext) {
  if (context.honeypotValue.trim()) {
    writeLog("warn", "SSRA blocked by honeypot.", undefined, { ipAddress: context.ipAddress });
    throw new Error("Submission could not be accepted.");
  }

  const rateLimit = checkRateLimit(context.ipAddress);
  if (!rateLimit.allowed) {
    throw new Error("Too many submissions from this device. Try again shortly.");
  }

  const formData = normalizeSsraFormData(context.formData);
  validateSsraUploads(context.attachments);
  const validatedLinks = validateSsraAttachmentLinks(context.attachmentLinks, context.attachments.length);

  if (context.mode === "submit") {
    validateSsraForSubmit(formData);
  }

  const now = new Date().toISOString();
  const reference = context.reference || makeTypedReference("SSRA");
  const existing = getExistingSsra(reference);
  const db = getDb();
  const recordStatus = context.mode === "submit" ? "submitted" : "draft";
  const pdfStatus = context.mode === "submit" ? "pending" : "draft";
  const emailStatus = context.mode === "submit" ? "pending" : "draft";

  const existingAttachments = existing ? getStoredSsraAttachments(existing.id) : [];
  const keptExistingAttachments = existingAttachments.filter((attachment) =>
    validatedLinks.some((link) => link.existingAttachmentId === attachment.id),
  );
  const removedAttachments = existingAttachments.filter((attachment) =>
    !validatedLinks.some((link) => link.existingAttachmentId === attachment.id),
  );
  const newAttachmentLinks = validatedLinks
    .filter((link) => !link.existingAttachmentId)
    .map((link) => ({ sectionKey: link.sectionKey, questionKey: link.questionKey }));
  const newAttachments = await saveSsraAttachments(reference, context.attachments, newAttachmentLinks);
  const allAttachments: StoredAttachment[] = [
    ...keptExistingAttachments.map((attachment) => ({
      ...attachment,
      absolutePath: "",
    })),
    ...newAttachments,
  ].map((attachment) => ({
    ...attachment,
    absolutePath: attachment.absolutePath || path.resolve(process.cwd(), attachment.relativePath),
  }));

  const saveRecord = db.transaction(() => {
    let submissionId = existing?.id;

    if (submissionId) {
      db.prepare(
        `
          UPDATE ssra_submissions
          SET
            project = @project,
            author = @author,
            work_package = @workPackage,
            location = @location,
            event_datetime = @eventDateTime,
            description_of_works = @descriptionOfWorks,
            status = @status,
            pdf_status = @pdfStatus,
            email_status = @emailStatus,
            email_error = @emailError,
            attachment_count = @attachmentCount,
            updated_at = @updatedAt,
            submitted_at = @submittedAt,
            client_ip = @clientIp,
            user_agent = @userAgent,
            form_json = @formJson,
            signature_data_url = @signatureDataUrl
          WHERE id = @id
        `,
      ).run({
        id: submissionId,
        project: formData.summary.project,
        author: formData.summary.author,
        workPackage: formData.summary.workPackage,
        location: formData.summary.location,
        eventDateTime: formData.summary.eventDateTime,
        descriptionOfWorks: formData.summary.descriptionOfWorks,
        status: recordStatus,
        pdfStatus,
        emailStatus,
        emailError: null,
        attachmentCount: allAttachments.length,
        updatedAt: now,
        submittedAt: context.mode === "submit" ? now : null,
        clientIp: context.ipAddress,
        userAgent: context.userAgent,
        formJson: JSON.stringify(formData),
        signatureDataUrl: formData.signature.signatureDataUrl,
      });

      db.prepare("DELETE FROM ssra_attachments WHERE ssra_submission_id = ?").run(submissionId);
    } else {
      const result = db
        .prepare(
          `
            INSERT INTO ssra_submissions (
              reference,
              project,
              author,
              work_package,
              location,
              event_datetime,
              description_of_works,
              status,
              pdf_status,
              email_status,
              email_error,
              attachment_count,
              created_at,
              updated_at,
              submitted_at,
              client_ip,
              user_agent,
              form_json,
              signature_data_url
            ) VALUES (
              @reference,
              @project,
              @author,
              @workPackage,
              @location,
              @eventDateTime,
              @descriptionOfWorks,
              @status,
              @pdfStatus,
              @emailStatus,
              NULL,
              @attachmentCount,
              @createdAt,
              @updatedAt,
              @submittedAt,
              @clientIp,
              @userAgent,
              @formJson,
              @signatureDataUrl
            )
          `,
        )
        .run({
          reference,
          project: formData.summary.project,
          author: formData.summary.author,
          workPackage: formData.summary.workPackage,
          location: formData.summary.location,
          eventDateTime: formData.summary.eventDateTime,
          descriptionOfWorks: formData.summary.descriptionOfWorks,
          status: recordStatus,
          pdfStatus,
          emailStatus,
          attachmentCount: allAttachments.length,
          createdAt: now,
          updatedAt: now,
          submittedAt: context.mode === "submit" ? now : null,
          clientIp: context.ipAddress,
          userAgent: context.userAgent,
          formJson: JSON.stringify(formData),
          signatureDataUrl: formData.signature.signatureDataUrl,
        });
      submissionId = Number(result.lastInsertRowid);
    }

    const insertAttachment = db.prepare(
      `
        INSERT INTO ssra_attachments (
          ssra_submission_id,
          section_key,
          question_key,
          original_name,
          stored_name,
          relative_path,
          mime_type,
          size_bytes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
    );

    for (const attachment of allAttachments) {
      insertAttachment.run(
        submissionId,
        attachment.sectionKey,
        attachment.questionKey,
        attachment.originalName,
        attachment.storedName,
        attachment.relativePath,
        attachment.mimeType,
        attachment.sizeBytes,
      );
    }
  });

  saveRecord();
  await removeStoredFiles(removedAttachments.map((attachment) => attachment.relativePath));

  writeLog("info", context.mode === "submit" ? "SSRA submitted." : "SSRA draft saved.", reference, {
    project: formData.summary.project,
    attachmentCount: allAttachments.length,
  });

  if (context.mode === "submit") {
    queueSsraArtifacts({
      reference,
      project: formData.summary.project,
      eventDateTime: formData.summary.eventDateTime,
      author: formData.summary.author,
      location: formData.summary.location,
      createdAt: now,
      formData,
      attachments: allAttachments,
    });
  }

  return {
    reference,
    status: context.mode === "submit" ? "submitted" : "draft",
    pdfDownloadPath: `/download/${reference}`,
  };
}

export function getSsraDownload(reference: string) {
  const db = getDb();
  return db
    .prepare("SELECT reference, pdf_path FROM ssra_submissions WHERE reference = ?")
    .get(reference) as { reference: string; pdf_path: string | null } | undefined;
}

export function getSsraDraft(reference: string) {
  const db = getDb();
  const submission = db
    .prepare(
      `
        SELECT
          id,
          reference,
          status,
          form_json,
          signature_data_url,
          updated_at
        FROM ssra_submissions
        WHERE reference = ?
      `,
    )
    .get(reference) as
    | {
        id: number;
        reference: string;
        status: string;
        form_json: string;
        signature_data_url: string;
        updated_at: string;
      }
    | undefined;

  if (!submission) {
    return null;
  }

  const attachments = db
    .prepare(
      `
        SELECT
          id,
          section_key,
          question_key,
          original_name
        FROM ssra_attachments
        WHERE ssra_submission_id = ?
        ORDER BY id ASC
      `,
    )
    .all(submission.id) as Array<{
    id: number;
    section_key: string;
    question_key: string;
    original_name: string;
  }>;

  return {
    reference: submission.reference,
    status: submission.status,
    updatedAt: submission.updated_at,
    formData: JSON.parse(submission.form_json) as SsraFormData,
    attachments: attachments.map((attachment) => ({
      id: attachment.id,
      sectionKey: attachment.section_key,
      questionKey: attachment.question_key,
      originalName: attachment.original_name,
    })),
  };
}
