import path from "node:path";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function sanitizeFilename(filename: string) {
  const ext = path.extname(filename);
  const base = path.basename(filename, ext);
  const safeBase = base.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
  const safeExt = ext.replace(/[^a-zA-Z0-9.]+/g, "").toLowerCase();
  return `${safeBase || "upload"}${safeExt}`;
}

export function makeReference() {
  return makeTypedReference("GPS");
}

export function makeTypedReference(prefix: string) {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${datePart}-${randomPart}`;
}

export function bytesToMegabytes(bytes: number) {
  return Math.round((bytes / (1024 * 1024)) * 100) / 100;
}

export function normaliseMultiline(input: string) {
  return input.replace(/\r\n/g, "\n").trim();
}
