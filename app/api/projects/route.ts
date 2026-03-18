import { NextResponse } from "next/server";
import { getProjects } from "@/lib/projects";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ projects: getProjects() });
}
