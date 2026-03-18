import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME, isValidAdminCookie } from "@/lib/admin-auth";
import { getAdminStoredFile } from "@/lib/admin-data";
import { readStoredFile } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type FileRouteProps = {
  params: Promise<{
    kind: string;
    reference: string;
  }>;
};

const CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  csv: "text/csv; charset=utf-8",
};

export async function GET(_: Request, { params }: FileRouteProps) {
  const cookieStore = await cookies();

  if (!isValidAdminCookie(cookieStore.get(ADMIN_COOKIE_NAME)?.value)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { kind, reference } = await params;

  if (kind !== "pdf" && kind !== "csv") {
    return NextResponse.json({ error: "Unsupported file type." }, { status: 404 });
  }

  const storedFile = getAdminStoredFile(kind, reference);

  if (!storedFile) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  try {
    const fileBuffer = await readStoredFile(storedFile.filePath);
    return new NextResponse(fileBuffer, {
      headers: {
        "content-type": CONTENT_TYPES[kind],
        "content-disposition": `attachment; filename="${storedFile.filename}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Stored file could not be read." }, { status: 404 });
  }
}
