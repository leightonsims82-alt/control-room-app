import { KeyStageInspectionTemplate } from '../types/models';

export const keyStageInspectionTemplates: KeyStageInspectionTemplate[] = [
  {
    id: 'foundation',
    keyStageName: 'Foundation',
    matchedStageNames: ['Substructure', 'Foundations complete', 'Foundation'],
    description: 'Pre-pour foundation checks for excavations, bearing ground and concrete readiness.',
    items: [
      { id: 'foundation-001', trade: 'Groundworks', check: 'Foundation set out matches the approved drawing' },
      { id: 'foundation-002', trade: 'Groundworks', check: 'Excavation width checked and acceptable' },
      { id: 'foundation-003', trade: 'Groundworks', check: 'Excavation depth checked and acceptable' },
      { id: 'foundation-004', trade: 'Groundworks', check: 'Suitable bearing ground visible' },
      { id: 'foundation-005', trade: 'Groundworks', check: 'Trench bottom clean with loose spoil removed' },
      { id: 'foundation-006', trade: 'Groundworks', check: 'No soft spots present' },
      { id: 'foundation-007', trade: 'Groundworks', check: 'No standing water present before concrete pour' },
      { id: 'foundation-008', trade: 'Groundworks', check: 'Steps formed correctly where levels change' },
      { id: 'foundation-009', trade: 'Groundworks', check: 'Services or drainage crossings protected where required' },
      { id: 'foundation-010', trade: 'Groundworks', check: 'Heave protection installed where required' },
      { id: 'foundation-011', trade: 'Groundworks', check: 'Concrete placed to correct level and finished suitably' },
    ],
  },
  {
    id: 'drainage',
    keyStageName: 'Drainage',
    matchedStageNames: ['Drainage'],
    description: 'Drainage checks before test, protection and backfill.',
    items: [
      { id: 'drainage-001', trade: 'Drainage contractor', check: 'Drainage layout matches approved drawing' },
      { id: 'drainage-002', trade: 'Drainage contractor', check: 'Pipes laid to correct line and fall' },
      { id: 'drainage-003', trade: 'Drainage contractor', check: 'Pipes correctly bedded and supported' },
      { id: 'drainage-004', trade: 'Drainage contractor', check: 'Joints correctly made and fully seated' },
      { id: 'drainage-005', trade: 'Drainage contractor', check: 'Inspection chambers and access points correctly positioned' },
      { id: 'drainage-006', trade: 'Drainage contractor', check: 'Pipes protected where passing through or near foundations' },
      { id: 'drainage-007', trade: 'Drainage contractor', check: 'Drainage test completed where required' },
      { id: 'drainage-008', trade: 'Drainage contractor', check: 'Backfill material suitable and free from debris' },
    ],
  },
  {
    id: 'superstructure',
    keyStageName: 'Superstructure',
    matchedStageNames: ['First lift brickwork', 'Second lift brickwork', 'Third lift brickwork', 'Superstructure to wall plate'],
    description: 'Brickwork and superstructure quality checks before works progress too far.',
    items: [
      { id: 'superstructure-001', trade: 'Brickwork', check: 'DPC visible, continuous and correctly positioned' },
      { id: 'superstructure-002', trade: 'Brickwork', check: 'Cavities clean and free from mortar droppings' },
      { id: 'superstructure-003', trade: 'Brickwork', check: 'Wall ties installed at correct spacing and orientation' },
      { id: 'superstructure-004', trade: 'Brickwork', check: 'Cavity trays installed where required' },
      { id: 'superstructure-005', trade: 'Brickwork', check: 'Weep vents installed where required and unobstructed' },
      { id: 'superstructure-006', trade: 'Brickwork', check: 'Lintels installed correctly with correct bearing' },
      { id: 'superstructure-007', trade: 'Brickwork', check: 'Openings formed correctly and to correct dimensions' },
      { id: 'superstructure-008', trade: 'Brickwork', check: 'Brickwork plumb, level and generally acceptable' },
      { id: 'superstructure-009', trade: 'Brickwork', check: 'Cavity insulation installed correctly where applicable' },
      { id: 'superstructure-010', trade: 'Brickwork', check: 'Fire stopping or cavity barriers installed where applicable' },
    ],
  },
  {
    id: 'pre-plaster',
    keyStageName: 'Pre Plaster',
    matchedStageNames: ['Insulation', 'Drylining', 'Windows and doors'],
    description: 'Pre-plaster checks before walls and ceilings are closed up.',
    items: [
      { id: 'preplaster-001', trade: 'Joinery', check: '1st fix carpentry complete and ready for close up' },
      { id: 'preplaster-002', trade: 'Plumbing', check: '1st fix plumbing complete and pressure checked where required' },
      { id: 'preplaster-003', trade: 'Electrical', check: '1st fix electrics complete and routes acceptable' },
      { id: 'preplaster-004', trade: 'Sprinkler contractor', check: 'Sprinkler pipework complete where applicable' },
      { id: 'preplaster-005', trade: 'Multi-trade', check: 'Fire stopping complete before boarding' },
      { id: 'preplaster-006', trade: 'Drylining', check: 'Cavity barriers visible and correctly installed where applicable' },
      { id: 'preplaster-007', trade: 'Drylining', check: 'Insulation fitted correctly with no obvious gaps' },
      { id: 'preplaster-008', trade: 'Multi-trade', check: 'Ducting and ventilation routes complete' },
      { id: 'preplaster-009', trade: 'Drylining', check: 'Vapour control layer installed where applicable' },
      { id: 'preplaster-010', trade: 'Multi-trade', check: 'Services protected from damage before dry lining' },
    ],
  },
  {
    id: 'finals',
    keyStageName: 'Finals',
    matchedStageNames: ['Pre-handover / paint touch-ups', 'Snag patch', 'Snag decoration', 'Sparkle clean'],
    description: 'Final quality checks before handover or customer inspection.',
    items: [
      { id: 'finals-001', trade: 'Decoration', check: 'Decoration finish acceptable' },
      { id: 'finals-002', trade: 'Mastic contractor', check: 'Mastic complete and neat' },
      { id: 'finals-003', trade: 'Kitchen fitter', check: 'Kitchen units, worktops and appliances complete' },
      { id: 'finals-004', trade: 'Plumbing', check: 'Bathrooms complete with no obvious leaks or damage' },
      { id: 'finals-005', trade: 'Plumbing', check: 'Heating system complete and ready' },
      { id: 'finals-006', trade: 'Electrical', check: 'Electrical accessories fitted and aligned' },
      { id: 'finals-007', trade: 'Joinery', check: 'Doors, linings and ironmongery complete and operating' },
      { id: 'finals-008', trade: 'Joinery', check: 'Stairs, handrails and balustrades complete' },
      { id: 'finals-009', trade: 'Groundworks', check: 'External works and drainage covers complete' },
      { id: 'finals-010', trade: 'Finishing', check: 'Plot clean and customer facing finish acceptable' },
    ],
  },
];

export function getInspectionTemplateForStage(stageName: string) {
  const normalisedStageName = stageName.toLowerCase();
  return keyStageInspectionTemplates.find((template) =>
    template.matchedStageNames.some((matchedName) => normalisedStageName.includes(matchedName.toLowerCase())),
  );
}
