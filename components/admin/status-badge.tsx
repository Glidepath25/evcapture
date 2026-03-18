type StatusBadgeProps = {
  value: string | null | undefined;
};

const STATUS_STYLES: Record<string, string> = {
  complete: "bg-emerald-100 text-emerald-800",
  completed: "bg-emerald-100 text-emerald-800",
  sent: "bg-emerald-100 text-emerald-800",
  pending: "bg-amber-100 text-amber-800",
  failed: "bg-rose-100 text-rose-800",
  received: "bg-slate-100 text-slate-700",
};

export function StatusBadge({ value }: StatusBadgeProps) {
  const normalised = (value ?? "unknown").toLowerCase();
  const classes = STATUS_STYLES[normalised] ?? "bg-slate-100 text-slate-700";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${classes}`}>
      {value ?? "Unknown"}
    </span>
  );
}
