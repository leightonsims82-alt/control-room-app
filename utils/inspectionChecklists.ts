import { ConstructionMethod } from './templateProgramme';

export type ChecklistApplicability = 'all' | ConstructionMethod;

export type ChecklistItem = {
  id: string;
  section: string;
  label: string;
  guidance: string;
  appliesTo?: ChecklistApplicability[];
  photoRequired?: boolean;
};

export type CustomChecklistItem = {
  id: string;
  label: string;
  guidance: string;
  createdAt: string;
};

export type ChecklistDefinition = {
  id: string;
  title: string;
  stage: string;
  description: string;
  items: ChecklistItem[];
};

export const INSPECTION_STATUS_OPTIONS = ['Pass', 'Fail', 'N/A'] as const;
export type InspectionStatus = typeof INSPECTION_STATUS_OPTIONS[number];

const universalItems: ChecklistItem[] = [
  {
    id: 'info-available',
    section: 'General plot readiness',
    label: 'All relevant information available at plot',
    guidance: 'Latest drawings, specifications, details, levels, manufacturer information and inspection requirements are available at the plot before inspection starts.',
    appliesTo: ['all'],
    photoRequired: false,
  },
  {
    id: 'inspection-standard',
    section: 'General plot readiness',
    label: 'Plot presented to inspection standard',
    guidance: 'Plot is clean, safe, accessible and complete enough for the stage inspection to be carried out properly.',
    appliesTo: ['all'],
    photoRequired: true,
  },
  {
    id: 'plot-accessible',
    section: 'General plot readiness',
    label: 'Plot accessible',
    guidance: 'Safe access is available to inspect all required areas.',
    appliesTo: ['all'],
  },
  {
    id: 'works-visible',
    section: 'General plot readiness',
    label: 'Works visible before covering',
    guidance: 'Relevant work is visible and has not been covered before inspection and photographs.',
    appliesTo: ['all'],
    photoRequired: true,
  },
  {
    id: 'area-clear',
    section: 'General plot readiness',
    label: 'Area clean and free from obstruction',
    guidance: 'Spoil, arisings, loose materials and unnecessary obstructions have been removed from the inspection area.',
    appliesTo: ['all'],
  },
  {
    id: 'safety-controls',
    section: 'General plot readiness',
    label: 'Safety controls in place where required',
    guidance: 'Barriers, edge protection or exclusion controls are in place where required.',
    appliesTo: ['all'],
  },
];

