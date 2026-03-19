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
const TABLE_HEADER_HEIGHT = 24;
const SECTION_HEADER_HEIGHT = 20;
const PHOTO_CARD_GAP = 12;
const PHOTO_CARD_HEIGHT = 198;
const PHOTO_IMAGE_HEIGHT = 142;

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

function addSectionHeader(doc: PDFKit.PDFDocument, startY: number, section: string) {
  doc.rect(PAGE_MARGIN, startY, doc.page.width - PAGE_MARGIN * 2, SECTION_HEADER_HEIGHT).fill("#e8eef6");
  doc.fillColor("#10315a").font("Helvetica-Bold").fontSize(10).text(section, PAGE_MARGIN + 8, startY + 5);
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

function estimatePhotoBlockHeight(photoCount: number) {
  if (photoCount === 0) {
    return 0;
  }

  const rows = Math.ceil(photoCount / 2);
  return 18 + 8 + rows * PHOTO_CARD_HEIGHT + Math.max(0, rows - 1) * PHOTO_CARD_GAP + 8;
}

async function renderInlinePhotoBlock(doc: PDFKit.PDFDocument, startY: number, photos: StoredPhoto[], title: string) {
  if (photos.length === 0) {
    return { nextY: startY, pageBreakUsed: false };
  }

  const pageBottom = doc.page.height - PAGE_MARGIN;
  const availableWidth = doc.page.width - PAGE_MARGIN * 2;
  const cardWidth = (availableWidth - PHOTO_CARD_GAP) / 2;
  let currentY = startY;
  let pageBreakUsed = false;

  const ensureSpace = (requiredHeight: number) => {
    if (currentY + requiredHeight > pageBottom) {
      doc.addPage({ margin: PAGE_MARGIN });
      currentY = PAGE_MARGIN;
      pageBreakUsed = true;
    }
  };

  ensureSpace(30);
  doc.fillColor("#10315a").font("Helvetica-Bold").fontSize(10).text(title, PAGE_MARGIN, currentY);
  currentY = doc.y + 6;

  for (let index = 0; index < photos.length; index += 2) {
    const rowPhotos = photos.slice(index, index + 2);
    ensureSpace(PHOTO_CARD_HEIGHT);

    const renderedBuffers = await Promise.all(rowPhotos.map((photo) => prepareEmbeddedPhoto(photo)));

    rowPhotos.forEach((photo, photoIndex) => {
      const x = PAGE_MARGIN + photoIndex * (cardWidth + PHOTO_CARD_GAP);
      const y = currentY;
      const embeddedBuffer = renderedBuffers[photoIndex];

      doc.roundedRect(x, y, cardWidth, PHOTO_CARD_HEIGHT, 12).strokeColor("#d5deea").stroke();
      if (embeddedBuffer) {
        doc.image(embeddedBuffer, x + 8, y + 8, { fit: [cardWidth - 16, PHOTO_IMAGE_HEIGHT], align: "center", valign: "center" });
      } else {
        doc.fillColor("#8aa0b7").font("Helvetica").fontSize(10).text("Preview unavailable", x + 8, y + 62, {
          width: cardWidth - 16,
          align: "center",
        });
      }

      doc.fillColor("#1f2f3d").font("Helvetica-Bold").fontSize(9).text(photo.originalName, x + 8, y + PHOTO_IMAGE_HEIGHT + 16, {
        width: cardWidth - 16,
        ellipsis: true,
      });
      doc.fillColor("#5f7288").font("Helvetica").fontSize(8).text(photo.storedName, x + 8, y + PHOTO_IMAGE_HEIGHT + 30, {
        width: cardWidth - 16,
        ellipsis: true,
      });
    });

    currentY += PHOTO_CARD_HEIGHT + PHOTO_CARD_GAP;
  }

  return { nextY: currentY, pageBreakUsed };
}

async function renderSubmissionPdf(doc: PDFKit.PDFDocument, input: PdfInput) {
  const generalPhotos = input.photos.filter((photo) => !photo.linkedTemplateId);

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
  if (generalPhotos.length > 0) {
    const generalPhotoBlock = await renderInlinePhotoBlock(doc, currentY, generalPhotos, `General Site Photos (${generalPhotos.length})`);
    currentY = generalPhotoBlock.nextY + 8;
  }

  if (currentY + TABLE_HEADER_HEIGHT > doc.page.height - PAGE_MARGIN) {
    doc.addPage({ margin: PAGE_MARGIN });
    currentY = PAGE_MARGIN;
  }

  addTableHeader(doc, currentY);
  currentY += TABLE_HEADER_HEIGHT;

  let currentSection = "";
  let repeatTableHeader = false;
  doc.font("Helvetica").fontSize(9).fillColor("#1f2f3d");

  for (const item of input.items) {
    if (repeatTableHeader) {
      if (currentY + TABLE_HEADER_HEIGHT + SECTION_HEADER_HEIGHT > doc.page.height - PAGE_MARGIN) {
        doc.addPage({ margin: PAGE_MARGIN });
        currentY = PAGE_MARGIN;
      }

      addTableHeader(doc, currentY);
      currentY += TABLE_HEADER_HEIGHT;
      addSectionHeader(doc, currentY, item.section);
      currentY += SECTION_HEADER_HEIGHT;
      currentSection = item.section;
      repeatTableHeader = false;
    }

    if (item.section !== currentSection) {
      currentSection = item.section;
      if (currentY + SECTION_HEADER_HEIGHT > doc.page.height - PAGE_MARGIN) {
        doc.addPage({ margin: PAGE_MARGIN });
        addTableHeader(doc, PAGE_MARGIN);
        currentY = PAGE_MARGIN + TABLE_HEADER_HEIGHT;
      }

      addSectionHeader(doc, currentY, item.section);
      currentY += SECTION_HEADER_HEIGHT;
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
    const linkedPhotos = input.photos.filter((photo) => photo.linkedTemplateId === item.templateId);
    const height = rowHeight(doc, descriptionText, quantityText, item.notes || "-");
    const totalRequiredHeight = height + (linkedPhotos.length > 0 ? estimatePhotoBlockHeight(linkedPhotos.length) + 8 : 0);

    if (currentY + totalRequiredHeight > doc.page.height - PAGE_MARGIN) {
      doc.addPage({ margin: PAGE_MARGIN });
      addTableHeader(doc, PAGE_MARGIN);
      currentY = PAGE_MARGIN + TABLE_HEADER_HEIGHT;
      addSectionHeader(doc, currentY, currentSection);
      currentY += SECTION_HEADER_HEIGHT;
    }

    doc.rect(PAGE_MARGIN, currentY, doc.page.width - PAGE_MARGIN * 2, height).strokeColor("#d5deea").stroke();
    doc.fillColor("#1f2f3d").font("Helvetica").fontSize(9);
    doc.text(item.chargeType, PAGE_MARGIN + 8, currentY + 8, { width: 95 });
    doc.text(descriptionText, PAGE_MARGIN + 110, currentY + 8, { width: 230 });
    doc.text(quantityText, PAGE_MARGIN + 345, currentY + 8, { width: 95 });
    doc.text(item.notes || "-", PAGE_MARGIN + 445, currentY + 8, { width: 110 });
    currentY += height;

    if (linkedPhotos.length > 0) {
      const linkedPhotoBlock = await renderInlinePhotoBlock(doc, currentY + 8, linkedPhotos, `Linked Photos (${linkedPhotos.length})`);
      currentY = linkedPhotoBlock.nextY + 8;
      repeatTableHeader = linkedPhotoBlock.pageBreakUsed;
    }
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
