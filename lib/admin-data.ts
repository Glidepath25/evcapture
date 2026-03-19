import path from "node:path";
import { getDb } from "@/lib/db";
import type { SsraFormData } from "@/types";

const ADMIN_PAGE_SIZE = 50;

export type AdminRecordType = "ev" | "ssra";

export type AdminSubmissionFilters = {
  q?: string;
  pdfStatus?: string;
  emailStatus?: string;
  status?: string;
  page?: number;
};

export type AdminSubmissionListItem = {
  reference: string;
  project: string;
  survey_type: string;
  surveyor_name: string;
  survey_date: string;
  created_at: string;
  photo_count: number;
  pdf_status: string;
  email_status: string;
  status: string;
  site_location: string;
  record_type: AdminRecordType;
};

export type AdminEvSubmissionSummary = {
  id: number;
  reference: string;
  project: string;
  survey_type: string;
  surveyor_name: string;
  survey_date: string;
  site_location: string;
  general_comments: string;
  created_at: string;
  client_ip: string;
  user_agent: string;
  pdf_status: string;
  email_status: string;
  email_error: string | null;
  status: string;
  photo_count: number;
  pdf_path: string | null;
  csv_path: string | null;
  record_type: "ev";
};

export type AdminSubmissionItem = {
  id: number;
  section_name: string;
  charge_type: string;
  description: string;
  quantity: number | null;
  quantity_breakdown_json: string;
  notes: string;
  additional_description: string;
  notes_guidance: string;
};

export type AdminSubmissionPhoto = {
  id: number;
  original_name: string;
  stored_name: string;
  relative_path: string;
  mime_type: string;
  size_bytes: number;
  linked_template_id: string | null;
  linked_section_name: string;
  linked_description: string;
};

export type AdminEvSubmissionDetail = {
  recordType: "ev";
  submission: AdminEvSubmissionSummary;
  items: AdminSubmissionItem[];
  photos: AdminSubmissionPhoto[];
};

export type AdminSsraSubmissionSummary = {
  id: number;
  reference: string;
  project: string;
  author: string;
  work_package: string;
  location: string;
  event_datetime: string;
  description_of_works: string;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  client_ip: string;
  user_agent: string;
  pdf_status: string;
  email_status: string;
  email_error: string | null;
  status: string;
  attachment_count: number;
  pdf_path: string | null;
  record_type: "ssra";
};

export type AdminSsraAttachment = {
  id: number;
  section_key: string;
  question_key: string;
  original_name: string;
  stored_name: string;
  relative_path: string;
  mime_type: string;
  size_bytes: number;
};

export type AdminSsraSubmissionDetail = {
  recordType: "ssra";
  submission: AdminSsraSubmissionSummary;
  formData: SsraFormData;
  attachments: AdminSsraAttachment[];
};

export type AdminSubmissionDetail = AdminEvSubmissionDetail | AdminSsraSubmissionDetail;

export type AdminStats = {
  totalSubmissions: number;
  failedEmails: number;
  pendingPdfs: number;
};

const LIST_UNION_SQL = `
  SELECT
    'ev' AS record_type,
    reference,
    project,
    survey_type,
    surveyor_name,
    survey_date,
    created_at,
    photo_count,
    pdf_status,
    email_status,
    status,
    site_location
  FROM submissions

  UNION ALL

  SELECT
    'ssra' AS record_type,
    reference,
    project,
    'SSRA' AS survey_type,
    author AS surveyor_name,
    event_datetime AS survey_date,
    created_at,
    attachment_count AS photo_count,
    pdf_status,
    email_status,
    status,
    location AS site_location
  FROM ssra_submissions
`;

function buildWhereClause(filters: AdminSubmissionFilters) {
  const clauses: string[] = [];
  const params: Record<string, unknown> = {};
  const q = filters.q?.trim();

  if (q) {
    clauses.push(`
      (
        reference LIKE @q
        OR project LIKE @q
        OR surveyor_name LIKE @q
        OR site_location LIKE @q
      )
    `);
    params.q = `%${q}%`;
  }

  if (filters.pdfStatus) {
    clauses.push("pdf_status = @pdfStatus");
    params.pdfStatus = filters.pdfStatus;
  }

  if (filters.emailStatus) {
    clauses.push("email_status = @emailStatus");
    params.emailStatus = filters.emailStatus;
  }

  if (filters.status) {
    clauses.push("status = @status");
    params.status = filters.status;
  }

  return {
    whereSql: clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "",
    params,
  };
}

