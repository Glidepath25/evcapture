import fs from "node:fs";
import path from "node:path";
import { SURVEY_TEMPLATE } from "@/data/survey-template";
import { getServerConfig } from "@/lib/config";
import { sanitizeFilename, slugify } from "@/lib/utils";
import type { PhotoLinkInput, StoredAttachment, StoredPhoto } from "@/types";

const MIME_EXTENSION_MAP: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/heic": ".heic",
  "image/heif": ".heif",
};

export const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

export const SUPPORTED_ATTACHMENT_TYPES = [
  ...SUPPORTED_IMAGE_TYPES,
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

function resolveRoot(relativeRoot: string) {
  return path.resolve(process.cwd(), relativeRoot);
}

function ensureDir(dirPath: string) {
  fs.mkdirSync(dirPath, { recursive: true });
}

const templateLookup = new Map(
  SURVEY_TEMPLATE.map((row) => [
    row.id,
    {
      section: row.section,
      description: row.description,
    },
  ]),
);

export async function saveUploadedPhotos(reference: string, files: File[], photoLinks: PhotoLinkInput[]) {
  const uploadRoot = resolveRoot(getServerConfig().uploadRoot);
  const targetDir = path.join(uploadRoot, slugify(reference));
  ensureDir(targetDir);

  const storedPhotos: StoredPhoto[] = [];

  for (const [index, file] of files.entries()) {
    const linkedTemplateId = photoLinks[index]?.linkedTemplateId ?? null;
    const linkedRow = linkedTemplateId ? templateLookup.get(linkedTemplateId) : null;
    const fileExtension = path.extname(file.name).toLowerCase();
    const fallbackExtension = (MIME_EXTENSION_MAP[file.type] ?? fileExtension) || ".bin";
    const sanitised = sanitizeFilename(file.name);
    const baseName = path.basename(sanitised, path.extname(sanitised));
    const sectionPrefix = linkedTemplateId ? slugify(linkedTemplateId) : "general";
    const storedName = `${String(index + 1).padStart(2, "0")}-${sectionPrefix}-${baseName}${fallbackExtension}`;
    const absolutePath = path.join(targetDir, storedName);
    const relativePath = path.relative(process.cwd(), absolutePath).replace(/\\/g, "/");
    const buffer = Buffer.from(await file.arrayBuffer());

    await fs.promises.writeFile(absolutePath, buffer);

    storedPhotos.push({
      originalName: file.name,
      storedName,
      relativePath,
      absolutePath,
      mimeType: file.type,
      sizeBytes: buffer.length,
      linkedTemplateId,
      linkedSectionName: linkedRow?.section ?? "General",
      linkedDescription: linkedRow?.description ?? "Site-wide photo",
    });
  }

  return storedPhotos;
}

export async function removeStoredFiles(relativePaths: string[]) {
  await Promise.all(
    relativePaths.map(async (relativePath) => {
      try {
        await fs.promises.unlink(path.resolve(process.cwd(), relativePath));
      } catch {
        // Ignore missing files during attachment replacement.
      }
    }),
  );
}

export async function saveSsraAttachments(
  reference: string,
  files: File[],
  attachmentLinks: Array<{ sectionKey: string; questionKey: string }>,
) {
  const uploadRoot = resolveRoot(getServerConfig().uploadRoot);
  const targetDir = path.join(uploadRoot, "ssra", slugify(reference));
  ensureDir(targetDir);

  const storedAttachments: StoredAttachment[] = [];

  for (const [index, file] of files.entries()) {
    const link = attachmentLinks[index];
    const sectionPrefix = slugify(link?.sectionKey ?? "general");
    const questionPrefix = slugify(link?.questionKey ?? "attachment");
    const fileExtension = path.extname(file.name).toLowerCase();
    const fallbackExtension = (MIME_EXTENSION_MAP[file.type] ?? fileExtension) || ".bin";
    const sanitised = sanitizeFilename(file.name);
    const baseName = path.basename(sanitised, path.extname(sanitised));
    const storedName = `${String(index + 1).padStart(2, "0")}-${sectionPrefix}-${questionPrefix}-${baseName}${fallbackExtension}`;
    const absolutePath = path.join(targetDir, storedName);
    const relativePath = path.relative(process.cwd(), absolutePath).replace(/\\/g, "/");
    const buffer = Buffer.from(await file.arrayBuffer());

    await fs.promises.writeFile(absolutePath, buffer);

    storedAttachments.push({
      originalName: file.name,
      storedName,
      relativePath,
      absolutePath,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: buffer.length,
      sectionKey: link?.sectionKey ?? "general",
      questionKey: link?.questionKey ?? "attachment",
    });
  }

  return storedAttachments;
}

export async function saveGeneratedFile(reference: string, filename: string, buffer: Buffer) {
  const generatedRoot = resolveRoot(getServerConfig().generatedRoot);
  const targetDir = path.join(generatedRoot, slugify(reference));
  ensureDir(targetDir);

  const absolutePath = path.join(targetDir, filename);
  const relativePath = path.relative(process.cwd(), absolutePath).replace(/\\/g, "/");
  await fs.promises.writeFile(absolutePath, buffer);

  return {
    absolutePath,
    relativePath,
  };
}

export async function readStoredFile(relativePath: string) {
  const absolutePath = path.resolve(process.cwd(), relativePath);
  return fs.promises.readFile(absolutePath);
}
