import { KeyStageInspectionTemplate } from '../types/models';
import { FoundationType } from '../types/regulations';

const nhbc41 = {
  id: 'nhbc-4-1',
  source: 'NHBC Standards 2026' as const,
  jurisdiction: 'Both' as const,
  partOrChapter: 'Chapter 4.1',
  title: 'Land quality, managing ground conditions and foundations',
};

const nhbc42 = {
  id: 'nhbc-4-2',
  source: 'NHBC Standards 2026' as const,
  jurisdiction: 'Both' as const,
  partOrChapter: 'Chapter 4.2',
  title: 'Building near trees',
};

const adA = {
  id: 'ad-a-structure',
  source: 'Building Regulations' as const,
  jurisdiction: 'Both' as const,
  partOrChapter: 'Approved Document A',
  title: 'Structure',
};

const adC = {
  id: 'ad-c-site-prep',
  source: 'Building Regulations' as const,
  jurisdiction: 'Both' as const,
  partOrChapter: 'Approved Document C',
  title: 'Site preparation and resistance to contaminants and moisture',
};

function designTolerance(label: string, prompt: string) {
  return {
    ruleId: 'project-design-foundation-check',
    label,
    prompt,
    unit: 'mm' as const,
    measurementRequired: true,
    values: {
      'Tolerance route': 'Check against approved foundation design, engineer details and site-specific NHBC requirements',
    },
  };
}

