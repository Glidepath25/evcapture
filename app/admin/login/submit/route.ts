import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, getAdminCookieOptions, getAdminCookieValue, getAdminPassword, getSafeAdminPath } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const formData = await request.formData();
  const password = String(formData.get("password") ?? "");
  const nextPath = getSafeAdminPath(String(formData.get("next") ?? "/admin"));
  const configuredPassword = getAdminPassword();

  if (!configuredPassword) {
    return NextResponse.redirect(new URL(`/admin/login?error=missing-config&next=${encodeURIComponent(nextPath)}`, request.url));
  }

  if (password !== configuredPassword) {
    return NextResponse.redirect(new URL(`/admin/login?error=invalid&next=${encodeURIComponent(nextPath)}`, request.url));
  }

  const response = NextResponse.redirect(new URL(nextPath, request.url));
  response.cookies.set(ADMIN_COOKIE_NAME, getAdminCookieValue(), getAdminCookieOptions());
  return response;
}