function getSsraDetail(reference: string) {
  const db = getDb();
  const submission = db
    .prepare(
      `
        SELECT
          id,
          reference,
          project,
          author,
          work_package,
          location,
          event_datetime,
          description_of_works,
          created_at,
          updated_at,
          submitted_at,
          client_ip,
          user_agent,
          pdf_status,
          email_status,
          email_error,
          status,
          attachment_count,
          pdf_path,
          form_json
        FROM ssra_submissions
        WHERE reference = ?
      `,
    )
    .get(reference) as (Omit<AdminSsraSubmissionSummary, "record_type"> & { form_json: string }) | undefined;

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
          original_name,
          stored_name,
          relative_path,
          mime_type,
          size_bytes
        FROM ssra_attachments
        WHERE ssra_submission_id = ?
        ORDER BY id ASC
      `,
    )
    .all(submission.id) as AdminSsraAttachment[];

  const { form_json, ...submissionSummary } = submission;

  return {
    recordType: "ssra",
    submission: {
      ...submissionSummary,
      record_type: "ssra",
    },
    formData: JSON.parse(form_json) as SsraFormData,
    attachments,
  } satisfies AdminSsraSubmissionDetail;
}

export function getAdminSubmissionsList(filters: AdminSubmissionFilters) {
  const db = getDb();
  const page = Math.max(1, filters.page ?? 1);
  const offset = (page - 1) * ADMIN_PAGE_SIZE;
  const { whereSql, params } = buildWhereClause(filters);

  const items = db
    .prepare(
      `
        SELECT
          reference,
          project,
          survey_type,
          surveyor_name,
          survey_date,
          created_at,
          photo_count,
          pdf_status,
          email_status,
          status,
          site_location,
          record_type
        FROM (${LIST_UNION_SQL}) records
        ${whereSql}
        ORDER BY created_at DESC
        LIMIT @limit OFFSET @offset
      `,
    )
    .all({
      ...params,
      limit: ADMIN_PAGE_SIZE,
      offset,
    }) as AdminSubmissionListItem[];

  const totalRow = db
    .prepare(`SELECT COUNT(*) as total FROM (${LIST_UNION_SQL}) records ${whereSql}`)
    .get(params) as { total: number };

  return {
    items,
    page,
    pageSize: ADMIN_PAGE_SIZE,
    total: totalRow.total,
    totalPages: Math.max(1, Math.ceil(totalRow.total / ADMIN_PAGE_SIZE)),
  };
}

export function getAdminStats() {
  const db = getDb();
  const totals = db
    .prepare(
      `
        SELECT
          (SELECT COUNT(*) FROM submissions) + (SELECT COUNT(*) FROM ssra_submissions) AS total,
          (SELECT COUNT(*) FROM submissions WHERE email_status = 'failed') + (SELECT COUNT(*) FROM ssra_submissions WHERE email_status = 'failed') AS failed_emails,
          (SELECT COUNT(*) FROM submissions WHERE pdf_status = 'pending') + (SELECT COUNT(*) FROM ssra_submissions WHERE pdf_status = 'pending') AS pending_pdfs
      `,
    )
    .get() as {
      total: number;
      failed_emails: number;
      pending_pdfs: number;
    };

  return {
    totalSubmissions: totals.total,
    failedEmails: totals.failed_emails,
    pendingPdfs: totals.pending_pdfs,
  } satisfies AdminStats;
}

export function getAdminSubmissionDetail(reference: string) {
  const db = getDb();
  const submission = db
    .prepare(
      `
        SELECT
          id,
          reference,
          project,
          survey_type,
          surveyor_name,
          survey_date,
          site_location,
          general_comments,
          created_at,
          client_ip,
          user_agent,
          pdf_status,
          email_status,
          email_error,
          status,
          photo_count,
          pdf_path,
          csv_path
        FROM submissions
        WHERE reference = ?
      `,
    )
    .get(reference) as Omit<AdminEvSubmissionSummary, "record_type"> | undefined;

  if (submission) {
    const items = db
      .prepare(
        `
          SELECT
            id,
            section_name,
            charge_type,
            description,
            quantity,
            quantity_breakdown_json,
            notes,
            additional_description,
            notes_guidance
          FROM submission_items
          WHERE submission_id = ?
          ORDER BY id ASC
        `,
      )
      .all(submission.id) as AdminSubmissionItem[];

    const photos = db
      .prepare(
        `
          SELECT
            id,
            original_name,
            stored_name,
            relative_path,
            mime_type,
            size_bytes,
            linked_template_id,
            linked_section_name,
            linked_description
          FROM submission_photos
          WHERE submission_id = ?
          ORDER BY id ASC
        `,
      )
      .all(submission.id) as AdminSubmissionPhoto[];

    return {
      recordType: "ev",
      submission: {
        ...submission,
        record_type: "ev",
      },
      items,
      photos,
    } satisfies AdminEvSubmissionDetail;
  }

  return getSsraDetail(reference);
}

export function getAdminPhotoById(photoId: number) {
  const db = getDb();
  return db
    .prepare(
      `
        SELECT
          id,
          original_name,
          stored_name,
          relative_path,
          mime_type
        FROM submission_photos
        WHERE id = ?
      `,
    )
    .get(photoId) as
    | {
        id: number;
        original_name: string;
        stored_name: string;
        relative_path: string;
        mime_type: string;
      }
    | undefined;
}

export function getAdminSsraAttachmentById(attachmentId: number) {
  const db = getDb();
  return db
    .prepare(
      `
        SELECT
          id,
          original_name,
          stored_name,
          relative_path,
          mime_type
        FROM ssra_attachments
        WHERE id = ?
      `,
    )
    .get(attachmentId) as
    | {
        id: number;
        original_name: string;
        stored_name: string;
        relative_path: string;
        mime_type: string;
      }
    | undefined;
}

export function getAdminStoredFile(kind: "pdf" | "csv", reference: string) {
  const db = getDb();
  const fileColumn = kind === "pdf" ? "pdf_path" : "csv_path";
  const evRow = db
    .prepare(
      `
        SELECT
          reference,
          ${fileColumn} as file_path
        FROM submissions
        WHERE reference = ?
      `,
    )
    .get(reference) as { reference: string; file_path: string | null } | undefined;

  if (evRow?.file_path) {
    return {
      reference: evRow.reference,
      filePath: evRow.file_path,
      filename: path.basename(evRow.file_path),
    };
  }

  if (kind === "csv") {
    return null;
  }

  const ssraRow = db
    .prepare(
      `
        SELECT
          reference,
          pdf_path as file_path
        FROM ssra_submissions
        WHERE reference = ?
      `,
    )
    .get(reference) as { reference: string; file_path: string | null } | undefined;

  if (!ssraRow?.file_path) {
    return null;
  }

  return {
    reference: ssraRow.reference,
    filePath: ssraRow.file_path,
    filename: path.basename(ssraRow.file_path),
  };
}
