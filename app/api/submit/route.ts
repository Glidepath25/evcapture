import { NextResponse } from "next/server";
import { processSubmission } from "@/lib/submission-service";
import type { EditableLineItem, PhotoLinkInput } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getIpAddress(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const itemsPayload = formData.get("items");
    if (typeof itemsPayload !== "string") {
      return NextResponse.json({ error: "Line items payload is missing." }, { status: 400 });
    }

    const rawItems = JSON.parse(itemsPayload) as EditableLineItem[];
    const rawPhotoLinks = JSON.parse(String(formData.get("photoLinks") ?? "[]")) as PhotoLinkInput[];
    const photos = formData.getAll("photos").filter((entry): entry is File => entry instanceof File);
    const result = await processSubmission({
      metadata: {
        project: String(formData.get("project") ?? ""),
        surveyorName: String(formData.get("surveyorName") ?? ""),
        surveyDate: String(formData.get("surveyDate") ?? ""),
        siteLocation: String(formData.get("siteLocation") ?? ""),
        generalComments: String(formData.get("generalComments") ?? ""),
      },
      items: rawItems,
      photos,
      photoLinks: rawPhotoLinks,
      honeypotValue: String(formData.get("companyWebsite") ?? ""),
      ipAddress: getIpAddress(request),
      userAgent: request.headers.get("user-agent") ?? "",
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Submission failed.";
    const status = message.includes("Too many submissions") ? 429 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
