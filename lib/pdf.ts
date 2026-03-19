import fs from "node:fs/promises";
import PDFDocument from "pdfkit";
import sharp from "sharp";
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
  doc.text("Qty", PAGE_MARGIN + 345, startY + 7, { width: 95 });
  doc.text("Notes", PAGE_MARGIN + 445, startY + 7, { width: 110 });
}

function rowHeight(doc: PDFKit.PDFDocument, description: string, quantity: string, notes: string) {
  const height = Math.max(
    doc.heightOfString(description, { width: 230 }),
    doc.heightOfString(quantity, { width: 95 }),
    doc.heightOfString(notes || "-", { width: 110 }),
    18,
  );
  return height + 16;
}

function buildPdfQuantityText(item: NormalizedLineItem) {
  if (item.quantityOptions && item.quantityOptions.length > 0) {
    return item.quantityOptions
      .map((option) => `${option.label}: ${option.quantity === null ? "-" : option.quantity}`)
      .join("\n");
  }

  return item.quantityDisplay || "-";
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

async function prepareEmbeddedPhoto(photo: StoredPhoto) {
  try {
    const sourceBuffer = await fs.readFile(photo.absolutePath);
    return await sharp(sourceBuffer).rotate().resize({ width: 1400, height: 1400, fit: "inside", withoutEnlargement: true }).jpeg({
      quality: 72,
      mozjpeg: true,
    }).toBuffer();
  } catch {
    return null;
  }
}

function ensurePhotoPageSpace(doc: PDFKit.PDFDocument, requiredHeight: number) {
  if (doc.y + requiredHeight > doc.page.height - PAGE_MARGIN) {
    doc.addPage({ margin: PAGE_MARGIN });
  }
}

async function renderPhotoGallery(doc: PDFKit.PDFDocument, photos: StoredPhoto[]) {
  doc.addPage({ margin: PAGE_MARGIN });
  doc.fillColor("#10315a").font("Helvetica-Bold").fontSize(18).text("Embedded Photos");
  doc.moveDown(0.4);
  doc.fillColor("#40566f").font("Helvetica").fontSize(10).text("Photos are embedded below where PDF rendering allowed them to be processed safely.");
  doc.moveDown(0.8);

  if (photos.length === 0) {
    doc.fillColor("#1f2f3d").font("Helvetica").fontSize(11).text("No photos were uploaded with this submission.");
    return;
  }

  const cellWidth = 245;
  const imageHeight = 155;
  const captionHeight = 42;
  const rowHeight = imageHeight + captionHeight + 24;
  const rightColumnX = PAGE_MARGIN + cellWidth + 24;
  let currentGroup = "";
  let column = 0;

  for (const photo of photos) {
    const groupLabel = photo.linkedTemplateId ? `${photo.linkedSectionName}: ${photo.linkedDescription}` : "General site photos";

    if (groupLabel !== currentGroup) {
      if (column !== 0) {
        column = 0;
        doc.y += rowHeight;
      }

      ensurePhotoPageSpace(doc, 50);
      doc.fillColor("#10315a").font("Helvetica-Bold").fontSize(12).text(groupLabel);
      doc.moveDown(0.3);
      currentGroup = groupLabel;
    }

    ensurePhotoPageSpace(doc, rowHeight);

    const x = column === 0 ? PAGE_MARGIN : rightColumnX;
    const y = doc.y;
    const embeddedBuffer = await prepareEmbeddedPhoto(photo);

    doc.roundedRect(x, y, cellWidth, rowHeight - 8, 12).strokeColor("#d5deea").stroke();
    if (embeddedBuffer) {
      doc.image(embeddedBuffer, x + 8, y + 8, { fit: [cellWidth - 16, imageHeight], align: "center", valign: "center" });
    } else {
      doc.fillColor("#8aa0b7").font("Helvetica").fontSize(10).text("Preview unavailable", x + 8, y + 70, {
        width: cellWidth - 16,
        align: "center",
      });
    }

    doc.fillColor("#1f2f3d").font("Helvetica-Bold").fontSize(9).text(photo.originalName, x + 8, y + imageHeight + 14, {
      width: cellWidth - 16,
      ellipsis: true,
    });
    doc.fillColor("#5f7288").font("Helvetica").fontSize(8).text(photo.storedName, x + 8, y + imageHeight + 28, {
      width: cellWidth - 16,
      ellipsis: true,
    });

    if (column === 1) {
      column = 0;
      doc.y = y + rowHeight;
    } else {
      column = 1;
    }
  }
}

async function renderSubmissionPdf(doc: PDFKit.PDFDocument, input: PdfInput) {
  addHeader(doc, input);

  addFieldBlock(doc, "Submitted", formatSubmissionTimestamp(input.createdAt), PAGE_MARGIN, 96, 165);
  addFieldBlock(doc, "Project", input.project, PAGE_MARGIN + 180, 96, 165);
  addFieldBlock(doc, "Survey Date", formatSurveyDate(input.surveyDate), PAGE_MARGIN + 360, 96, 155);
  addFieldBlock(doc, "Surveyor", input.surveyorName, PAGE_MARGIN, 146, 250);
  addFieldBlock(doc, "Site Location", input.siteLocation || "-", PAGE_MARGIN + 265, 146, 250);
  addFieldBlock(doc, "Type of Survey", input.surveyType, PAGE_MARGIN, 182, 250);

  doc.fillColor("#10315a").font("Helvetica-Bold").fontSize(11).text("General Comments", PAGE_MARGIN, 236);
  doc.fillColor("#1f2f3d").font("Helvetica").fontSize(10).text(input.generalComments || "No general comments supplied.", PAGE_MARGIN, 253, {
    width: doc.page.width - PAGE_MARGIN * 2,
  });

  let currentY = Math.max(doc.y + 20, 316);
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
    const quantityText = buildPdfQuantityText(item);
    const height = rowHeight(doc, descriptionText, quantityText, item.notes || "-");

    if (currentY + height > doc.page.height - PAGE_MARGIN) {
      doc.addPage({ margin: PAGE_MARGIN });
      addTableHeader(doc, PAGE_MARGIN);
      currentY = PAGE_MARGIN + 24;
    }

    doc.rect(PAGE_MARGIN, currentY, doc.page.width - PAGE_MARGIN * 2, height).strokeColor("#d5deea").stroke();
    doc.fillColor("#1f2f3d").font("Helvetica").fontSize(9);
    doc.text(item.chargeType, PAGE_MARGIN + 8, currentY + 8, { width: 95 });
    doc.text(descriptionText, PAGE_MARGIN + 110, currentY + 8, { width: 230 });
    doc.text(quantityText, PAGE_MARGIN + 345, currentY + 8, { width: 95 });
    doc.text(item.notes || "-", PAGE_MARGIN + 445, currentY + 8, { width: 110 });
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

  await renderPhotoGallery(doc, input.photos);
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
      await renderSubmissionPdf(doc, input);
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
