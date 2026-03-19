import path from "node:path";
import { getDb } from "@/lib/db";

const ADMIN_PAGE_SIZE = 50;

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
};

export type AdminSubmissionSummary = {
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

export type AdminSubmissionDetail = {
  submission: AdminSubmissionSummary;
  items: AdminSubmissionItem[];
  photos: AdminSubmissionPhoto[];
};

export type AdminStats = {
  totalSubmissions: number;
  failedEmails: number;
  pendingPdfs: number;
};

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
          site_location
        FROM submissions
        ${whereSql}
        ORDER BY datetime(created_at) DESC
        LIMIT @limit OFFSET @offset
      `,
    )
    .all({
      ...params,
      limit: ADMIN_PAGE_SIZE,
      offset,
    }) as AdminSubmissionListItem[];

  const totalRow = db
    .prepare(`SELECT COUNT(*) as total FROM submissions ${whereSql}`)
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

  const total = db.prepare("SELECT COUNT(*) as total FROM submissions").get() as { total: number };
  const failedEmails = db
    .prepare("SELECT COUNT(*) as total FROM submissions WHERE email_status = 'failed'")
    .get() as { total: number };
  const pendingPdfs = db
    .prepare("SELECT COUNT(*) as total FROM submissions WHERE pdf_status = 'pending'")
    .get() as { total: number };

  return {
    totalSubmissions: total.total,
    failedEmails: failedEmails.total,
    pendingPdfs: pendingPdfs.total,
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
    .get(reference) as AdminSubmissionSummary | undefined;

  if (!submission) {
    return null;
  }

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
    submission,
    items,
    photos,
  } satisfies AdminSubmissionDetail;
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

export function getAdminStoredFile(kind: "pdf" | "csv", reference: string) {
  const db = getDb();
  const fileColumn = kind === "pdf" ? "pdf_path" : "csv_path";
  const row = db
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

  if (!row?.file_path) {
    return null;
  }

  return {
    reference: row.reference,
    filePath: row.file_path,
    filename: path.basename(row.file_path),
  };
}
