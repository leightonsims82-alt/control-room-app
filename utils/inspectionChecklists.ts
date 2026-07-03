import { ConstructionMethod } from './templateProgramme';
import { ProgrammeStageNumber } from './siteProgrammeEngine';

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

const commonReadinessItems: ChecklistItem[] = [
  {
    id: 'info-available',
    section: 'Readiness',
    label: 'Information available at plot',
    guidance: 'Latest relevant drawing/detail/specification is available before the inspection is completed.',
    appliesTo: ['all'],
  },
  {
    id: 'plot-accessible',
    section: 'Readiness',
    label: 'Plot accessible',
    guidance: 'Safe access is available to inspect the work without obstruction.',
    appliesTo: ['all'],
    photoRequired: true,
  },
  {
    id: 'work-visible',
    section: 'Readiness',
    label: 'Work visible before covering',
    guidance: 'The relevant work is visible and has not been covered before inspection/photos.',
    appliesTo: ['all'],
    photoRequired: true,
  },
];

export const CHECKLIST_DEFINITIONS: ChecklistDefinition[] = [
  {
    id: 'foundation-formation',
    title: 'Foundation formation',
    stage: 'Stage 1',
    description: 'Formation inspection before concrete. Select strip/trench fill, piled or raft in the description if needed.',
    items: [
      { id: 'foundation-type', section: 'Information', label: 'Foundation type confirmed', guidance: 'Strip/trench fill, piled or raft confirmed against the latest design.', photoRequired: true },
      { id: 'levels-indicated', section: 'Information', label: 'Concrete levels indicated', guidance: 'Concrete level markers/datum are indicated at the plot before pour.' },
      { id: 'centre-lines', section: 'Setting out', label: 'Centre lines marked', guidance: 'Centre lines/foundation lines are clearly marked and visible.', photoRequired: true },
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
    description: 'Drainage inspection before covering, backfill, floor or slab works. Tolerances are shown on screen; measurements can be added in the description only if useful.',
    items: [
      { id: 'drain-layout', section: 'Information', label: 'Drainage layout available', guidance: 'Latest drainage layout, pipe routes, sizes, gradients and rodding access are available.' },
      { id: '100mm-fall', section: 'Falls / gradients', label: '100mm pipe gradient', guidance: 'Not flatter than 1:80 where applicable, unless design states otherwise.', photoRequired: true },
      { id: '150mm-fall', section: 'Falls / gradients', label: '150mm pipe gradient', guidance: 'Not flatter than 1:150 where applicable, unless design states otherwise.', photoRequired: true },
      { id: 'low-flow-fall', section: 'Falls / gradients', label: 'Low-flow 100mm pipe', guidance: '1:40 where flow is less than 1.0L/sec, unless design states otherwise.' },
      { id: 'no-backfall', section: 'Falls / gradients', label: 'No visible backfall', guidance: 'No visible or measured backfall when checked on site.' },
      { id: 'pipe-bedding', section: 'Bedding / support', label: 'Bedding and support suitable', guidance: 'Pipe supported throughout its length. No bricks, blocks, hard spots or random packing below pipe.', photoRequired: true },
      { id: 'pipe-ends-capped', section: 'Protection', label: 'Open pipe ends capped', guidance: 'Open ends capped/protected to prevent debris entering.' },
      { id: 'wall-clearance', section: 'Walls / foundations', label: 'Pipe clearance through wall/foundation', guidance: '50mm clearance all round, or sleeve with 50mm clearance all round, where this detail applies.', photoRequired: true },
      { id: 'flexible-joints', section: 'Walls / foundations', label: 'Flexible joints positioned', guidance: 'Flexible joints as close as feasible and max 150mm from wall face where required.' },
      { id: 'rocker-length', section: 'Walls / foundations', label: 'Rocker length checked', guidance: 'Rocker pipe length max 600mm where required by detail.' },
      { id: 'rodding-access', section: 'Access', label: 'Rodding access provided', guidance: 'Rodding access / inspection chamber locations provided as design.' },
      { id: 'drainage-photos', section: 'Evidence', label: 'Drainage photographed before covering', guidance: 'Runs, junctions, bedding, penetrations and key details photographed before covering.', photoRequired: true },
    ],
  },
  {
    id: 'slab-ground-bearing',
    title: 'Ground-bearing slab / oversite',
    stage: 'Stage 2',
    description: 'Slab / oversite inspection before concrete or before covering the floor build-up.',
    items: [
      { id: 'slab-detail', section: 'Information', label: 'Slab details available', guidance: 'Latest slab detail, FFL, thickness, DPM/gas membrane, insulation and service positions available.' },
      { id: 'subbase', section: 'Sub-base', label: 'Sub-base suitable', guidance: 'Clean, stable suitable fill compacted and free from soft spots/organic material.', photoRequired: true },
      { id: 'blinding', section: 'Blinding', label: 'Blinding suitable', guidance: 'Firm, even, smooth surface with no sharp hardcore likely to puncture membrane.' },
      { id: 'dpm', section: 'DPM / membrane', label: 'DPM / gas membrane checked', guidance: 'Membrane clean, undamaged, lapped/sealed and linked to DPC/detail as required.', photoRequired: true },
      { id: 'insulation', section: 'Insulation', label: 'Insulation checked', guidance: 'Type/thickness to design. Boards tightly butted, stable and protected.' },
      { id: 'reinforcement', section: 'Reinforcement', label: 'Reinforcement checked where required', guidance: 'Mesh/bar type, laps, spacers/chairs and cover to design.', photoRequired: true },
    ],
  },
  {
    id: 'first-fix-carpentry',
    title: '1st Fix Carpentry',
    stage: 'Stage 5',
    description: 'Carpentry first fix before boarding or covering.',
    items: [
      { id: 'stud-layout', section: 'Carpentry', label: 'Stud / partition layout checked', guidance: 'Partitions, openings, stairs and trimming match latest layout.' },
      { id: 'pattressing', section: 'Carpentry', label: 'Noggins / pattressing installed', guidance: 'Provided for radiators, kitchen units, sanitaryware, handrails, boards and fittings.', photoRequired: true },
      { id: 'door-openings', section: 'Carpentry', label: 'Door openings checked', guidance: 'Openings suit frame schedule and are square/plumb.' },
      { id: 'service-holes', section: 'Carpentry', label: 'No unauthorised cuts/notches', guidance: 'No unauthorised cutting, drilling or notching to structural members.' },
      { id: 'tf-service-zones', section: 'Timber frame', label: 'Timber frame service zones maintained', guidance: 'Services remain in designated service zones; structural studs/panels not cut without approval.', appliesTo: ['timberFrame', 'hybrid'] },
    ],
  },
  {
    id: 'first-fix-plumbing',
    title: '1st Fix Plumbing / Heating',
    stage: 'Stage 5',
    description: 'Plumbing and heating first fix before covering.',
    items: [
      { id: 'plumbing-layout', section: 'Plumbing', label: 'Plumbing/heating layout followed', guidance: 'Hot/cold, sanitary, radiator/UFH/manifold/cylinder/service routes match latest design.' },
      { id: 'pipes-supported', section: 'Plumbing', label: 'Pipework clipped and protected', guidance: 'Pipework supported, protected through studs/joists/masonry and not loose or damaged.', photoRequired: true },
      { id: 'open-ends-capped', section: 'Plumbing', label: 'Open pipe ends capped', guidance: 'Pipe ends capped to prevent debris ingress.' },
      { id: 'pressure-test', section: 'Testing', label: 'Pressure test evidence available', guidance: 'Pressure test completed/recorded before covering where required.' },
    ],
  },
  {
    id: 'first-fix-electrical',
    title: '1st Fix Electrical',
    stage: 'Stage 5',
    description: 'Electrical first fix before covering.',
    items: [
      { id: 'electrical-layout', section: 'Electrical', label: 'Electrical layout followed', guidance: 'Socket, switch, lighting, smoke/heat alarm, consumer unit and isolator positions match latest layout.' },
      { id: 'safe-zones', section: 'Electrical', label: 'Cable routes / safe zones checked', guidance: 'Cable routes follow recognised safe zones or are suitably protected.', photoRequired: true },
      { id: 'cables-protected', section: 'Electrical', label: 'Cables protected and undamaged', guidance: 'No crushed, nicked, trapped cables or sharp metal edges without protection.' },
      { id: 'back-boxes', section: 'Electrical', label: 'Back boxes fixed securely', guidance: 'Back boxes fixed securely, plumb and in the correct locations/heights.' },
    ],
  },
  {
    id: 'pre-plaster',
    title: 'Pre-plaster / pre-board',
    stage: 'Stage 5',
    description: 'Holistic final check after first fix trades and before plasterboard/drylining hides the work.',
    items: [
      { id: 'all-first-fix-complete', section: 'Completion', label: 'All first fix works complete', guidance: 'Carpentry, plumbing/heating, electrical and ventilation first fix complete or recorded as not applicable.', photoRequired: true },
      { id: 'services-coordinated', section: 'Coordination', label: 'Services coordinated', guidance: 'No obvious clashes between plumbing, electrics, heating, ventilation, structure and future boards.' },
      { id: 'fire-stopping', section: 'Fire / acoustic / thermal', label: 'Fire stopping / cavity barriers checked', guidance: 'Fire-stopping locations complete or clearly scheduled before boarding.', photoRequired: true },
      { id: 'insulation', section: 'Fire / acoustic / thermal', label: 'Thermal/acoustic insulation checked', guidance: 'Correct type/thickness, complete, tight, not gapped, slumped, wet or contaminated.' },
      { id: 'photos-before-board', section: 'Evidence', label: 'Photos taken before boarding', guidance: 'Key first fix, fire, acoustic, thermal and service details photographed before covering.', photoRequired: true },
    ],
  },
  {
    id: 'second-fix-trade',
    title: '2nd Fix Trade QA',
    stage: 'Stage 7',
    description: 'Simple second fix trade inspection for carpentry, plumbing, electrical or other second fix activities.',
    items: [
      { id: 'works-complete', section: 'Completion', label: 'Works complete to programme item', guidance: 'The trade item is complete enough to be signed off for this plot/fix.', photoRequired: true },
      { id: 'aligned-secure', section: 'Quality', label: 'Installed plumb/level/secure', guidance: 'Visible items are aligned, securely fixed and free from obvious damage.' },
      { id: 'operational', section: 'Testing', label: 'Operation checked where applicable', guidance: 'Doors, drawers, fittings, valves, sockets, lights or equipment operate where applicable.' },
      { id: 'protection-clean', section: 'Protection', label: 'Protected and clean for next trade', guidance: 'Completed work protected and area left ready for following trades.' },
    ],
  },
  {
    id: 'finals-trade',
    title: 'Finals Trade QA',
    stage: 'Stage 9',
    description: 'Finals inspection for trade completion before flooring, final decoration or pre-handover.',
    items: [
      { id: 'finals-complete', section: 'Completion', label: 'Finals complete', guidance: 'Final trade works are complete and no obvious outstanding items remain.', photoRequired: true },
      { id: 'tested', section: 'Testing', label: 'Testing / operation complete', guidance: 'Accessible items have been tested or checked where applicable.' },
      { id: 'damage-free', section: 'Quality', label: 'No obvious damage', guidance: 'No obvious visible damage, poor finish or incomplete making good.' },
      { id: 'ready-next-stage', section: 'Handover', label: 'Ready for next stage', guidance: 'Area is clean, accessible and ready for the next trade or handover activity.' },
    ],
  },
  {
    id: 'pre-handover',
    title: 'Pre-handover',
    stage: 'Stage 11',
    description: 'Simple plot pre-handover inspection before customer/homeowner handover.',
    items: [
      { id: 'plot-ready', section: 'Readiness', label: 'Plot substantially complete', guidance: 'Plot is complete enough for pre-handover inspection and all areas can be viewed.', photoRequired: true },
      { id: 'clean-accessible', section: 'Readiness', label: 'Clean and accessible', guidance: 'Plot clean enough to inspect; surfaces visible and access available.' },
      { id: 'doors-windows', section: 'Openings', label: 'Doors and windows operate', guidance: 'Doors/windows open, close, latch and lock without obvious binding or damage.' },
      { id: 'kitchen', section: 'Kitchen', label: 'Kitchen complete', guidance: 'Units, doors, drawers, worktops, sink, appliances and sealant complete and undamaged.', photoRequired: true },
      { id: 'bathrooms', section: 'Wet rooms', label: 'Bathrooms / WC complete', guidance: 'Sanitaryware secure and undamaged; taps/wastes tested; sealant complete.', photoRequired: true },
      { id: 'electrical', section: 'Services', label: 'Electrical items operational', guidance: 'Lights, sockets, smoke/heat alarms, extract fans and consumer unit labels checked where accessible.' },
      { id: 'plumbing-heating', section: 'Services', label: 'Plumbing / heating operational', guidance: 'Hot/cold water, heating, radiators and visible fittings checked with no obvious leaks.' },
      { id: 'decoration', section: 'Finishes', label: 'Decoration and finishes acceptable', guidance: 'No obvious unfinished paintwork, damage, poor making good or incomplete trims.' },
      { id: 'external', section: 'External', label: 'External works safe and complete', guidance: 'Paths, drainage, DPC/vents, boundaries and immediate external areas checked where part of handover.' },
      { id: 'handover-pack', section: 'Documents', label: 'Handover documents available', guidance: 'Certificates, manuals, warranties, meter/stop tap information and keys/fobs available where required.' },
    ],
  },
  {
    id: 'trade-fix-inspection',
    title: 'Trade Fix QA',
    stage: 'Programme item',
    description: 'Simple trade inspection used when a programme item does not have a specific checklist yet.',
    items: [
      { id: 'work-complete', section: 'Completion', label: 'Work complete for this fix', guidance: 'The programmed fix/activity is complete for this plot.', photoRequired: true },
      { id: 'work-quality', section: 'Quality', label: 'Work quality acceptable', guidance: 'Visible work is neat, secure, undamaged and ready for the next stage.' },
      { id: 'trade-clear', section: 'Coordination', label: 'Area ready for following trade', guidance: 'Area left clean, safe, protected and ready for the next trade/activity.' },
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
  return [...commonReadinessItems, ...definition.items, ...customChecklistItems].filter((item) => appliesToMethod(item, method));
}

export function getChecklistIdForActivity(activityCode: string, trade: string, stage: ProgrammeStageNumber) {
  const code = activityCode.toUpperCase();
  const tradeName = trade.toLowerCase();

  if (code === 'FND') return 'foundation-formation';
  if (code === 'DNG') return 'internal-drainage';
  if (code === 'SLAB') return 'slab-ground-bearing';
  if (code === '1ST CARP') return 'first-fix-carpentry';
  if (code === '1ST PLUMB' || code === '1ST SPRINKLER') return 'first-fix-plumbing';
  if (code === '1ST ELEC') return 'first-fix-electrical';
  if (code === 'PRE-PLASTER QA' || code === 'PP') return 'pre-plaster';
  if (code.startsWith('2ND') || stage === 7) return 'second-fix-trade';
  if (code.includes('FINALS') || stage === 9) return 'finals-trade';
  if (code === 'PRE HANDOVER') return 'pre-handover';
  if (tradeName.includes('handover')) return 'pre-handover';

  return 'trade-fix-inspection';
}
