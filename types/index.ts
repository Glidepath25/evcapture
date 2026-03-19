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
  quantityOptions?: QuantityOption[];
};

export type QuantityOption = {
  id: string;
  label: string;
  guidance?: string;
};

export type EditableLineItem = {
  templateId: string;
  quantity: string;
  notes: string;
  optionQuantities?: Record<string, string>;
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
  quantityOptions?: NormalizedQuantityOption[];
  quantityDisplay: string;
};

export type NormalizedQuantityOption = QuantityOption & {
  quantity: number | null;
};

export type SubmissionMetadata = {
  project: string;
  surveyType: string;
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

export type SsraPersonnelEntry = {
  name: string;
  company: string;
  department: string;
};

export type SsraYesNoNa = "yes" | "no" | "na" | "";
export type SsraYesNo = "yes" | "no" | "";

export type SsraAttachmentInput = {
  key: string;
  sectionKey: string;
  questionKey: string;
  existingAttachmentId?: number;
  existingName?: string;
};

export type SsraSummaryPage = {
  project: string;
  eventDateTime: string;
  workPackage: string;
  location: string;
  descriptionOfWorks: string;
  author: string;
  personnel: SsraPersonnelEntry[];
};

export type SsraHazardsPage = {
  activities: string[];
  equipment: string[];
  otherEquipment: string;
  surfaceRemovalTools: string[];
  surfaceRemovalComments: string;
  excavationTools: string[];
  excavationComments: string;
};

export type SsraPpePage = {
  ppeItems: string[];
  comments: string;
  firstAiderOnSite: string;
  firstAiderNotApplicable: boolean;
  nearestHospital: string;
  nearestHospitalNotApplicable: boolean;
  nearestDefib: string;
  nearestDefibNotApplicable: boolean;
};

export type SsraEnvironmentalQuestion = {
  answer: SsraYesNo;
  comments: string;
};

export type SsraEnvironmentalPage = {
  surroundingAreaComments: string;
  treeTrimming: SsraEnvironmentalQuestion;
  nightWorks: SsraEnvironmentalQuestion;
  invasiveSpecies: SsraEnvironmentalQuestion;
  coshhOnSite: SsraEnvironmentalQuestion;
  spillKit: SsraEnvironmentalQuestion;
  coshhAssessmentsAware: SsraEnvironmentalQuestion;
};

export type SsraStreetworksCompliance = {
  status: "compliant" | "unable" | "na" | "";
  comments: string;
};

export type SsraStreetworksPage = {
  trafficControlPermit: SsraYesNoNa;
  trafficControlPermitComments: string;
  durations: string[];
  roadTypes: string[];
  trafficManagementProvisions: string[];
  pedestrianWalkwaysClosed: SsraYesNo;
  pedestrianWalkwaysComments: string;
  advancedSlg: SsraStreetworksCompliance;
  safetyZones: SsraStreetworksCompliance;
  generalComments: string;
};

export type SsraPiaPage = {
  accreditationHolderNames: string;
  accreditations: string[];
  undergroundInteraction: SsraYesNo;
  undergroundInteractionComments: string;
  overheadInteraction: SsraYesNo;
  overheadInteractionComments: string;
};

export type SsraSignaturePage = {
  signatureDataUrl: string;
  signatureSignedAt: string;
};

export type SsraFormData = {
  summary: SsraSummaryPage;
  hazards: SsraHazardsPage;
  ppe: SsraPpePage;
  environmental: SsraEnvironmentalPage;
  streetworks: SsraStreetworksPage;
  pia: SsraPiaPage;
  signature: SsraSignaturePage;
};

export type StoredAttachment = {
  id?: number;
  originalName: string;
  storedName: string;
  relativePath: string;
  absolutePath: string;
  mimeType: string;
  sizeBytes: number;
  sectionKey: string;
  questionKey: string;
};
