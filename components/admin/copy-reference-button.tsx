"use client";

import { useState } from "react";

type CopyReferenceButtonProps = {
  reference: string;
};

export function CopyReferenceButton({ reference }: CopyReferenceButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(reference);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded-full border border-[var(--brand-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--brand-navy)] transition hover:border-[var(--brand-navy)]"
    >
      {copied ? "Copied" : "Copy reference"}
    </button>
  );
}
