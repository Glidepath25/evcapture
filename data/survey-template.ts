import type { SurveyTemplateRow } from "@/types";

export const SURVEY_TEMPLATE: SurveyTemplateRow[] = [
  {
    id: "civils-site-survey",
    section: "Civils",
    chargeType: "Civils",
    description: "Site Survey",
  },
  {
    id: "civils-nie-attendance",
    section: "Civils",
    chargeType: "Civils",
    description: "NIE attendance",
  },
  {
    id: "civils-feeder-pillar-bases",
    section: "Civils",
    chargeType: "Civils",
    description: "Installation of Feeder Pillar Bases",
    additionalDescription:
      "Excavate through existing footway for new feeder pillar bases dispose of site; form conc insitu base 1650mm (l) x 600mm (w) x 300mm (d); on 150mm Type 1 base; 50mm blinding; backfill and leave good; fit new feeder pillar to base (Feeder Pillar supplied free issue by weev).",
  },
  {
    id: "civils-retention-socket-bases",
    section: "Civils",
    chargeType: "Civils",
    description: "Construction of NAL Retention Socket Bases",
    additionalDescription:
      "Installation of Retention socket base RS115 (supplied free issue by weev); excavate foundation 850 x 850mm to depth of 600mm; insitu ST4/C20 concrete laid on 50mm blinding; backfill and leave good.",
  },
  {
    id: "civils-ratio-ev-chargers",
    section: "Civils",
    chargeType: "Civils",
    description: "Installation of Ratio EV Chargers",
    additionalDescription:
      "Installation of Ratio io7 Charger units; 1414 height as per spec (supplied free issue by weev) including adaptor plate install; excludes electrical cabling and connections.",
  },
  {
    id: "civils-sign-post",
    section: "Civils",
    chargeType: "Civils",
    description: "Installation of sign post",
    additionalDescription:
      "Installation of sign post (free issue by weev) including excavation, concrete surround, backfill and make good.",
  },
  {
    id: "civils-trackwork-duct-installation",
    section: "Civils",
    chargeType: "Civils",
    description: "Trackwork & Duct Installation",
    additionalDescription:
      "Excavate through existing footway 600mm depth for new cable duct; dispose off site; lay 100mm cable duct on 50mm fine sand bed and surround on 350mm type 1 fill; 80mm base course; 30mm wearing course.",
    quantityOptions: [
      {
        id: "double-units",
        label: "Double Units",
        guidance: "17nr Double Units (2 charging bay requirements) allowed 15m length each.",
      },
      {
        id: "single-units",
        label: "Single Units",
        guidance: "93 nr Single units (1 charging bay requirement) allowed 10m length each.",
      },
    ],
  },
  {
    id: "civils-nie-ductwork",
    section: "Civils",
    chargeType: "Civils",
    description: "NIE Ductwork from Feeder Pillar to joint pit",
    additionalDescription:
      "Excavate through existing footway 600mm depth for new cable duct; dispose off site; lay 100mm cable duct on 50mm fine sand bed and surround on 350mm type 1 fill; 80mm base course; 30mm wearing course.",
    notesGuidance: "5m length allowance from feeder pillar to joint pit.",
  },
  {
    id: "civils-earth-spike",
    section: "Civils",
    chargeType: "Civils",
    description: "Installation of Earth Spike",
    additionalDescription:
      "Installation of Earth spike and cabling from feeder pillar to spike (allow 1 spike, 1 inspection chamber and 10m of 16mm earth).",
    notesGuidance: "10m length, 1 spike and 1 inspection chamber.",
  },
  {
    id: "civils-line-marking",
    section: "Civils",
    chargeType: "Civils",
    description: "Line Marking to EV Parking Bays",
    additionalDescription: "Line Marking As per Weev Layout.",
    notesGuidance: "Budget / PC Sum Rate Carried.",
  },
  {
    id: "civils-traffic-management",
    section: "Civils",
    chargeType: "Civils",
    description: "Traffic Management",
    additionalDescription: "TM - Allowance per charging location.",
  },
  {
    id: "other-install-marketing-pole",
    section: "Other items noted",
    chargeType: "Other items noted",
    description: "Install Marketing Pole",
  },
  {
    id: "other-150mm-core",
    section: "Other items noted",
    chargeType: "Other items noted",
    description: "150mm Core into concrete",
  },
];
