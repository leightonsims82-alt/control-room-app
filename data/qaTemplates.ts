import { QAInspectionItem } from '../types/qa';
import { TemplateActivity } from '../utils/templateProgramme';

export type QACheckTemplate = {
  id: string;
  title: string;
  description: string;
  items: Array<{ id: string; trade: string; check: string }>;
};

const foundation: QACheckTemplate = {
  id: 'foundation',
  title: 'Foundation Inspection',
  description: 'Confirm formation, dimensions, services and concrete readiness before the stage is closed.',
  items: [
    { id: 'fnd-01', trade: 'Groundworker', check: 'Setting out matches the approved drawing' },
    { id: 'fnd-02', trade: 'Groundworker', check: 'Excavation width and depth are acceptable' },
    { id: 'fnd-03', trade: 'Groundworker', check: 'Suitable bearing ground is visible with no soft spots' },
    { id: 'fnd-04', trade: 'Groundworker', check: 'Trench bottoms are clean and free from standing water' },
    { id: 'fnd-05', trade: 'Groundworker', check: 'Services and drainage crossings are coordinated and protected' },
    { id: 'fnd-06', trade: 'Groundworker', check: 'Concrete level, finish and protection are acceptable' },
  ],
};

const drainage: QACheckTemplate = {
  id: 'drainage',
  title: 'Drainage Inspection',
  description: 'Inspect drainage before protection, testing and backfill.',
  items: [
    { id: 'dng-01', trade: 'Groundworker', check: 'Drainage layout matches the approved drawing' },
    { id: 'dng-02', trade: 'Groundworker', check: 'Pipes are laid to the correct line and fall' },
    { id: 'dng-03', trade: 'Groundworker', check: 'Pipes are correctly bedded and supported' },
    { id: 'dng-04', trade: 'Groundworker', check: 'Joints are correctly made and fully seated' },
    { id: 'dng-05', trade: 'Groundworker', check: 'Inspection chambers and access points are correctly positioned' },
    { id: 'dng-06', trade: 'Groundworker', check: 'Drainage testing is complete and recorded where required' },
  ],
};

const superstructure: QACheckTemplate = {
  id: 'superstructure',
  title: 'Superstructure Inspection',
  description: 'Confirm masonry, cavities, restraint and openings before the envelope progresses.',
  items: [
    { id: 'sup-01', trade: 'Bricklayer', check: 'Masonry is line, level and plumb within acceptable tolerances' },
    { id: 'sup-02', trade: 'Bricklayer', check: 'Cavities are clean and free from mortar droppings' },
    { id: 'sup-03', trade: 'Bricklayer', check: 'Wall ties are correctly spaced, embedded and oriented' },
    { id: 'sup-04', trade: 'Bricklayer', check: 'Cavity trays, DPCs and weep vents are complete where required' },
    { id: 'sup-05', trade: 'Bricklayer', check: 'Lintels, bearings and openings match the design' },
    { id: 'sup-06', trade: 'Carpenter', check: 'Restraint straps, bracing and structural timber details are complete' },
    { id: 'sup-07', trade: 'Site Team', check: 'Fire stopping and cavity barriers are complete where applicable' },
  ],
};

const timberFrame: QACheckTemplate = {
  id: 'timber-frame',
  title: 'Timber Frame Inspection',
  description: 'Inspect frame erection, restraint, membranes and interfaces before closing up.',
  items: [
    { id: 'tf-01', trade: 'Carpenter', check: 'Sole plates are level, fixed and correctly positioned' },
    { id: 'tf-02', trade: 'Carpenter', check: 'Panels are plumb, aligned and fixed to the erection design' },
    { id: 'tf-03', trade: 'Carpenter', check: 'Bracing, straps and hold-down details are complete' },
    { id: 'tf-04', trade: 'Carpenter', check: 'Openings and structural interfaces match the design' },
    { id: 'tf-05', trade: 'Carpenter', check: 'Breather membranes and laps are complete and undamaged' },
    { id: 'tf-06', trade: 'Site Team', check: 'Fire stopping and cavity barriers are complete where required' },
  ],
};

const externalEnvelope: QACheckTemplate = {
  id: 'external-envelope',
  title: 'External Envelope Inspection',
  description: 'Confirm external masonry, windows, membranes and weathering interfaces.',
  items: [
    { id: 'ext-01', trade: 'Bricklayer', check: 'External masonry finish, joints and alignment are acceptable' },
    { id: 'ext-02', trade: 'Bricklayer', check: 'Cavity trays, weeps and cavity barriers are complete' },
    { id: 'ext-03', trade: 'Window Fitter', check: 'Windows and doors are correctly fixed, sealed and protected' },
    { id: 'ext-04', trade: 'Roofer', check: 'Flashings and abutments are complete and weather-tight' },
    { id: 'ext-05', trade: 'Site Team', check: 'Envelope penetrations are sealed and recorded' },
  ],
};

