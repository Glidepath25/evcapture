import PDFDocument from "pdfkit";
import { formatSubmissionTimestamp, formatSurveyDate } from "@/lib/format";
import type { NormalizedLineItem, StoredPhoto, SubmissionMetadata } from "@/types";

type PdfInput = SubmissionMetadata & {
  reference: string;
  createdAt: string;
  items: NormalizedLineItem[];
  photos: StoredPhoto[];
};

const PAGE_MARGIN = 40;

function pipeToBuffer(doc: PDFKit.PDFDocument) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

function addHeader(doc: PDFKit.PDFDocument, input: PdfInput) {
  doc.fillColor("#10315a").font("Helvetica-Bold").fontSize(22).text("Glidepath Solutions", PAGE_MARGIN, 34);
  doc.fillColor("#40566f").font("Helvetica").fontSize(10).text(`Site Survey Submission ${input.reference}`, PAGE_MARGIN, 62);
  doc.moveTo(PAGE_MARGIN, 80).lineTo(doc.page.width - PAGE_MARGIN, 80).strokeColor("#d5deea").stroke();
}

function addFieldBlock(doc: PDFKit.PDFDocument, label: string, value: string, x: number, y: number, width: number) {
  doc.fillColor("#10315a").font("Helvetica-Bold").fontSize(9).text(label.toUpperCase(), x, y, { width });
  doc.fillColor("#1f2f3d").font("Helvetica").fontSize(11).text(value || "-", x, y + 14, { width });
}

function addTableHeader(doc: PDFKit.PDFDocument, startY: number) {
  doc.rect(PAGE_MARGIN, startY, doc.page.width - PAGE_MARGIN * 2, 24).fill("#10315a");
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(9);
  doc.text("Charge Type", PAGE_MARGIN + 8, startY + 7, { width: 95 });
  doc.text("Description of Product/Service", PAGE_MARGIN + 110, startY + 7, { width: 230 });
  doc.text("Qty", PAGE_MARGIN + 345, startY + 7, { width: 40, align: "right" });
  doc.text("Notes", PAGE_MARGIN + 390, startY + 7, { width: 165 });
}

function rowHeight(doc: PDFKit.PDFDocument, description: string, quantity: string, notes: string) {
  const height = Math.max(
    doc.heightOfString(description, { width: 230 }),
    doc.heightOfString(quantity, { width: 40, align: "right" }),
    doc.heightOfString(notes || "-", { width: 165 }),
    18,
  );
  return height + 16;
}

function buildPhotoSummary(photos: StoredPhoto[]) {
  const groupedByLabel = new Map<string, string[]>();

  for (const photo of photos) {
    const label = photo.linkedTemplateId
      ? `${photo.linkedSectionName}: ${photo.linkedDescription}`
      : "General site photos";

    const current = groupedByLabel.get(label) ?? [];
    current.push(photo.storedName);
    groupedByLabel.set(label, current);
  }

  return Array.from(groupedByLabel.entries()).map(([label, filenames]) => ({
    label,
    count: filenames.length,
    filenames,
  }));
}

