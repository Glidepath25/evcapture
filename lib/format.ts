const gbDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Europe/London",
});

const gbDateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/London",
});

export function formatSurveyDate(value: string) {
  if (!value) {
    return "";
  }

  const date = new Date(`${value}T12:00:00`);
  return gbDateFormatter.format(date);
}

export function formatSubmissionTimestamp(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return gbDateTimeFormatter.format(date);
}

export function todayIsoDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