export const CHECKLIST_DEFINITIONS: ChecklistDefinition[] = [
  {
    id: 'foundation-formation',
    title: 'Stage 1 — Foundation formation',
    stage: 'Stage 1',
    description: 'Formation inspection before concrete. Foundation type should be confirmed as strip/trench fill, piled or raft.',
    items: [
      { id: 'foundation-type', section: 'Information', label: 'Foundation type confirmed', guidance: 'Strip/trench fill, piled or raft foundation type confirmed against latest design.', photoRequired: true },
      { id: 'levels-indicated', section: 'Information', label: 'Concrete levels indicated', guidance: 'Concrete level markers/datum are indicated at the plot before pour.' },
      { id: 'centre-lines', section: 'Setting out', label: 'Centre lines marked', guidance: 'Centre lines/foundation lines are clearly marked and visible for inspection.', photoRequired: true },
      { id: 'formation-clean', section: 'Formation', label: 'Formation clean and suitable', guidance: 'Formation is clean, accessible, free from loose material and suitable for inspection.', photoRequired: true },
      { id: 'arisings-removed', section: 'Formation', label: 'Arisings removed', guidance: 'Arisings/spoil have been removed from the formation/trench area.' },
      { id: 'no-soft-spots', section: 'Formation', label: 'No obvious soft spots', guidance: 'No visible soft spots, made ground or unsuitable material left in the formation.' },
      { id: 'no-water', section: 'Formation', label: 'No excessive water present', guidance: 'No excessive standing water present before concrete placement.' },
      { id: 'barriers', section: 'Safety / access', label: 'Barriers in place', guidance: 'Excavation edge and unsafe areas are barriered where required.' },
    ],
  },
  {
    id: 'internal-drainage',
    title: 'Internal / below-ground drainage',
    stage: 'Stage 2',
    description: 'Drainage inspection before covering, backfill, floor or slab works. Tolerances are displayed so the inspector can use a slope calculator on site.',
    items: [
      { id: 'drain-layout', section: 'Information', label: 'Drainage layout available', guidance: 'Latest drainage drawing/layout, pipe routes, pipe sizes, gradients and rodding access are available.' },
      { id: '100mm-fall', section: 'Falls / gradients', label: '100mm drain gradient checked', guidance: 'Minimum gradient not flatter than 1:80 where applicable, unless the design states otherwise.', photoRequired: true },
      { id: '150mm-fall', section: 'Falls / gradients', label: '150mm drain gradient checked', guidance: 'Minimum gradient not flatter than 1:150 where applicable, unless the design states otherwise.', photoRequired: true },
      { id: 'low-flow-fall', section: 'Falls / gradients', label: 'Low-flow 100mm drain checked', guidance: 'Minimum 1:40 where flow is less than 1.0L/sec, unless the design states otherwise.' },
      { id: 'no-backfall', section: 'Falls / gradients', label: 'No visible or measured backfall', guidance: 'Drainage has no visible or measured backfall when checked on site.' },
      { id: 'pipe-bedding', section: 'Bedding / support', label: 'Pipe bedding and support suitable', guidance: 'Pipes are firmly supported, with hard spots removed and no bricks/blocks/random packing under pipes.', photoRequired: true },
      { id: 'pipe-ends-capped', section: 'Protection', label: 'Open pipe ends capped', guidance: 'Open pipe ends are capped/protected to prevent debris entering.' },
      { id: 'wall-clearance', section: 'Pipes through walls / foundations', label: 'Pipe through wall/foundation clearance', guidance: '50mm clearance all round, or sleeve with 50mm clearance all round, where this detail applies.', photoRequired: true },
      { id: 'flexible-joints', section: 'Pipes through walls / foundations', label: 'Flexible joints positioned correctly', guidance: 'Flexible joints located as close as feasible and max 150mm from wall face where required.' },
      { id: 'rocker-length', section: 'Pipes through walls / foundations', label: 'Rocker pipe length checked', guidance: 'Rocker pipe length max 600mm where required by detail.' },
      { id: 'rodding-access', section: 'Access / maintenance', label: 'Rodding access provided', guidance: 'Rodding access / inspection chamber locations provided as design.' },
      { id: 'drainage-photos', section: 'Protection before covering', label: 'Drainage photographed before covering', guidance: 'Drainage runs, junctions, bedding, penetrations and key details photographed before covering.', photoRequired: true },
    ],
  },
  {
    id: 'slab-suspended-floor',
    title: 'Stage 2 — Suspended floor / beam and block',
    stage: 'Stage 2',
    description: 'Suspended floor inspection including band course masonry already built before floor/follow-on works.',
    items: [
      { id: 'floor-layout', section: 'Information', label: 'Floor layout and bearing details available', guidance: 'Latest floor layout, beam direction, bearing details, service openings and ventilation details are available.' },
      { id: 'band-bonding', section: 'Band course masonry', label: 'Band course bonding checked', guidance: 'Masonry bonding is consistent and correctly set out.', appliesTo: ['traditional', 'timberFrame', 'hybrid'], photoRequired: true },
      { id: 'bed-perp-filled', section: 'Band course masonry', label: 'Bed and perp joints fully filled', guidance: 'No open or incomplete bed/perp joints in the band course.', appliesTo: ['traditional', 'timberFrame', 'hybrid'] },
      { id: 'perp-alignment', section: 'Band course masonry', label: 'Perp alignment checked', guidance: 'Perp joints should not cumulatively run in the same direction for more than 5 joints; centre line generally within ±15mm over the next 5 successive perps.', appliesTo: ['traditional', 'timberFrame', 'hybrid'] },
      { id: 'clear-cavity', section: 'Band course masonry', label: 'Cavity clear at floor / band course', guidance: 'No mortar droppings, debris or obstruction in the cavity.', appliesTo: ['traditional', 'timberFrame', 'hybrid'], photoRequired: true },
      { id: '50mm-clear-cavity', section: 'Band course masonry', label: '50mm clear cavity maintained', guidance: 'Minimum 50mm residual clear cavity maintained where partial fill insulation is used.', appliesTo: ['traditional', 'timberFrame', 'hybrid'] },
      { id: 'beam-bearing', section: 'Bearing / support', label: 'Beam bearing checked', guidance: 'Beams have bearing to design/manufacturer requirement and are not bearing on loose material.', photoRequired: true },
      { id: 'beam-layout', section: 'Beam and block layout', label: 'Beam/block layout matches design', guidance: 'Beam spacing, direction, infill blocks and openings match latest floor design.' },
      { id: 'subfloor-void', section: 'Sub-floor ventilation', label: 'Sub-floor void and ventilation clear', guidance: 'Void clear of debris and ventilation paths/air bricks installed and unobstructed where required.', photoRequired: true },
      { id: 'services-protected', section: 'Services', label: 'Services and drainage protected', guidance: 'Service penetrations, drainage and ducts are in correct positions, protected and capped where required.' },
    ],
  },
  {
    id: 'slab-ground-bearing',
    title: 'Stage 2 — Ground-bearing slab',
    stage: 'Stage 2',
    description: 'Ground-bearing slab / oversite inspection before concrete pour.',
    items: [
      { id: 'slab-info', section: 'Information', label: 'Slab details available', guidance: 'Latest slab detail, FFL, slab level, thickness, insulation, DPM/gas membrane and service positions available.' },
      { id: 'subbase', section: 'Fill / sub-base', label: 'Fill/sub-base suitable and compacted', guidance: 'Clean, stable suitable fill compacted in layers with no soft spots, organic material or excessive voids.', photoRequired: true },
      { id: 'blinding', section: 'Blinding', label: 'Blinding suitable for DPM', guidance: 'Blinding provides a firm, even, smooth surface with no sharp hardcore likely to puncture the membrane.' },
      { id: 'dpm-lap', section: 'DPM / gas membrane', label: 'DPM laps and junctions checked', guidance: 'DPM clean/undamaged, linked to DPC and minimum 100mm lap unless welded/manufacturer detail states otherwise.', photoRequired: true },
      { id: 'dpc-level', section: 'DPM / gas membrane', label: 'DPC level checked where visible', guidance: 'DPC minimum 150mm above external finished ground/paving level where applicable.' },
      { id: 'insulation', section: 'Insulation', label: 'Insulation type/thickness checked', guidance: 'Insulation type and thickness match design, boards tightly butted, stable and protected.' },
      { id: 'reinforcement', section: 'Reinforcement', label: 'Reinforcement checked if required', guidance: 'Mesh/bar type, laps, spacers/chairs and cover to design where reinforcement is required.' },
      { id: 'pre-pour-photos', section: 'Pre-pour readiness', label: 'Photos taken before pour', guidance: 'Sub-base, blinding, DPM, services, insulation and reinforcement photographed before concrete hides the build-up.', photoRequired: true },
    ],
  },
  {
    id: 'superstructure-3a',
    title: 'Stage 3A — Joists / floor deck',
    stage: 'Stage 3',
    description: 'Inspection when joists are installed and floor deck is laid.',
    items: [
      { id: 'joist-layout', section: 'Joists / deck', label: 'Joist layout available and followed', guidance: 'Latest joist/floor layout available and joist size/type/centres match design.', photoRequired: true },
      { id: 'joist-bearing', section: 'Joists / deck', label: 'Joist bearings checked', guidance: 'Joist bearing to design/manufacturer requirement; hangers/straps installed where required.' },
      { id: 'trimmers', section: 'Joists / deck', label: 'Openings and trimmers formed correctly', guidance: 'Stairwell/service openings formed and supported to design.' },
      { id: 'deck-fixed', section: 'Joists / deck', label: 'Floor deck fixed correctly', guidance: 'Deck fixed to manufacturer/design requirement; joints supported/staggered as required.' },
      { id: 'no-unauthorised-cuts', section: 'Joists / deck', label: 'No unauthorised cutting/notching', guidance: 'No unauthorised cutting, drilling or notching to joists or structural members.' },
      { id: 'traditional-chasing', section: 'Masonry / frame interface', label: 'Traditional masonry interface checked', guidance: 'Masonry around floor zone, cavities, ties and insulation remain clean and correct.', appliesTo: ['traditional', 'hybrid'] },
      { id: 'frame-service-zones', section: 'Timber frame interface', label: 'Timber frame service zones protected', guidance: 'Services kept within service zones; no unauthorised cutting to structural studs/panels.', appliesTo: ['timberFrame', 'hybrid'] },
    ],
  },
  {
    id: 'superstructure-3b',
    title: 'Stage 3B — Roof framing / gables',
    stage: 'Stage 3',
    description: 'Inspection after roof framing and gables/spandrels are up.',
    items: [
      { id: 'roof-layout', section: 'Roof structure', label: 'Roof/truss layout available', guidance: 'Latest truss/roof layout, bracing, restraint and manufacturer details available at plot.', photoRequired: true },
      { id: 'trusses-positioned', section: 'Trusses', label: 'Trusses installed to layout', guidance: 'Truss type, positions, spacing, bearings, clips and fixings match design/manufacturer details.', photoRequired: true },
      { id: 'truss-bracing', section: 'Trusses', label: 'Truss bracing installed', guidance: 'Temporary/permanent bracing installed to truss design/manufacturer requirement.' },
      { id: 'no-truss-alteration', section: 'Trusses', label: 'No unauthorised truss alteration', guidance: 'No cutting, drilling, notching or modification to trusses without design approval.' },
      { id: 'gables', section: 'Gables / restraint', label: 'Gables and restraint checked', guidance: 'Gables built to line/height; restraint straps and wall plate restraint installed to design.' },
      { id: 'spandrels', section: 'Spandrel panels', label: 'Spandrel panels checked where used', guidance: 'Panel reference/orientation/support/fixings/bracing/fire/acoustic details match design/manufacturer detail.', photoRequired: true },
      { id: 'wall-tie-spacing', section: 'Masonry outer leaf', label: 'Wall tie spacing checked', guidance: 'General spacing max 900mm horizontal x 450mm vertical; within 225mm of openings/joints at max 300mm vertical spacing.', appliesTo: ['traditional', 'timberFrame', 'hybrid'], photoRequired: true },
      { id: 'tie-embedment-clean', section: 'Masonry outer leaf', label: 'Wall ties clean and embedded', guidance: 'Minimum 50mm embedment into each leaf; ties clean, drip centred in clear cavity and facing down.', appliesTo: ['traditional', 'timberFrame', 'hybrid'] },
      { id: 'cavity-trays', section: 'Openings / trays', label: 'Cavity trays, stop ends and weepholes checked', guidance: 'Cavity trays/combined lintel protection installed; stop ends where required; minimum 2 weepholes per opening and max 450mm centres.', appliesTo: ['traditional', 'timberFrame', 'hybrid'], photoRequired: true },
      { id: 'lintel-bearing', section: 'Openings / trays', label: 'Lintel bearing checked', guidance: 'Correct lintel, level on solid mortar bed, end bearing to design/manufacturer requirement and masonry overhang not more than 25mm.', appliesTo: ['traditional', 'hybrid'] },
      { id: 'timber-frame-membranes', section: 'Timber frame', label: 'Timber frame membranes/barriers checked', guidance: 'Breather membrane, cavity barriers, fire stopping and differential movement details intact and to manufacturer detail.', appliesTo: ['timberFrame', 'hybrid'], photoRequired: true },
    ],
  },
  {
    id: 'first-fix-carpentry',
    title: '1st Fix — Carpentry',
    stage: 'Stage 5',
    description: 'Carpentry first fix before works are covered.',
    items: [
      { id: 'stud-layout', section: 'Carpentry', label: 'Stud / partition layout checked', guidance: 'Partitions, openings, stairs and trimming match latest layout.' },
      { id: 'pattressing', section: 'Carpentry', label: 'Noggins / pattressing installed', guidance: 'Provided for radiators, kitchen units, sanitaryware, handrails, boards and fittings.', photoRequired: true },
      { id: 'door-openings', section: 'Carpentry', label: 'Door openings checked', guidance: 'Openings suit frame schedule and are square/plumb.' },
      { id: 'service-holes', section: 'Carpentry', label: 'Service holes/notches controlled', guidance: 'No unauthorised cutting, drilling or notching to structural members.' },
      { id: 'tf-service-zones', section: 'Timber frame', label: 'Timber frame service zones maintained', guidance: 'Services remain in designated service zones; structural studs/panels not cut without approval.', appliesTo: ['timberFrame', 'hybrid'] },
    ],
  },
  {
    id: 'first-fix-plumbing',
    title: '1st Fix — Plumbing / heating',
    stage: 'Stage 5',
    description: 'Plumbing and heating first fix before covering.',
    items: [
      { id: 'plumbing-layout', section: 'Plumbing', label: 'Plumbing/heating layout available and followed', guidance: 'Hot/cold, sanitary, radiator/UFH/manifold/cylinder/service routes match latest design.' },
      { id: 'pipes-supported', section: 'Plumbing', label: 'Pipework clipped and protected', guidance: 'Pipework supported, protected through studs/joists/masonry and not loose or damaged.', photoRequired: true },
      { id: 'open-ends-capped', section: 'Plumbing', label: 'Open pipe ends capped', guidance: 'Pipe ends capped to prevent debris ingress.' },
      { id: 'pressure-test', section: 'Testing', label: 'Pressure test evidence available where required', guidance: 'Pressure test completed/recorded before covering where required.' },
      { id: 'tf-protection-plates', section: 'Timber frame', label: 'Protection plates fitted where needed', guidance: 'Protection plates/grommets fitted where services pass through timber members.', appliesTo: ['timberFrame', 'hybrid'] },
    ],
  },
  {
    id: 'first-fix-electrical',
    title: '1st Fix — Electrical',
    stage: 'Stage 5',
    description: 'Electrical first fix before covering.',
    items: [
      { id: 'electrical-layout', section: 'Electrical', label: 'Electrical layout available and followed', guidance: 'Socket, switch, lighting, smoke/heat alarm, consumer unit and isolator positions match latest layout.' },
      { id: 'safe-zones', section: 'Electrical', label: 'Cable routes / safe zones checked', guidance: 'Cable routes follow recognised safe zones or are suitably protected.', photoRequired: true },
      { id: 'cables-protected', section: 'Electrical', label: 'Cables protected and undamaged', guidance: 'No crushed, nicked, trapped cables or sharp metal edges without protection.' },
      { id: 'back-boxes', section: 'Electrical', label: 'Back boxes fixed securely', guidance: 'Back boxes fixed securely, plumb and in the correct locations/heights.' },
      { id: 'tf-electrical-zones', section: 'Timber frame', label: 'Timber frame electrical protection checked', guidance: 'Cables kept in service zones with protection plates where passing through timber.', appliesTo: ['timberFrame', 'hybrid'] },
    ],
  },
  {
    id: 'first-fix-ventilation',
    title: '1st Fix — Ventilation',
    stage: 'Stage 5',
    description: 'Extract / MEV / MVHR ductwork before covering.',
    items: [
      { id: 'vent-layout', section: 'Ventilation', label: 'Ventilation design available and followed', guidance: 'Fan/MVHR/terminal positions and duct routes match latest ventilation design.' },
      { id: 'ducts-supported', section: 'Ventilation', label: 'Ducts clipped and supported', guidance: 'Ducts supported to prevent sagging, crushing or kinking.', photoRequired: true },
      { id: 'duct-route', section: 'Ventilation', label: 'Duct route coordinated', guidance: 'No clashes with structure, fire/acoustic lines, services or future boarding.' },
      { id: 'condensate', section: 'Ventilation', label: 'Condensate route considered', guidance: 'Condensate route/fall allowed where required.' },
    ],
  },
  {
    id: 'pre-plaster',
    title: 'Pre-plaster / pre-board inspection',
    stage: 'Stage 5',
    description: 'Holistic final check after all first fix trades and before plasterboard/drylining hides the work.',
    items: [
      { id: 'all-first-fix-complete', section: 'Completion check', label: 'All 1st fix inspections complete', guidance: 'Carpentry, plumbing/heating, electrical and ventilation first fix checks completed or recorded as not applicable.', photoRequired: true },
      { id: 'services-coordinated', section: 'Coordination', label: 'Services coordinated', guidance: 'No obvious clashes between plumbing, electrics, heating, ventilation, structure and future board/fixing zones.' },
      { id: 'services-protected', section: 'Coordination', label: 'Services protected before boarding', guidance: 'Pipework, cables and ducts protected from boarding/fixing damage and supported correctly.' },
      { id: 'fire-stopping', section: 'Fire / acoustic / thermal', label: 'Fire stopping and cavity barriers checked', guidance: 'Fire-stopping locations complete or clearly scheduled before boarding; cavity/fire barriers not damaged or displaced.', photoRequired: true },
      { id: 'insulation', section: 'Fire / acoustic / thermal', label: 'Thermal/acoustic insulation checked', guidance: 'Insulation correct type/thickness, complete, tight, not gapped, slumped, wet or contaminated.' },
      { id: 'avcl', section: 'Timber frame / vapour control', label: 'AVCL / vapour control checked where required', guidance: 'AVCL/vapour control layer details, laps, seals and penetrations protected where applicable.', appliesTo: ['timberFrame', 'hybrid'], photoRequired: true },
      { id: 'no-tf-cuts', section: 'Timber frame', label: 'No unauthorised timber frame cutting', guidance: 'No unauthorised cutting, drilling or notching of structural timber frame studs/panels.', appliesTo: ['timberFrame', 'hybrid'] },
      { id: 'traditional-chases', section: 'Traditional masonry', label: 'Chases and masonry penetrations checked', guidance: 'Chases/penetrations controlled, protected, made good where required and not excessive.', appliesTo: ['traditional', 'hybrid'] },
      { id: 'wet-areas', section: 'Boarding readiness', label: 'Wet areas and board types confirmed', guidance: 'Moisture/fire/acoustic/tile backing board locations confirmed; noggins/supports in place.' },
      { id: 'photos-before-board', section: 'Evidence', label: 'Photos taken before boarding', guidance: 'All key first fix, fire, acoustic, thermal, AVCL and service details photographed before covering.', photoRequired: true },
    ],
  },
];

export function getChecklistDefinition(checklistId: string) {
  return CHECKLIST_DEFINITIONS.find((checklist) => checklist.id === checklistId) ?? CHECKLIST_DEFINITIONS[0];
}

export function appliesToMethod(item: ChecklistItem, method: ConstructionMethod) {
  const appliesTo = item.appliesTo ?? ['all'];
  if (appliesTo.includes('all')) return true;
  if (appliesTo.includes(method)) return true;
  if (method === 'hybrid' && (appliesTo.includes('traditional') || appliesTo.includes('timberFrame'))) return true;
  if (method === 'projectSpecific') return true;
  return false;
}

export function getChecklistItems(checklistId: string, method: ConstructionMethod, customItems: CustomChecklistItem[] = []) {
  const definition = getChecklistDefinition(checklistId);
  const customChecklistItems: ChecklistItem[] = customItems.map((item) => ({
    id: `custom-${item.id}`,
    section: 'Custom site checks',
    label: item.label,
    guidance: item.guidance || 'Site-added checklist item. Applies to every inspection checklist.',
    appliesTo: ['all'],
    photoRequired: false,
  }));
  return [...universalItems, ...definition.items, ...customChecklistItems].filter((item) => appliesToMethod(item, method));
}
