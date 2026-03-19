import path from "node:path";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME, isValidAdminCookie } from "@/lib/admin-auth";
import { getAdminSsraAttachmentById } from "@/lib/admin-data";
import { readStoredFile } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AttachmentRouteProps = {
  params: Promise<{
    attachmentId: string;
  }>;
};

export async function GET(_: Request, { params }: AttachmentRouteProps) {
  const cookieStore = await cookies();

  if (!isValidAdminCookie(cookieStore.get(ADMIN_COOKIE_NAME)?.value)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { attachmentId } = await params;
  const attachment = getAdminSsraAttachmentById(Number(attachmentId));

  if (!attachment) {
    return NextResponse.json({ error: "Attachment not found." }, { status: 404 });
  }

  try {
    const fileBuffer = await readStoredFile(attachment.relative_path);
    return new NextResponse(fileBuffer, {
      headers: {
        "content-type": attachment.mime_type,
        "content-disposition": `inline; filename="${path.basename(attachment.stored_name)}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Attachment file not found." }, { status: 404 });
  }
}
