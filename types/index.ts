export type Project = {
  id: string;
  name: string;
};

export type SurveyTemplateRow = {
  id: string;
  section: string;
  chargeType: string;
  description: string;
  additionalDescription?: string;
  notesGuidance?: string;
};

export type EditableLineItem = {
  templateId: string;
  quantity: string;
  notes: string;
};

export type PhotoLinkInput = {
  linkedTemplateId: string | null;
};

export type NormalizedLineItem = {
  templateId: string;
  chargeType: string;
  description: string;
  additionalDescription?: string;
  notesGuidance?: string;
  quantity: number | null;
  notes: string;
  section: string;
};

export type SubmissionMetadata = {
  project: string;
  surveyorName: string;
  surveyDate: string;
  siteLocation: string;
  generalComments: string;
};

export type StoredPhoto = {
  originalName: string;
  storedName: string;
  relativePath: string;
  absolutePath: string;
  mimeType: string;
  sizeBytes: number;
  linkedTemplateId: string | null;
  linkedSectionName: string;
  linkedDescription: string;
};

export type SubmissionSummary = SubmissionMetadata & {
  id: number;
  reference: string;
  createdAt: string;
  emailStatus: "pending" | "sent" | "failed";
  emailError: string | null;
  pdfPath: string | null;
  csvPath: string | null;
  photoCount: number;
};
