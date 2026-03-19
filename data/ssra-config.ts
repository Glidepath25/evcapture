import type { SsraFormData, SsraPersonnelEntry } from "@/types";

export const SSRA_DEPARTMENT_OPTIONS: string[] = [];

export const SSRA_ACTIVITY_OPTIONS = [
  "Test, Rod and Roping",
  "Excavations - General Civils",
  "Moleploughing",
  "Pole Installation",
  "Fibre Blowing",
  "Overhead Cabling",
  "Underground Cabling",
  "Splicing Activities",
  "Streetworks",
  "Surveying",
  "Vegetation Maintenance, Tree trimming",
  "General Environmental",
  "FLM",
  "Network Installs",
  "Installations - Premise/End User",
  "Working within Designated Areas",
] as const;

export const SSRA_EQUIPMENT_OPTIONS = [
  "Excavator",
  "Fibre Blowing Machine",
  "GDU",
  "Stihl Saw",
  "Ladder",
  "Breaker/Jack Hammer",
  "Floor Saw",
  "MEWP",
  "Water Testing Kit",
  "Vibro Tamper",
  "Harness",
  "Cordless Needle Concrete Vibrating Poker",
  "Road Roller",
  "Cable Drum Roller",
  "eCAT4 + Genny",
  "Forward Tipping Dumper",
  "Cobra",
  "Confined spaces - access/egress equipment",
  "Silky Saw",
  "Mechanical Rodder",
  "Lid Lifter",
  "Whacker Plate Compactor",
  "Grab Lorry",
] as const;

export const SSRA_SURFACE_REMOVAL_OPTIONS = [
  "Insulated Hand Tool(s)",
  "Road Breaker / Jack Hammer",
  "Floor / Road Saw",
  "Mechanical Excavation",
  "Not Applicable",
  "Other",
] as const;

export const SSRA_EXCAVATION_OPTIONS = [
  "Insulated Hand Tool(s)",
  "Air Excavation / Air Lance",
  "Vacuum Excavation",
  "Other",
  "Not Applicable",
] as const;

export const SSRA_PPE_OPTIONS = [
  "Hard Hat",
  "Safety Footwear",
  "High Visibility (C3) Long Sleeved",
  "High Visibility (C3) Trousers",
  "Eye Protection",
  "Ear Protection",
  "RPE - Mask or Respirator",
  "General Environmental",
] as const;

export const SSRA_STREETWORK_DURATION_OPTIONS = ["Under 1 Hour", "1 - 4 Hours", "4 - 8 Hours", "Multiple Days"] as const;

export const SSRA_STREETWORK_ROAD_OPTIONS = [
  "Single Carriageway - Speed 30 mph of less",
  "Single Carriageway - Speed 40 mph",
  "Single Carriageway - Speed 50 mph or more",
  "All-Purpose Dual Carriageway -Speed 40 mph or less",
  "Other Type or Classification",
] as const;

export const SSRA_TRAFFIC_MANAGEMENT_OPTIONS = [
  "Give and Take",
  "Traffic Lights",
  "Priority Signs",
  "Other",
  "Stop / Go Boards",
  "Not Applicable",
] as const;

export const SSRA_PIA_ACCREDITATION_OPTIONS = [
  "SA001 - OH Safety",
  "Q019 - Core Drilling",
  "SA001a - OH Safety (Awareness Only)",
  "Q020 - Blockages",
  "SA002 - UG Safety",
  "PIA S5 - Pole Survey",
  "SA002a - UG Safety (Awareness Only)",
  "PIA S6 - Duct Survey",
  "SA006 - Safety in Civils",
  "PIA S7 - UG Cable Install",
  "SA008 - Cable Install Over LV Power",
  "PIA S8 - OH Cable Install",
  "K0008 - Hand Rodding UG",
  "PIA S9 - Pole Steps",
] as const;

