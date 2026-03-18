import fs from "node:fs";
import path from "node:path";
import { getServerConfig } from "@/lib/config";
import { sanitizeFilename, slugify } from "@/lib/utils";
import type { StoredPhoto } from "@/types";

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

function resolveRoot(relativeRoot: string) {
  return path.resolve(process.cwd(), relativeRoot);
}

function ensureDir(dirPath: string) {
  fs.mkdirSync(dirPath, { recursive: true });
}

export async function saveUploadedPhotos(reference: string, files: File[]) {
  const uploadRoot = resolveRoot(getServerConfig().uploadRoot);
  const targetDir = path.join(uploadRoot, slugify(reference));
  ensureDir(targetDir);

  const storedPhotos: StoredPhoto[] = [];

  for (const [index, file] of files.entries()) {
    const fileExtension = path.extname(file.name).toLowerCase();
    const fallbackExtension = (MIME_EXTENSION_MAP[file.type] ?? fileExtension) || ".bin";
    const sanitised = sanitizeFilename(file.name);
    const baseName = path.basename(sanitised, path.extname(sanitised));
    const storedName = `${String(index + 1).padStart(2, "0")}-${baseName}${fallbackExtension}`;
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
    });
  }

  return storedPhotos;
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
