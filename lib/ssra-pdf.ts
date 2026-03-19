import PDFDocument from "pdfkit";
import { buildSubmissionArtifactBaseName } from "@/lib/submission-artifacts";
import type { SsraFormData, StoredAttachment } from "@/types";

type SsraPdfInput = {
  reference: string;
  createdAt: string;
  status: string;
  formData: SsraFormData;
  attachments: StoredAttachment[];
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

function ensureSpace(doc: PDFKit.PDFDocument, height: number) {
  if (doc.y + height > doc.page.height - PAGE_MARGIN) {
    doc.addPage({ margin: PAGE_MARGIN });
  }
}

function addTitle(doc: PDFKit.PDFDocument, input: SsraPdfInput) {
  doc.fillColor("#10315a").font("Helvetica-Bold").fontSize(22).text("Glidepath Solutions", PAGE_MARGIN, 34);
  doc.fillColor("#40566f").font("Helvetica").fontSize(10).text("Site Specific Risk Assessment", PAGE_MARGIN, 62);
  doc.fillColor("#40566f").font("Helvetica").fontSize(10).text(input.reference, PAGE_MARGIN, 76);
  doc.moveTo(PAGE_MARGIN, 94).lineTo(doc.page.width - PAGE_MARGIN, 94).strokeColor("#d5deea").stroke();
  doc.y = 112;
}

function addSectionHeading(doc: PDFKit.PDFDocument, title: string) {
  ensureSpace(doc, 28);
  doc.fillColor("#10315a").font("Helvetica-Bold").fontSize(14).text(title);
  doc.moveDown(0.4);
}

function addField(doc: PDFKit.PDFDocument, label: string, value: string) {
  ensureSpace(doc, 28);
  doc.fillColor("#10315a").font("Helvetica-Bold").fontSize(10).text(label);
  doc.fillColor("#1f2f3d").font("Helvetica").fontSize(10).text(value || "-", { indent: 8 });
  doc.moveDown(0.35);
}

function addList(doc: PDFKit.PDFDocument, label: string, values: string[]) {
  addField(doc, label, values.length > 0 ? values.join(", ") : "-");
}

function addQuestion(doc: PDFKit.PDFDocument, label: string, answer: string, comments: string) {
  addField(doc, label, `Answer: ${answer || "-"}`);
  if (comments) {
    addField(doc, "Comments", comments);
  }
}

function attachmentGroups(attachments: StoredAttachment[]) {
  const groups = new Map<string, StoredAttachment[]>();

  for (const attachment of attachments) {
    const key = `${attachment.sectionKey}:::${attachment.questionKey}`;
    const current = groups.get(key) ?? [];
    current.push(attachment);
    groups.set(key, current);
  }

  return Array.from(groups.entries()).map(([key, items]) => ({
    key,
    sectionKey: items[0]?.sectionKey ?? "",
    questionKey: items[0]?.questionKey ?? "",
    items,
  }));
}

function decodeSignature(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/png|image\/jpeg);base64,(.+)$/);
  if (!match) {
    return null;
  }

  return Buffer.from(match[2], "base64");
}

