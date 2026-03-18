import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServerConfig } from "@/lib/config";

export const ADMIN_COOKIE_NAME = "evcapture_admin";
const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 12;

function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function getAdminPassword() {
  return getServerConfig().adminPassword.trim();
}

export function isAdminConfigured() {
  return Boolean(getAdminPassword());
}

export function getAdminCookieValue() {
  const password = getAdminPassword();
  return password ? hashValue(password) : "";
}

export function isValidAdminCookie(cookieValue?: string | null) {
  const expected = getAdminCookieValue();
  return Boolean(expected) && cookieValue === expected;
}

export async function hasAdminSession() {
  const cookieStore = await cookies();
  return isValidAdminCookie(cookieStore.get(ADMIN_COOKIE_NAME)?.value);
}

export async function requireAdminSession() {
  if (!(await hasAdminSession())) {
    redirect("/admin/login");
  }
}

export async function redirectIfAdminSession(nextPath = "/admin") {
  if (await hasAdminSession()) {
    redirect(getSafeAdminPath(nextPath));
  }
}

export function getSafeAdminPath(candidate?: string | null) {
  if (!candidate || !candidate.startsWith("/admin")) {
    return "/admin";
  }

  if (candidate === "/admin/login") {
    return "/admin";
  }

  return candidate;
}

export function getAdminCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: ADMIN_COOKIE_MAX_AGE,
    path: "/admin",
  };
}
