import { NextResponse } from "next/server";
import { getSsraDraft, saveSsra } from "@/lib/ssra-service";
import type { SsraAttachmentInput, SsraFormData } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getIpAddress(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const reference = searchParams.get("reference")?.trim();

  if (!reference) {
    return NextResponse.json({ error: "Reference is required." }, { status: 400 });
  }

  const draft = getSsraDraft(reference);
  if (!draft) {
    return NextResponse.json({ error: "SSRA draft not found." }, { status: 404 });
  }

  return NextResponse.json(draft);
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const mode = String(formData.get("mode") ?? "draft") === "submit" ? "submit" : "draft";
    const payload = formData.get("payload");
    const attachmentLinksPayload = formData.get("attachmentLinks");

    if (typeof payload !== "string") {
      return NextResponse.json({ error: "SSRA payload is missing." }, { status: 400 });
    }

    const ssraFormData = JSON.parse(payload) as SsraFormData;
    const attachmentLinks = JSON.parse(String(attachmentLinksPayload ?? "[]")) as SsraAttachmentInput[];
    const files = formData.getAll("attachments").filter((entry): entry is File => entry instanceof File);

    const result = await saveSsra({
      mode,
      reference: String(formData.get("reference") ?? "").trim() || undefined,
      formData: ssraFormData,
      attachments: files,
      attachmentLinks,
      honeypotValue: String(formData.get("companyWebsite") ?? ""),
      ipAddress: getIpAddress(request),
      userAgent: request.headers.get("user-agent") ?? "",
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "SSRA request failed.";
    const status = message.includes("Too many submissions") ? 429 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