function renderSubmissionPdf(doc: PDFKit.PDFDocument, input: PdfInput) {
  addHeader(doc, input);

  addFieldBlock(doc, "Submitted", formatSubmissionTimestamp(input.createdAt), PAGE_MARGIN, 96, 165);
  addFieldBlock(doc, "Project", input.project, PAGE_MARGIN + 180, 96, 165);
  addFieldBlock(doc, "Survey Date", formatSurveyDate(input.surveyDate), PAGE_MARGIN + 360, 96, 155);
  addFieldBlock(doc, "Surveyor", input.surveyorName, PAGE_MARGIN, 146, 250);
  addFieldBlock(doc, "Site Location", input.siteLocation || "-", PAGE_MARGIN + 265, 146, 250);

  doc.fillColor("#10315a").font("Helvetica-Bold").fontSize(11).text("General Comments", PAGE_MARGIN, 200);
  doc.fillColor("#1f2f3d").font("Helvetica").fontSize(10).text(input.generalComments || "No general comments supplied.", PAGE_MARGIN, 217, {
    width: doc.page.width - PAGE_MARGIN * 2,
  });

  let currentY = Math.max(doc.y + 20, 280);
  addTableHeader(doc, currentY);
  currentY += 24;

  let currentSection = "";
  doc.font("Helvetica").fontSize(9).fillColor("#1f2f3d");

  for (const item of input.items) {
    if (item.section !== currentSection) {
      currentSection = item.section;
      if (currentY + 28 > doc.page.height - PAGE_MARGIN) {
        doc.addPage({ margin: PAGE_MARGIN });
        addTableHeader(doc, PAGE_MARGIN);
        currentY = PAGE_MARGIN + 24;
      }

      doc.rect(PAGE_MARGIN, currentY, doc.page.width - PAGE_MARGIN * 2, 20).fill("#e8eef6");
      doc.fillColor("#10315a").font("Helvetica-Bold").fontSize(10).text(item.section, PAGE_MARGIN + 8, currentY + 5);
      currentY += 20;
    }

    const descriptionParts = [item.description];
    if (item.additionalDescription) {
      descriptionParts.push(item.additionalDescription);
    }
    if (item.notesGuidance) {
      descriptionParts.push(`Notes guidance: ${item.notesGuidance}`);
    }

    const descriptionText = descriptionParts.join("\n\n");
    const height = rowHeight(doc, descriptionText, item.quantity?.toString() ?? "-", item.notes || "-");

    if (currentY + height > doc.page.height - PAGE_MARGIN) {
      doc.addPage({ margin: PAGE_MARGIN });
      addTableHeader(doc, PAGE_MARGIN);
      currentY = PAGE_MARGIN + 24;
    }

    doc.rect(PAGE_MARGIN, currentY, doc.page.width - PAGE_MARGIN * 2, height).strokeColor("#d5deea").stroke();
    doc.fillColor("#1f2f3d").font("Helvetica").fontSize(9);
    doc.text(item.chargeType, PAGE_MARGIN + 8, currentY + 8, { width: 95 });
    doc.text(descriptionText, PAGE_MARGIN + 110, currentY + 8, { width: 230 });
    doc.text(item.quantity === null ? "-" : item.quantity.toString(), PAGE_MARGIN + 345, currentY + 8, { width: 40, align: "right" });
    doc.text(item.notes || "-", PAGE_MARGIN + 390, currentY + 8, { width: 165 });
    currentY += height;
  }

  doc.addPage({ margin: PAGE_MARGIN });
  doc.fillColor("#10315a").font("Helvetica-Bold").fontSize(18).text("Photo Summary");
  doc.moveDown(0.8);

  const photoSummary = buildPhotoSummary(input.photos);
  if (photoSummary.length === 0) {
    doc.fillColor("#1f2f3d").font("Helvetica").fontSize(11).text("No photos were uploaded with this submission.");
    return;
  }

  for (const group of photoSummary) {
    if (doc.y + 80 > doc.page.height - PAGE_MARGIN) {
      doc.addPage({ margin: PAGE_MARGIN });
    }

    doc.fillColor("#10315a").font("Helvetica-Bold").fontSize(12).text(`${group.label} (${group.count})`);
    doc.moveDown(0.2);
    doc.fillColor("#1f2f3d").font("Helvetica").fontSize(10).text(group.filenames.join("\n"), {
      width: doc.page.width - PAGE_MARGIN * 2,
    });
    doc.moveDown(0.8);
  }
}

function buildEmergencyPdfBuffer(message: string) {
  const doc = new PDFDocument({
    margin: PAGE_MARGIN,
    size: "A4",
  });

  const bufferPromise = pipeToBuffer(doc);
  doc.font("Helvetica-Bold").fontSize(18).fillColor("#10315a").text("Glidepath Solutions");
  doc.moveDown(1);
  doc.font("Helvetica-Bold").fontSize(14).fillColor("#10315a").text("PDF generation fallback");
  doc.moveDown(0.5);
  doc.font("Helvetica").fontSize(11).fillColor("#1f2f3d").text(message);
  doc.end();
  return bufferPromise;
}

export async function buildSubmissionPdf(input: PdfInput) {
  try {
    const doc = new PDFDocument({
      margin: PAGE_MARGIN,
      size: "A4",
      bufferPages: true,
    });

    const bufferPromise = pipeToBuffer(doc);

    try {
      renderSubmissionPdf(doc, input);
    } finally {
      doc.end();
    }

    return await bufferPromise;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown PDF generation failure";

    try {
      return await buildEmergencyPdfBuffer(`The full PDF could not be generated. Error: ${message}`);
    } catch {
      return Buffer.from("");
    }
  }
}
