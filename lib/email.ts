import nodemailer from "nodemailer";
import { Resend } from "resend";
import { getServerConfig } from "@/lib/config";
import { buildSubmissionArtifactBaseName, buildSubmissionSubject } from "@/lib/submission-artifacts";
import type { SubmissionMetadata } from "@/types";

type EmailInput = SubmissionMetadata & {
  reference: string;
  pdfBuffer: Buffer;
  csvBuffer: Buffer;
};

export async function sendSubmissionEmail(input: EmailInput) {
  const config = getServerConfig();

  if (!config.destinationEmail) {
    throw new Error("DESTINATION_EMAIL is not configured.");
  }

  const subject = buildSubmissionSubject(input.project, input.surveyType, input.surveyDate);
  const attachmentBaseName = buildSubmissionArtifactBaseName(input.project, input.surveyType, input.surveyDate);
  const textBody = [
    "A new Glidepath site survey submission has been received.",
    "",
    `Reference: ${input.reference}`,
    `Project: ${input.project}`,
    `Type of survey: ${input.surveyType}`,
    `Surveyor: ${input.surveyorName}`,
    `Survey date: ${input.surveyDate}`,
    `Site location: ${input.siteLocation || "-"}`,
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
          filename: `${attachmentBaseName}.csv`,
          content: input.csvBuffer.toString("base64"),
        },
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
        filename: `${attachmentBaseName}.csv`,
        content: input.csvBuffer,
      },
      {
        filename: `${attachmentBaseName}.pdf`,
        content: input.pdfBuffer,
      },
    ],
  });
}