export const SSRA_ATTACHMENT_SECTIONS = {
  hazardsSurfaceRemoval: { sectionKey: "hazards", questionKey: "surfaceRemovalAttachments", label: "Surface removal attachments" },
  hazardsExcavation: { sectionKey: "hazards", questionKey: "excavationAttachments", label: "Excavation attachments" },
  ppeGeneral: { sectionKey: "ppe", questionKey: "ppeAttachments", label: "PPE attachments" },
  emergencyFirstAider: { sectionKey: "ppe", questionKey: "firstAiderAttachments", label: "First aider attachments" },
  emergencyHospital: { sectionKey: "ppe", questionKey: "hospitalAttachments", label: "Nearest hospital attachments" },
  emergencyDefib: { sectionKey: "ppe", questionKey: "defibAttachments", label: "Nearest defib attachments" },
  environmentalSurrounding: { sectionKey: "environmental", questionKey: "surroundingAreaAttachments", label: "Surrounding area attachments" },
  environmentalTreeTrimming: { sectionKey: "environmental", questionKey: "treeTrimmingAttachments", label: "Tree trimming attachments" },
  environmentalNightWorks: { sectionKey: "environmental", questionKey: "nightWorksAttachments", label: "Night works attachments" },
  environmentalInvasiveSpecies: { sectionKey: "environmental", questionKey: "invasiveSpeciesAttachments", label: "Invasive species attachments" },
  environmentalCoshhOnSite: { sectionKey: "environmental", questionKey: "coshhOnSiteAttachments", label: "COSHH on site attachments" },
  environmentalSpillKit: { sectionKey: "environmental", questionKey: "spillKitAttachments", label: "Spill kit attachments" },
  environmentalCoshhLibrary: { sectionKey: "environmental", questionKey: "coshhLibraryAttachments", label: "COSHH library awareness attachments" },
  streetworksPermit: { sectionKey: "streetworks", questionKey: "trafficControlPermitAttachments", label: "Traffic permit attachments" },
  streetworksProvision: { sectionKey: "streetworks", questionKey: "trafficManagementProvisionAttachments", label: "Traffic management provision attachments" },
  streetworksPedestrian: { sectionKey: "streetworks", questionKey: "pedestrianAttachments", label: "Pedestrian safety attachments" },
  streetworksAdvancedSlg: { sectionKey: "streetworks", questionKey: "advancedSlgAttachments", label: "Advanced SLG attachments" },
  streetworksSafetyZones: { sectionKey: "streetworks", questionKey: "safetyZoneAttachments", label: "Safety zone attachments" },
  signatureAdditional: { sectionKey: "signature", questionKey: "additionalAttachments", label: "Additional attachments" },
} as const;

function buildDefaultPersonnel(): SsraPersonnelEntry[] {
  return Array.from({ length: 3 }, () => ({
    name: "",
    company: "",
    department: "",
  }));
}

export function createEmptySsraFormData(): SsraFormData {
  return {
    summary: {
      project: "",
      eventDateTime: "",
      workPackage: "",
      location: "",
      descriptionOfWorks: "",
      author: "",
      personnel: buildDefaultPersonnel(),
    },
    hazards: {
      activities: [],
      equipment: [],
      otherEquipment: "",
      surfaceRemovalTools: [],
      surfaceRemovalComments: "",
      excavationTools: [],
      excavationComments: "",
    },
    ppe: {
      ppeItems: [],
      comments: "",
      firstAiderOnSite: "",
      firstAiderNotApplicable: false,
      nearestHospital: "",
      nearestHospitalNotApplicable: false,
      nearestDefib: "",
      nearestDefibNotApplicable: false,
    },
    environmental: {
      surroundingAreaComments: "",
      treeTrimming: { answer: "", comments: "" },
      nightWorks: { answer: "", comments: "" },
      invasiveSpecies: { answer: "", comments: "" },
      coshhOnSite: { answer: "", comments: "" },
      spillKit: { answer: "", comments: "" },
      coshhAssessmentsAware: { answer: "", comments: "" },
    },
    streetworks: {
      trafficControlPermit: "",
      trafficControlPermitComments: "",
      durations: [],
      roadTypes: [],
      trafficManagementProvisions: [],
      pedestrianWalkwaysClosed: "",
      pedestrianWalkwaysComments: "",
      advancedSlg: { status: "", comments: "" },
      safetyZones: { status: "", comments: "" },
      generalComments: "",
    },
    pia: {
      accreditationHolderNames: "",
      accreditations: [],
      undergroundInteraction: "",
      undergroundInteractionComments: "",
      overheadInteraction: "",
      overheadInteractionComments: "",
    },
    signature: {
      signatureDataUrl: "",
      signatureSignedAt: "",
    },
  };
}