const prePlaster: QACheckTemplate = {
  id: 'pre-plaster',
  title: 'Pre-Plaster Inspection',
  description: 'Inspect concealed work before boarding, plastering or closing up.',
  items: [
    { id: 'pp-01', trade: 'Carpenter', check: 'Framing, noggins, grounds and door openings are complete' },
    { id: 'pp-02', trade: 'Plumber', check: 'First-fix plumbing is complete, tested and protected' },
    { id: 'pp-03', trade: 'Electrician', check: 'First-fix electrical installation is complete and protected' },
    { id: 'pp-04', trade: 'Sprinkler', check: 'First-fix sprinkler installation is complete and coordinated' },
    { id: 'pp-05', trade: 'Site Team', check: 'Insulation is complete, continuous and correctly fitted' },
    { id: 'pp-06', trade: 'Site Team', check: 'Fire stopping and acoustic sealing are complete' },
    { id: 'pp-07', trade: 'Site Team', check: 'Photographic evidence of concealed work is complete' },
  ],
};

const preHandover: QACheckTemplate = {
  id: 'pre-handover',
  title: 'Pre-Handover Inspection',
  description: 'Complete the final quality, function and readiness review before home tour or handover.',
  items: [
    { id: 'pho-01', trade: 'Site Team', check: 'All rooms and external areas are clean, safe and accessible' },
    { id: 'pho-02', trade: 'Site Team', check: 'Outstanding trade defects are recorded and allocated' },
    { id: 'pho-03', trade: 'Carpenter', check: 'Doors, ironmongery, stairs and joinery operate correctly' },
    { id: 'pho-04', trade: 'Plumber', check: 'Sanitaryware, heating and water services operate correctly' },
    { id: 'pho-05', trade: 'Electrician', check: 'Electrical accessories, lighting and certification are complete' },
    { id: 'pho-06', trade: 'Decorator', check: 'Decorative finishes are complete and free from visible defects' },
    { id: 'pho-07', trade: 'Kitchen fitter', check: 'Kitchen units, worktops and appliances are complete and undamaged' },
    { id: 'pho-08', trade: 'Site Team', check: 'Handover documents, keys and commissioning evidence are ready' },
  ],
};

const generic: QACheckTemplate = {
  id: 'generic',
  title: 'Quality Inspection',
  description: 'Record quality, readiness and evidence for this programme gateway.',
  items: [
    { id: 'gen-01', trade: 'Site Team', check: 'Work matches the current drawings and specification' },
    { id: 'gen-02', trade: 'Site Team', check: 'Visible quality and tolerances are acceptable' },
    { id: 'gen-03', trade: 'Site Team', check: 'The area is safe, clean and ready for the next activity' },
    { id: 'gen-04', trade: 'Site Team', check: 'Required test results and photographic evidence are available' },
  ],
};

export function isQAActivity(activity: Pick<TemplateActivity, 'code' | 'trade' | 'displayText'>) {
  const text = `${activity.code} ${activity.displayText}`.toLowerCase();
  return activity.trade === 'Site Team' && (text.includes('qa') || text.includes('inspection'));
}

export function isQualityGatewayActivity(activity: Pick<TemplateActivity, 'code' | 'trade' | 'displayText'>) {
  const text = `${activity.code} ${activity.displayText}`.toLowerCase();
  return isQAActivity(activity) || text.includes('foundation');
}

export function getQATemplateForActivity(activityCode: string, templateId?: string): QACheckTemplate {
  const text = activityCode.toLowerCase();
  if (text.includes('foundation')) return foundation;
  if (text.includes('drain')) return drainage;
  if (text.includes('frame qa')) return timberFrame;
  if (text.includes('external')) return externalEnvelope;
  if (text.includes('superstructure')) return superstructure;
  if (text.includes('pre plaster') || text.includes('pre-plaster')) return prePlaster;
  if (text.includes('pre handover') || text.includes('pre-handover') || text.includes('home tour')) return preHandover;
  if (templateId === 'timberFrame' && text.includes('frame')) return timberFrame;
  return generic;
}

export function createQAItems(activityCode: string, templateId?: string): QAInspectionItem[] {
  return getQATemplateForActivity(activityCode, templateId).items.map((item) => ({
    id: `${item.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    templateItemId: item.id,
    trade: item.trade,
    check: item.check,
    answer: 'Not checked',
    fixed: 'Not checked',
  }));
}
