import path from "node:path";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME, isValidAdminCookie } from "@/lib/admin-auth";
import { getAdminPhotoById } from "@/lib/admin-data";
import { readStoredFile } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PhotoRouteProps = {
  params: Promise<{
    photoId: string;
  }>;
};

export async function GET(_: Request, { params }: PhotoRouteProps) {
  const cookieStore = await cookies();

  if (!isValidAdminCookie(cookieStore.get(ADMIN_COOKIE_NAME)?.value)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { photoId } = await params;
  const photo = getAdminPhotoById(Number(photoId));

  if (!photo) {
    return NextResponse.json({ error: "Photo not found." }, { status: 404 });
  }

  try {
    const fileBuffer = await readStoredFile(photo.relative_path);
    return new NextResponse(fileBuffer, {
      headers: {
        "content-type": photo.mime_type,
        "content-disposition": `inline; filename="${path.basename(photo.stored_name)}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Photo file not found." }, { status: 404 });
  }
}
