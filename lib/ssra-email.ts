import nodemailer from "nodemailer";
import { Resend } from "resend";
import { getServerConfig } from "@/lib/config";
import { buildSubmissionArtifactBaseName, buildSubmissionSubject } from "@/lib/submission-artifacts";

type SsraEmailInput = {
  reference: string;
  project: string;
  eventDateTime: string;
  author: string;
  location: string;
  pdfBuffer: Buffer;
};

export async function sendSsraEmail(input: SsraEmailInput) {
  const config = getServerConfig();

  if (!config.destinationEmail) {
    throw new Error("DESTINATION_EMAIL is not configured.");
  }

  const subject = buildSubmissionSubject(input.project || "SSRA", "SSRA", input.eventDateTime || new Date().toISOString().slice(0, 10));
  const attachmentBaseName = buildSubmissionArtifactBaseName(input.project || "SSRA", "SSRA", input.eventDateTime || new Date().toISOString().slice(0, 10));
  const textBody = [
    "A new Site Specific Risk Assessment has been received.",
    "",
    `Reference: ${input.reference}`,
    `Project: ${input.project || "-"}`,
    `Author: ${input.author || "-"}`,
    `Date & time: ${input.eventDateTime || "-"}`,
    `Location: ${input.location || "-"}`,
  ].join("\n");

  if (config.emailProvider.toLowerCase() === "resend") {
    if (!config.resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured.");
    }

    const resend = new Resend(config.resendApiKey);
    await resend.emails.send({
      from: config.emailFrom,
      to: [config.destinationEmail],
      cc: config.ccEmail ? [config.ccEmail] : undefined,
      subject,
      text: textBody,
      attachments: [
        {
          filename: `${attachmentBaseName}.pdf`,
          content: input.pdfBuffer.toString("base64"),
        },
      ],
    });
    return;
  }

  if (!config.smtpHost || !config.smtpUser || !config.smtpPassword) {
    throw new Error("SMTP settings are incomplete.");
  }

  const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPassword,
    },
  });

  await transporter.sendMail({
    from: config.emailFrom,
    to: config.destinationEmail,
    cc: config.ccEmail || undefined,
    subject,
    text: textBody,
    attachments: [
      {
        filename: `${attachmentBaseName}.pdf`,
        content: input.pdfBuffer,
      },
    ],
  });
}
