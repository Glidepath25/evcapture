import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { getServerConfig } from "@/lib/config";

let database: Database.Database | null = null;

function initialise(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference TEXT NOT NULL UNIQUE,
      project TEXT NOT NULL,
      surveyor_name TEXT NOT NULL,
      survey_date TEXT NOT NULL,
      site_location TEXT NOT NULL DEFAULT '',
      general_comments TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      email_status TEXT NOT NULL DEFAULT 'pending',
      email_error TEXT,
      pdf_path TEXT,
      csv_path TEXT,
      photo_count INTEGER NOT NULL DEFAULT 0,
      client_ip TEXT NOT NULL DEFAULT '',
      user_agent TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'received'
    );

    CREATE TABLE IF NOT EXISTS submission_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      submission_id INTEGER NOT NULL,
      template_id TEXT NOT NULL,
      section_name TEXT NOT NULL,
      charge_type TEXT NOT NULL,
      description TEXT NOT NULL,
      additional_description TEXT NOT NULL DEFAULT '',
      notes_guidance TEXT NOT NULL DEFAULT '',
      quantity REAL,
      notes TEXT NOT NULL DEFAULT '',
      FOREIGN KEY(submission_id) REFERENCES submissions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS submission_photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      submission_id INTEGER NOT NULL,
      original_name TEXT NOT NULL,
      stored_name TEXT NOT NULL,
      relative_path TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      FOREIGN KEY(submission_id) REFERENCES submissions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS submission_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      submission_reference TEXT,
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      context_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rate_limits (
      ip TEXT PRIMARY KEY,
      window_started_at TEXT NOT NULL,
      count INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON submissions(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_submission_items_submission_id ON submission_items(submission_id);
    CREATE INDEX IF NOT EXISTS idx_submission_photos_submission_id ON submission_photos(submission_id);
    CREATE INDEX IF NOT EXISTS idx_submission_logs_reference ON submission_logs(submission_reference);
  `);
}

export function getDb() {
  if (database) {
    return database;
  }

  const dbPath = path.resolve(process.cwd(), getServerConfig().databaseFile);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  database = new Database(dbPath);
  database.pragma("journal_mode = WAL");
  initialise(database);
  return database;
}

export function writeLog(level: "info" | "warn" | "error", message: string, submissionReference?: string, context?: Record<string, unknown>) {
  const db = getDb();
  db.prepare(
    `
      INSERT INTO submission_logs (submission_reference, level, message, context_json, created_at)
      VALUES (@submissionReference, @level, @message, @contextJson, @createdAt)
    `,
  ).run({
    submissionReference: submissionReference ?? null,
    level,
    message,
    contextJson: JSON.stringify(context ?? {}),
    createdAt: new Date().toISOString(),
  });
}
