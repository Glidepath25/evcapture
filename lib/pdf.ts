import fs from "node:fs";
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

async function addPhotos(doc: PDFKit.PDFDocument, photos: StoredPhoto[]) {
  if (photos.length === 0) {
    return;
  }

  const photoGroups = [
    {
      label: "General site photos",
      photos: photos.filter((photo) => !photo.linkedTemplateId),
    },
    ...Array.from(new Set(photos.filter((photo) => photo.linkedTemplateId).map((photo) => photo.linkedTemplateId))).map((templateId) => {
      const groupedPhotos = photos.filter((photo) => photo.linkedTemplateId === templateId);
      return {
        label: `${groupedPhotos[0]?.linkedSectionName ?? "Section"}: ${groupedPhotos[0]?.linkedDescription ?? "Linked photos"}`,
        photos: groupedPhotos,
      };
    }),
  ].filter((group) => group.photos.length > 0);

  doc.addPage({ margin: PAGE_MARGIN });
  doc.fillColor("#10315a").font("Helvetica-Bold").fontSize(18).text("Uploaded Photos");
  doc.moveDown(0.6);

  const boxWidth = 240;
  const boxHeight = 170;
  let x = PAGE_MARGIN;
  let y = doc.y;

  for (const group of photoGroups) {
    if (y + 30 > doc.page.height - PAGE_MARGIN) {
      doc.addPage({ margin: PAGE_MARGIN });
      y = PAGE_MARGIN;
      x = PAGE_MARGIN;
    }

    doc.fillColor("#10315a").font("Helvetica-Bold").fontSize(12).text(group.label, PAGE_MARGIN, y);
    y = doc.y + 8;
    x = PAGE_MARGIN;

    for (const photo of group.photos) {
      if (y + boxHeight + 36 > doc.page.height - PAGE_MARGIN) {
        doc.addPage({ margin: PAGE_MARGIN });
        x = PAGE_MARGIN;
        y = PAGE_MARGIN;
      }

      try {
        const transformed = await sharp(fs.readFileSync(photo.absolutePath))
          .rotate()
          .resize({ width: 700, height: 500, fit: "inside", withoutEnlargement: true })
          .jpeg({ quality: 82 })
          .toBuffer();

        doc.roundedRect(x, y, boxWidth, boxHeight, 10).fillAndStroke("#f7f9fc", "#d5deea");
        doc.image(transformed, x + 10, y + 10, { fit: [boxWidth - 20, boxHeight - 38], align: "center", valign: "center" });
        doc.fillColor("#1f2f3d").font("Helvetica").fontSize(9).text(photo.originalName, x + 10, y + boxHeight - 20, {
          width: boxWidth - 20,
        });
      } catch {
        doc.roundedRect(x, y, boxWidth, boxHeight, 10).fillAndStroke("#f7f9fc", "#d5deea");
        doc.fillColor("#9b1c1c").font("Helvetica").fontSize(10).text(`Preview unavailable: ${photo.originalName}`, x + 12, y + 12, {
          width: boxWidth - 24,
        });
      }

      if (x + boxWidth * 2 + 16 <= doc.page.width - PAGE_MARGIN) {
        x += boxWidth + 16;
      } else {
        x = PAGE_MARGIN;
        y += boxHeight + 20;
      }
    }

    y += boxHeight + 18;
  }
}

export async function buildSubmissionPdf(input: PdfInput) {
  const doc = new PDFDocument({
    margin: PAGE_MARGIN,
    size: "A4",
    bufferPages: true,
  });

  const bufferPromise = pipeToBuffer(doc);
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
  const linkedPhotoMap = new Map<string, StoredPhoto[]>();
  for (const photo of input.photos) {
    if (!photo.linkedTemplateId) {
      continue;
    }

    const current = linkedPhotoMap.get(photo.linkedTemplateId) ?? [];
    current.push(photo);
    linkedPhotoMap.set(photo.linkedTemplateId, current);
  }

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
    const linkedPhotos = linkedPhotoMap.get(item.templateId) ?? [];
    const notesText = [item.notes || "-", linkedPhotos.length > 0 ? `Photos: ${linkedPhotos.map((photo) => photo.storedName).join(", ")}` : ""]
      .filter(Boolean)
      .join("\n\n");
    const height = rowHeight(doc, descriptionText, item.quantity?.toString() ?? "-", notesText);

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
    doc.text(notesText, PAGE_MARGIN + 390, currentY + 8, { width: 165 });
    currentY += height;
  }

  await addPhotos(doc, input.photos);
  doc.end();

  return bufferPromise;
}