export const foundationTypeInspectionTemplates: Record<FoundationType, KeyStageInspectionTemplate | undefined> = {
  'Strip foundation': {
    id: 'foundation-strip',
    keyStageName: 'Strip Foundation',
    matchedStageNames: ['Substructure', 'Foundation', 'Foundations complete'],
    description: 'Strip foundation checks before concrete pour. Width, depth and bearing must be checked against the approved design and site ground conditions.',
    items: [
      { id: 'strip-001', trade: 'Groundworks', check: 'Foundation set out matches approved drawing', references: [nhbc41, adA] },
      { id: 'strip-002', trade: 'Groundworks', check: 'Excavation width measured against approved design', references: [nhbc41, adA], tolerance: designTolerance('Foundation width', 'Is the measured foundation width in accordance with the approved design?') },
      { id: 'strip-003', trade: 'Groundworks', check: 'Excavation depth measured against approved design and suitable bearing strata reached', references: [nhbc41, adA], tolerance: designTolerance('Foundation depth', 'Is the measured foundation depth in accordance with the approved design and ground conditions?') },
      { id: 'strip-004', trade: 'Groundworks', check: 'Trench bottom clean, firm and free from loose spoil, soft spots and standing water', references: [nhbc41, adC] },
      { id: 'strip-005', trade: 'Groundworks', check: 'Tree influence, heave precautions or clay shrinkage requirements checked where applicable', references: [nhbc42, adA] },
      { id: 'strip-006', trade: 'Groundworks', check: 'Services, drainage crossings and ducts protected where passing through or near foundations', references: [nhbc41] },
    ],
  },
  'Trench fill foundation': {
    id: 'foundation-trench-fill',
    keyStageName: 'Trench Fill Foundation',
    matchedStageNames: ['Substructure', 'Foundation', 'Foundations complete'],
    description: 'Trench fill foundation checks before concrete pour. Confirm trench depth, width, bearing, collapse risk and concrete level.',
    items: [
      { id: 'trenchfill-001', trade: 'Groundworks', check: 'Trench fill set out matches approved drawing', references: [nhbc41, adA] },
      { id: 'trenchfill-002', trade: 'Groundworks', check: 'Trench width measured against approved design', references: [nhbc41, adA], tolerance: designTolerance('Trench fill width', 'Is the measured trench width in accordance with the approved design?') },
      { id: 'trenchfill-003', trade: 'Groundworks', check: 'Trench depth and bearing strata checked against design and ground conditions', references: [nhbc41, adA], tolerance: designTolerance('Trench fill depth', 'Is the measured trench depth in accordance with the approved design and ground conditions?') },
      { id: 'trenchfill-004', trade: 'Groundworks', check: 'Trench sides stable enough for safe inspection and concrete pour', references: [nhbc41] },
      { id: 'trenchfill-005', trade: 'Groundworks', check: 'Concrete pour level and below-ground masonry start level confirmed', references: [nhbc41] },
      { id: 'trenchfill-006', trade: 'Groundworks', check: 'Tree influence, heave precautions or clay shrinkage requirements checked where applicable', references: [nhbc42, adA] },
    ],
  },
  'Raft foundation': {
    id: 'foundation-raft',
    keyStageName: 'Raft Foundation',
    matchedStageNames: ['Substructure', 'Foundation', 'Raft', 'Oversite / Slab', 'Slab'],
    description: 'Raft foundation checks before concrete pour. Reinforcement, cover, edge thickening, laps and service penetrations must be checked against engineer design.',
    items: [
      { id: 'raft-001', trade: 'Groundworks', check: 'Raft setting out and edge thickening matches engineer design', references: [nhbc41, adA] },
      { id: 'raft-002', trade: 'Groundworks', check: 'Formation, blinding and sub-base prepared to design', references: [nhbc41, adC] },
      { id: 'raft-003', trade: 'Groundworks', check: 'DPM or membrane installed, lapped and protected where required', references: [adC] },
      { id: 'raft-004', trade: 'Groundworks', check: 'Reinforcement size, spacing, laps and chairs checked against engineer design', references: [nhbc41, adA], tolerance: designTolerance('Raft reinforcement', 'Is reinforcement size, spacing, cover and lap in accordance with engineer design?') },
      { id: 'raft-005', trade: 'Groundworks', check: 'Service penetrations, ducts and drainage positions coordinated before pour', references: [nhbc41] },
      { id: 'raft-006', trade: 'Groundworks', check: 'Concrete cover to reinforcement checked against engineer design', references: [nhbc41, adA], tolerance: designTolerance('Concrete cover', 'Is the measured concrete cover in accordance with engineer design?') },
    ],
  },
  'Piled foundation': {
    id: 'foundation-piled',
    keyStageName: 'Piled Foundation',
    matchedStageNames: ['Substructure', 'Foundation', 'Piles', 'Pile caps'],
    description: 'Piled foundation checks for pile records, cut-off levels, pile caps, reinforcement and engineer design compliance.',
    items: [
      { id: 'piled-001', trade: 'Piling contractor', check: 'Pile layout matches engineer design and piling record', references: [nhbc41, adA] },
      { id: 'piled-002', trade: 'Piling contractor', check: 'Pile installation records available and reviewed where required', references: [nhbc41] },
      { id: 'piled-003', trade: 'Groundworks', check: 'Pile cut-off levels checked against engineer design', references: [nhbc41, adA], tolerance: designTolerance('Pile cut-off level', 'Is the measured pile cut-off level in accordance with the engineer design?') },
      { id: 'piled-004', trade: 'Groundworks', check: 'Pile cap size, depth and reinforcement checked against engineer design', references: [nhbc41, adA], tolerance: designTolerance('Pile cap dimensions and reinforcement', 'Are pile cap dimensions, reinforcement and cover in accordance with engineer design?') },
      { id: 'piled-005', trade: 'Groundworks', check: 'Ground beams, starter bars, ducts and service penetrations coordinated before pour', references: [nhbc41] },
    ],
  },
  'Pier and beam foundation': undefined,
  'Engineered fill foundation': undefined,
  'Ground improvement foundation': undefined,
  Unknown: undefined,
};

export function getFoundationTypeInspectionTemplate(foundationType?: string) {
  if (!foundationType) return undefined;
  return foundationTypeInspectionTemplates[foundationType as FoundationType];
}