export async function buildSsraPdf(input: SsraPdfInput) {
  const doc = new PDFDocument({
    margin: PAGE_MARGIN,
    size: "A4",
  });

  const bufferPromise = pipeToBuffer(doc);
  const { formData } = input;

  addTitle(doc, input);
  addField(doc, "Document", buildSubmissionArtifactBaseName(formData.summary.project || "SSRA", "SSRA", formData.summary.eventDateTime || input.createdAt));
  addField(doc, "Created", input.createdAt);
  addField(doc, "Status", input.status);

  addSectionHeading(doc, "Summary Information");
  addField(doc, "Project", formData.summary.project);
  addField(doc, "Date & time", formData.summary.eventDateTime);
  addField(doc, "Work Package", formData.summary.workPackage);
  addField(doc, "Location", formData.summary.location);
  addField(doc, "Description of works", formData.summary.descriptionOfWorks);
  addField(doc, "Author", formData.summary.author);

  addSectionHeading(doc, "Personnel on Site");
  formData.summary.personnel.forEach((person, index) => {
    if (!person.name && !person.company && !person.department) {
      return;
    }

    addField(doc, `Person ${index + 1}`, `${person.name || "-"} | ${person.company || "-"} | ${person.department || "-"}`);
  });

  addSectionHeading(doc, "Hazards and Controls");
  addList(doc, "Type of Activity", formData.hazards.activities);
  addList(doc, "Plant & Equipment", formData.hazards.equipment);
  addField(doc, "Other Equipment", formData.hazards.otherEquipment || "-");
  addList(doc, "First Tools of Choice - Surface Removal", formData.hazards.surfaceRemovalTools);
  addField(doc, "Surface Removal Comments", formData.hazards.surfaceRemovalComments || "-");
  addList(doc, "First Tools of Choice - Excavation Below the surface", formData.hazards.excavationTools);
  addField(doc, "Excavation Comments", formData.hazards.excavationComments || "-");

  addSectionHeading(doc, "PPE and RPE");
  addList(doc, "PPE required", formData.ppe.ppeItems);
  addField(doc, "PPE comments", formData.ppe.comments || "-");
  addField(doc, "First Aider on site", formData.ppe.firstAiderNotApplicable ? "N/A" : formData.ppe.firstAiderOnSite || "-");
  addField(doc, "Nearest Hospital", formData.ppe.nearestHospitalNotApplicable ? "N/A" : formData.ppe.nearestHospital || "-");
  addField(doc, "Nearest Defib", formData.ppe.nearestDefibNotApplicable ? "N/A" : formData.ppe.nearestDefib || "-");

  addSectionHeading(doc, "Environmental");
  addField(doc, "Surrounding area photos/comments", formData.environmental.surroundingAreaComments || "-");
  addQuestion(doc, "Tree trimming activities", formData.environmental.treeTrimming.answer, formData.environmental.treeTrimming.comments);
  addQuestion(doc, "Night works", formData.environmental.nightWorks.answer, formData.environmental.nightWorks.comments);
  addQuestion(doc, "Near non-native invasive species area", formData.environmental.invasiveSpecies.answer, formData.environmental.invasiveSpecies.comments);
  addQuestion(doc, "Are there any COSHH materials on site?", formData.environmental.coshhOnSite.answer, formData.environmental.coshhOnSite.comments);
  addQuestion(doc, "Do you have a spill kit?", formData.environmental.spillKit.answer, formData.environmental.spillKit.comments);
  addQuestion(
    doc,
    "Aware COSHH assessments and MSDS are available on the Evotix Library?",
    formData.environmental.coshhAssessmentsAware.answer,
    formData.environmental.coshhAssessmentsAware.comments,
  );

  addSectionHeading(doc, "Streetworks & Traffic Management");
  addField(doc, "Traffic Control Permit required", formData.streetworks.trafficControlPermit || "-");
  addField(doc, "Traffic Control Permit comments", formData.streetworks.trafficControlPermitComments || "-");
  addList(doc, "Duration of works", formData.streetworks.durations);
  addList(doc, "Road Type / Classification", formData.streetworks.roadTypes);
  addList(doc, "Traffic Management Provision", formData.streetworks.trafficManagementProvisions);
  addField(doc, "Are Walkways Closed?", formData.streetworks.pedestrianWalkwaysClosed || "-");
  addField(doc, "Pedestrian safety comments", formData.streetworks.pedestrianWalkwaysComments || "-");
  addField(doc, "Advanced SLG", `${formData.streetworks.advancedSlg.status || "-"}${formData.streetworks.advancedSlg.comments ? ` | ${formData.streetworks.advancedSlg.comments}` : ""}`);
  addField(doc, "Safety Zones", `${formData.streetworks.safetyZones.status || "-"}${formData.streetworks.safetyZones.comments ? ` | ${formData.streetworks.safetyZones.comments}` : ""}`);
  addField(doc, "General comments", formData.streetworks.generalComments || "-");

  addSectionHeading(doc, "Openreach PIA Network");
  addField(doc, "Accreditation holder names", formData.pia.accreditationHolderNames || "-");
  addList(doc, "PIA accreditations", formData.pia.accreditations);
  addField(doc, "Underground network interaction", formData.pia.undergroundInteraction || "-");
  addField(doc, "Underground comments", formData.pia.undergroundInteractionComments || "-");
  addField(doc, "Overhead network interaction", formData.pia.overheadInteraction || "-");
  addField(doc, "Overhead comments", formData.pia.overheadInteractionComments || "-");

  addSectionHeading(doc, "Attachments");
  const groups = attachmentGroups(input.attachments);
  if (groups.length === 0) {
    addField(doc, "Attachments", "No attachments uploaded.");
  } else {
    for (const group of groups) {
      addField(doc, `${group.sectionKey} / ${group.questionKey} (${group.items.length})`, group.items.map((item) => item.originalName).join(", "));
    }
  }

  addSectionHeading(doc, "Signature");
  addField(doc, "Signed at", formData.signature.signatureSignedAt || "-");
  const signatureBuffer = decodeSignature(formData.signature.signatureDataUrl);
  if (signatureBuffer) {
    ensureSpace(doc, 140);
    doc.image(signatureBuffer, PAGE_MARGIN, doc.y, { fit: [220, 120] });
    doc.moveDown(7);
  } else {
    addField(doc, "Signature", formData.signature.signatureDataUrl ? "Captured" : "Not provided");
  }

  doc.end();
  return bufferPromise;
}
