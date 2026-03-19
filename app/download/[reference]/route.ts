import path from "node:path";
import { NextResponse } from "next/server";
import { readStoredFile } from "@/lib/storage";
import { getSsraDownload } from "@/lib/ssra-service";
import { getSubmissionPdf } from "@/lib/submission-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteProps = {
  params: Promise<{
    reference: string;
  }>;
};

export async function GET(_: Request, { params }: RouteProps) {
  const { reference } = await params;
  const submission = getSubmissionPdf(reference) ?? getSsraDownload(reference);

  if (!submission?.pdf_path) {
    return NextResponse.json({ error: "PDF not found." }, { status: 404 });
  }

  const fileBuffer = await readStoredFile(submission.pdf_path);
  return new NextResponse(fileBuffer, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${path.basename(submission.pdf_path)}"`,
    },
  });
}
