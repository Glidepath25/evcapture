function numberFromEnv(name: string, fallback: number) {
  const raw = process.env[name];
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function booleanFromEnv(name: string, fallback: boolean) {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  return raw.toLowerCase() === "true";
}

export function getServerConfig() {
  return {
    appBaseUrl: process.env.APP_BASE_URL ?? "http://localhost:3000",
    databaseFile: process.env.DATABASE_FILE ?? "./storage/app.db",
    uploadRoot: process.env.UPLOAD_ROOT ?? "./storage/uploads",
    generatedRoot: process.env.GENERATED_ROOT ?? "./storage/generated",
    destinationEmail: process.env.DESTINATION_EMAIL ?? "",
    ccEmail: process.env.CC_EMAIL ?? "",
    emailFrom: process.env.EMAIL_FROM ?? "Glidepath Surveys <surveys@example.com>",
    emailProvider: process.env.EMAIL_PROVIDER ?? "resend",
    resendApiKey: process.env.RESEND_API_KEY ?? "",
    smtpHost: process.env.SMTP_HOST ?? "",
    smtpPort: numberFromEnv("SMTP_PORT", 587),
    smtpSecure: booleanFromEnv("SMTP_SECURE", false),
    smtpUser: process.env.SMTP_USER ?? "",
    smtpPassword: process.env.SMTP_PASSWORD ?? "",
    rateLimitWindowMinutes: numberFromEnv("RATE_LIMIT_WINDOW_MINUTES", 15),
    rateLimitMaxSubmissions: numberFromEnv("RATE_LIMIT_MAX_SUBMISSIONS", 5),
    maxUploadMb: numberFromEnv("MAX_UPLOAD_MB", 8),
    maxUploadCount: numberFromEnv("MAX_UPLOAD_COUNT", 8),
  };
}
