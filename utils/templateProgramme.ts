import { getProgrammeDateForWorkingDayIndex, getProgrammeWeekForDate, getProgrammeWorkingDayIndexForDate } from './programmeDates';
import { ActivityDelay, BUILD_SEQUENCE, getStageNumberForRelativeWeek, ProgrammeActivity, ProgrammeStageNumber, PROGRAMME_STAGE_SEQUENCE, SitePlot, TRADE_ORDER } from './siteProgrammeEngine';

export type TemplateSitePlot = SitePlot & {
  templateId?: string;
  houseTypeId?: string;
  constructionMethod?: ConstructionMethod;
  buildOrder?: number;
  holdStage?: ProgrammeStageNumber;
  holdReason?: string;
  holdUpdatedAt?: string;
  plotStartDate?: string;
  plotCompletionDate?: string;
  finalStageAdjustmentWeeks?: number;
};

export type ConstructionMethod = 'traditional' | 'timberFrame' | 'hybrid' | 'projectSpecific';
export type ActivityMove = { id: string; plotId: string; activityCode: string; deltaDays: number; updatedAt: string };

export type OverlapStartFrom = 'start' | 'finish';

export type TemplateActivity = ProgrammeActivity & {
  overlapAllowed?: boolean;
  overlapLinkCode?: string;
  overlapStartFrom?: OverlapStartFrom;
  overlapLagDays?: number;
  autoAddedForThreeStorey?: boolean;
  autoThreeStoreyFixDay?: boolean;
};

export type PlotTemplate = {
  id: string;
  name: string;
  houseTypeCode?: string;
  constructionMethod?: ConstructionMethod;
  bedrooms?: number;
  floors?: number;
  isHouseType?: boolean;
  isSystemTemplate?: boolean;
  standardVersion?: number;
  description: string;
  programmeWeeks: number;
  stageCount: number;
  activities: TemplateActivity[];
};

export type SiteProgrammeSetup = {
  siteName: string;
  defaultProgrammeWeeks: number;
  stageCount: number;
  workingWeek: string;
  includeSaturday: boolean;
  includeSunday: boolean;
  programmeStartDate: string;
  calendarWeekOne?: number;
};

export const DEFAULT_SITE_PROGRAMME_SETUP: SiteProgrammeSetup = {
  siteName: 'New Site',
  defaultProgrammeWeeks: 25,
  stageCount: 9,
  workingWeek: '5 days - Monday to Friday',
  includeSaturday: false,
  includeSunday: false,
  programmeStartDate: '05/01/2026',
};

export const STAGE_LABELS: Record<number, string> = {
  1: 'Foundations',
  2: 'Oversite / slab',
  3: 'Superstructure start',
  4: 'Wall plate',
  5: 'Roof',
  6: '1st fix / pre-plaster',
  7: '2nd Fix',
  8: 'Decoration / finish',
  9: 'Handover',
};

const WEEKS_IN_YEAR = 52;
const DEFAULT_WORKING_DAYS_IN_WEEK = 5;

export function getWorkingDayNumbers(setup?: Partial<SiteProgrammeSetup>) {
  const days = [1, 2, 3, 4, 5];
  if (setup?.includeSaturday) days.push(6);
  if (setup?.includeSunday) days.push(7);
  return days;
}

export function isProgrammeWorkingDay(day: number, setup?: Partial<SiteProgrammeSetup>) {
  return getWorkingDayNumbers(setup).includes(day);
}

function workingDaysPerWeek(setup?: Partial<SiteProgrammeSetup>) {
  return getWorkingDayNumbers(setup).length || DEFAULT_WORKING_DAYS_IN_WEEK;
}

function programmeDayIndex(week: number, day: number, setup?: Partial<SiteProgrammeSetup>) {
  const workingDays = getWorkingDayNumbers(setup);
  const position = workingDays.indexOf(day);
  if (position < 0) return null;
  return (week - 1) * workingDays.length + position + 1;
}

function firstProgrammeDayIndexForWeek(week: number, setup?: Partial<SiteProgrammeSetup>) {
  return (week - 1) * workingDaysPerWeek(setup) + 1;
}

export function normaliseProgrammeWeek(week: number) {
  if (!Number.isFinite(week)) return 1;
  return Math.max(1, Math.round(week));
}

function makeTemplate(id: string, name: string, description: string, programmeWeeks = 25): PlotTemplate {
  return {
    id,
    name,
    description,
    programmeWeeks,
    stageCount: 9,
    activities: BUILD_SEQUENCE.map((activity) => ({
      ...activity,
      overlapAllowed: false,
      overlapStartFrom: 'start' as OverlapStartFrom,
      overlapLagDays: 0,
    })).filter((activity) => activity.durationDays > 0),
  };
}

function templateActivity(order: number, code: string, trade: string, displayText: string, durationDays: number, stage: ProgrammeActivity['stage'], overlapAllowed = false, overlapLinkCode?: string, overlapStartFrom: OverlapStartFrom = 'start', overlapLagDays = 0): TemplateActivity {
  return { order, code, trade, displayText, durationDays, relativeWeek: 1, relativeDay: 1, stage, overlapAllowed, overlapLinkCode, overlapStartFrom, overlapLagDays };
}

function makeFourBedroomStandardTemplate(): PlotTemplate {
  return {
    id: 'fourBedStandard',
    name: '4 Bedroom Standard Programme',
    description: 'Locked standard 4 bedroom programme supplied for this development.',
    bedrooms: 4,
    floors: 2,
    isHouseType: false,
    isSystemTemplate: true,
    standardVersion: 2,
    programmeWeeks: 25,
    stageCount: 9,
    activities: [
      templateActivity(1, 'Foundations', 'Groundworker', 'Foundations', 5, 1),
      templateActivity(2, 'Substructure', 'Groundworker', 'Substructure', 5, 1),
      templateActivity(3, 'Drainage', 'Groundworker', 'Drainage', 5, 1),
      templateActivity(4, 'QA Drainage', 'Site Team', 'QA Drainage', 1, 1),
      templateActivity(5, 'NHBC Drainage', 'Site Team', 'NHBC Drainage', 1, 1),
      templateActivity(6, 'Band Course', 'Groundworker', 'Band Course', 2, 2),
      templateActivity(7, 'Slab Pour', 'Groundworker', 'Slab Pour', 5, 2),
      templateActivity(8, 'QA Slab', 'Site Team', 'QA Slab', 2, 2),
      templateActivity(9, '1st lift Brickwork', 'Bricklayer', '1st Lift', 7, 3),
      templateActivity(10, 'Base Lift Scaffold', 'Scaffolder', 'Base Lift', 2, 3),
      templateActivity(11, '2nd Lift Brickwork', 'Bricklayer', '2nd Lift', 3, 3),
      templateActivity(12, '2nd Lift Scaffold', 'Scaffolder', '2nd Lift Scaffold', 2, 3),
      templateActivity(13, 'Joist & Flooring', 'Carpenter', 'Joist & Flooring', 2, 3),
      templateActivity(14, '3rd Lift Brickwork', 'Bricklayer', '3rd Lift', 7, 3),
      templateActivity(15, '3rd & Bird Scaffold', 'Scaffolder', '3rd & Bird', 2, 3),
      templateActivity(16, 'Wall Plate', 'Carpenter', 'Wall Plate', 2, 4),
      templateActivity(17, 'Truss', 'Carpenter', 'Truss', 2, 5),
      templateActivity(18, 'Gables', 'Bricklayer', 'Gables', 4, 5),
      templateActivity(19, 'QA SS', 'Site Team', 'QA SS', 2, 5),
      templateActivity(20, 'NHBC SS', 'Site Team', 'NHBC SS', 1, 5),
      templateActivity(21, 'Felt and Batten', 'Roofer', 'Felt & Batten', 1, 5),
      templateActivity(22, 'Solar PV', 'Solar Installer', 'Solar PV', 1, 5),
      templateActivity(23, 'Roof tile', 'Roofer', 'Roof Tile', 2, 5),
      templateActivity(24, 'Strip Scaffold', 'Scaffolder', 'Strip Scaffold', 1, 5),
      templateActivity(25, '1st Fix Carp', 'Carpenter', '1st Fix Carp', 3, 6),
      templateActivity(26, 'Windows', 'Window Fitter', 'Windows', 1, 6),
      templateActivity(27, '1st fix plumbing', 'Plumber', '1st Fix Plumbing', 2, 6),
      templateActivity(28, '1st fix electrics', 'Electrician', '1st Fix Electrics', 2, 6),
      templateActivity(29, 'Cavity Blown Insulation', 'Insulation Installer', 'Cavity Insulation', 1, 6),
      templateActivity(30, 'QA PP', 'Site Team', 'QA PP', 2, 6),
      templateActivity(31, 'NHBC PP', 'Site Team', 'NHBC PP', 1, 6),
      templateActivity(32, 'Plasterboard Tacking', 'Dry liner', 'Tacking', 2, 6),
      templateActivity(33, 'Plasterboard Dabbing', 'Dry liner', 'Dabbing', 2, 6),
      templateActivity(34, 'Plasterboard Taping', 'Dry liner', 'Taping', 4, 6),
      templateActivity(35, 'Groundwork Externals', 'Groundworker', 'GW Externals', 3, 6),
      templateActivity(36, 'Drying', 'Site Team', 'Drying', 3, 6, true, 'Groundwork Externals', 'start', 0),
      templateActivity(37, 'Plasterboard Sand', 'Dry liner', 'Sand', 1, 6),
      templateActivity(38, 'Mist Coat', 'Decorator', 'Mist Coat', 1, 6),
      templateActivity(39, 'Loft insulation', 'Loft insulator', 'Loft Insulation', 1, 6),
      templateActivity(40, '2nd fix carpentry', 'Carpenter', '2nd Fix Carp', 3, 7),
      templateActivity(41, '2nd fix plumbing', 'Plumber', '2nd Fix Plumbing', 2, 7),
      templateActivity(42, '2nd fix electrics', 'Electrician', '2nd Fix Electrics', 2, 7),
      templateActivity(43, 'Kitchen Installation', 'Kitchen fitter', 'Kitchen', 1, 7),
      templateActivity(44, 'Patch', 'Dry liner', 'Patch', 2, 8),
      templateActivity(45, 'Pre Paint Clean', 'Cleaner', 'Pre Paint Clean', 1, 8),
      templateActivity(46, 'Decoration', 'Decorator', 'Decoration', 7, 8),
      templateActivity(47, 'Wall Tile', 'Tiler', 'Wall Tile', 1, 8),
      templateActivity(48, 'Plumbing Finals', 'Plumber', 'Plumbing Finals', 2, 9),
      templateActivity(49, 'Carpentry finals', 'Carpenter', 'Carpentry Finals', 1, 9),
      templateActivity(50, 'Electrical finals inc PV', 'Electrician', 'Electrical Finals', 1, 9),
      templateActivity(51, 'Appliances', 'Appliance fitter', 'Appliances', 1, 9),
      templateActivity(52, 'Snag Patch', 'Dry liner', 'Snag Patch', 2, 9),
      templateActivity(53, 'Dec Finals', 'Decorator', 'Dec Finals', 1, 9),
      templateActivity(54, 'Build Clean', 'Cleaner', 'Build Clean', 1, 9),
      templateActivity(55, 'Mastic', 'Mastic applicator', 'Mastic', 1, 9),
    ],
  };
}

function makeTimberFrameTemplate(): PlotTemplate {
  return {
    id: 'timberFrame',
    name: 'Timber Frame',
    description: 'Timber frame route using frame erection as the main structure driver, with external envelope and internal fixes prepared for overlap rules.',
    programmeWeeks: 25,
    stageCount: 9,
    activities: [
      templateActivity(1, 'Foundation', 'Groundworker', 'FND', 5, 1),
      templateActivity(2, 'Drainage', 'Groundworker', 'DNG', 5, 1),
      templateActivity(3, 'QA Drainage', 'Site Team', 'QA', 1, 1),
      templateActivity(4, 'Slab', 'Groundworker', 'Slab', 15, 2),
      templateActivity(5, 'Sole plate', 'Carpenter', 'Sole Plate', 1, 4),
      templateActivity(6, 'Timber frame delivery', 'Carpenter', 'TF Delivery', 1, 4),
      templateActivity(7, 'Timber frame erection', 'Carpenter', 'TF Frame', 5, 4),
      templateActivity(8, 'Frame QA', 'Site Team', 'Frame QA', 1, 4),
      templateActivity(9, 'Scaffold adapt', 'Scaffolder', 'Adapt', 2, 5),
      templateActivity(10, 'Truss', 'Carpenter', 'Truss', 3, 5),
      templateActivity(11, 'Roof membrane and batten', 'Roofer', 'RMB', 1, 5),
      templateActivity(12, 'Solar Panels', 'Solar Installer', 'Solar', 1, 5),
      templateActivity(13, 'Tile', 'Roofer', 'Tile', 2, 5),
      templateActivity(14, 'Windows', 'Window Fitter', 'Windows', 1, 5),
      templateActivity(15, 'External brickwork', 'Bricklayer', 'External BWK', 8, 5, true, 'Frame QA', 'finish', 1),
      templateActivity(16, 'External QA', 'Site Team', 'QA', 1, 5),
      templateActivity(17, '1st fix carpentry', 'Carpenter', '1st Carp', 3, 6, true, 'Windows', 'finish', 0),
      templateActivity(18, '1st fix Plumbing', 'Plumber', '1st plum', 2, 6, true, '1st fix carpentry', 'start', 1),
      templateActivity(19, '1st fix electrics', 'Electrician', '1st elec', 2, 6, true, '1st fix carpentry', 'start', 1),
      templateActivity(20, '1st fix sprinkler', 'Sprinkler', '1st sprinkler', 1, 6, true, '1st fix Plumbing', 'start', 1),
      templateActivity(21, 'QA pre plaster', 'Site Team', 'QA', 1, 6),
      templateActivity(22, 'Tac', 'Dry liner', 'Tac', 1, 6),
      templateActivity(23, 'dab', 'Dry liner', 'dab', 2, 6),
      templateActivity(24, 'tape and joint', 'Dry liner', 'tape', 3, 6),
      templateActivity(25, 'sand', 'Dry liner', 'sand', 4, 6),
      templateActivity(26, 'mist coat', 'Decorator', 'mist', 1, 6),
      templateActivity(27, '2nd fix carpentry', 'Carpenter', '2nd carp', 2, 7),
      templateActivity(28, '2nd fix plumbing', 'Plumber', '2nd plumb', 1, 7),
      templateActivity(29, '2nd fix electrician', 'Electrician', '2nd elec', 1, 7),
      templateActivity(30, 'Fit kitchen', 'Kitchen fitter', 'Kitchen', 2, 7),
      templateActivity(31, 'loft insulation', 'Loft insulator', 'Loft', 1, 7),
      templateActivity(32, 'patch', 'Dry liner', 'patch', 2, 8),
      templateActivity(33, 'Wall tile', 'Tiler', 'Tile', 1, 8),
      templateActivity(34, 'decorate', 'Decorator', 'dec', 5, 8),
      templateActivity(35, 'Carpentry Finals', 'Carpenter', 'Finals carp', 1, 9),
      templateActivity(36, 'Plumbing finals', 'Plumber', 'Finals Plumb', 1, 9),
      templateActivity(37, 'Electrical Finals', 'Electrician', 'Finals elec', 1, 9),
      templateActivity(38, 'Sprinkler commsision', 'Sprinkler', 'Sprinkler Com', 1, 9),
      templateActivity(39, 'build clean', 'Cleaner', 'Build clean', 1, 9),
      templateActivity(40, 'Sealant', 'Mastic applicator', 'Mastic', 1, 9),
      templateActivity(41, 'Fit appliances', 'Appliance fitter', 'Appliances', 1, 9),
      templateActivity(42, 'Snag patch', 'Dry liner', 'Snag patch', 2, 9),
      templateActivity(43, 'Decoration finals', 'Decorator', 'Dec Finals', 1, 9),
      templateActivity(44, 'Flooring', 'Floor layer', 'carpets/vinyl', 3, 9),
      templateActivity(45, 'Doors over carpets', 'Carpenter', 'DOC', 1, 9),
      templateActivity(46, 'Touch ups after carpets', 'Decorator', 'After carpets', 1, 9),
      templateActivity(47, 'Reclean', 'Cleaner', 'Reclean', 1, 9),
      templateActivity(48, 'QA Pre handover', 'Site Team', 'QA', 1, 9),
      templateActivity(49, 'Home tour', 'Site Team', 'Home tour', 1, 9),
    ],
  };
}

const siteStandardTemplate: PlotTemplate = {
  ...makeTemplate('threeBed', 'Site Standard Programme', 'Locked baseline programme used when creating house types', 25),
  bedrooms: 3,
  floors: 2,
  isHouseType: false,
  isSystemTemplate: true,
  standardVersion: 2,
};

const fourBedroomStandardTemplate = applyStandardHouseTypeStages(makeFourBedroomStandardTemplate());

const timberFrameSystemTemplate: PlotTemplate = {
  ...makeTimberFrameTemplate(),
  isHouseType: false,
  isSystemTemplate: true,
};

export const DEFAULT_PLOT_TEMPLATES: PlotTemplate[] = [
  applyStandardHouseTypeStages(siteStandardTemplate),
  fourBedroomStandardTemplate,
  timberFrameSystemTemplate,
];

export function getStandardTemplateIdForBedrooms(bedrooms: number) {
  return Math.round(Number(bedrooms)) === 4 ? 'fourBedStandard' : 'threeBed';
}

export const DEFAULT_TEMPLATE_PLOTS: TemplateSitePlot[] = [];

export function isProgrammeStageNumber(value: unknown): value is ProgrammeStageNumber {
  return PROGRAMME_STAGE_SEQUENCE.some((item) => item.stage === Number(value));
}
export function getPlotHoldLabel(plot: TemplateSitePlot) { return plot.holdStage ? `Stage ${plot.holdStage}` : 'Not held'; }
export function getPlotHoldDetail(plot: TemplateSitePlot) { return plot.holdStage ? `Held at Stage ${plot.holdStage}${plot.holdReason?.trim() ? `: ${plot.holdReason.trim()}` : ''}` : 'Plot is not currently held.'; }
export function getPlotBuildOrder(plot: TemplateSitePlot, fallbackIndex = 0) { return Number.isFinite(plot.buildOrder) && Number(plot.buildOrder) > 0 ? Number(plot.buildOrder) : fallbackIndex + 1; }
export function getSortedSitePlots(plots: TemplateSitePlot[]) { return plots.slice().sort((a, b) => getPlotBuildOrder(a, 9999) - getPlotBuildOrder(b, 9999) || a.plotNo.localeCompare(b.plotNo, undefined, { numeric: true })); }
export function getHouseTypeLabel(template: PlotTemplate) { return template.name.trim() || template.houseTypeCode?.trim() || 'House type'; }

const LEGACY_THREE_STOREY_AUTO_CODES = new Set([
  '2nd floor joists and flooring',
  '5th lift brickwork',
  '5th lift scaffold',
]);

function reindexActivities(activities: TemplateActivity[]) {
  return activities.map((activity, index) => ({ ...activity, order: index + 1 }));
}

/**
 * One stage-number standard for every traditional house type.
 * This changes stage ownership only; task names, durations and three-storey
 * generated activities are preserved.
 *
 * Agreed boundaries:
 * 1 Foundations/substructure/drainage
 * 2 Band course/slab
 * 3 Brickwork/joists/wall plate
 * 4 Truss through roof tile
 * 5 Strip scaffold
 * 6 First fix through loft insulation
 * 7 Second fix through kitchen
 * 8 Patch/decorating/wall tile
 * 9 Finals/close-out
 */
function canonicalStageForActivity(activity: TemplateActivity): ProgrammeStageNumber {
  const text = `${activity.code} ${activity.displayText} ${activity.trade}`.trim().toLowerCase();

  const rules: Array<[ProgrammeStageNumber, RegExp[]]> = [
    [1, [
      /\bfoundations?\b/, /\bsubstructure\b/, /\bdrainage\b/, /\bqa\s+drainage\b/, /\bnhbc\s+drainage\b/,
    ]],
    [2, [
      /\bband\s+course\b/, /\bslab(?:\s+pour)?\b/, /\bqa\s+slab\b/,
    ]],
    [3, [
      /\b1st\s+(?:lift\s+)?brickwork\b/, /\bbase\s+lift\s+scaffold\b/,
      /\b2nd\s+lift\s+brickwork\b/, /\b2nd\s+lift\s+scaffold\b/,
      /\bjoist(?:s)?\b.*\bfloor(?:ing)?\b/, /\b3rd\s+lift\s+brickwork\b/,
      /\b3rd(?:\s+&\s+bird)?\s+scaffold\b/, /\b4th\s+lift\s+brickwork\b/,
      /\b4th\s+lift\s+scaffold\b/, /\b5th\s+lift\s+brickwork\b/,
      /\b5th\s+lift\s+scaffold\b/, /\bwall\s+plate\b/,
    ]],
    [4, [
      /\btruss\b/, /\bgables?\b/, /\bqa\s+ss\b/, /\bnhbc\s+ss\b/,
      /\bfelt\s+(?:and|&)\s+batten\b/, /\bsolar\s+pv\b/, /\broof\s+tile\b/,
    ]],
    [5, [
      /\bstrip\s+scaffold\b/,
    ]],
    [6, [
      /\b1st\s+fix\s+carp(?:entry)?\b/, /\bwindows?\b/, /\b1st\s+fix\s+plumb(?:ing)?\b/,
      /\b1st\s+fix\s+electrics?\b/, /\bcavity\s+blown\s+insulation\b/,
      /\bqa\s+pp\b/, /\bnhbc\s+pp\b/, /\bplasterboard\s+tacking\b/,
      /\bplasterboard\s+dabbing\b/, /\bplasterboard\s+taping\b/,
      /\bgroundwork\s+externals\b/, /\bdrying\b/, /\bplasterboard\s+sand\b/,
      /\bmist\s+coat\b/, /\bloft\s+insulation\b/,
    ]],
    [7, [
      /\b2nd\s+fix\s+carp(?:entry)?\b/, /\b2nd\s+fix\s+plumb(?:ing)?\b/,
      /\b2nd\s+fix\s+electrics?\b/, /\bkitchen\s+(?:installation|install|fit)\b/,
    ]],
    [8, [
      /^patch\b/, /\bpre\s*paint\s+clean\b/, /^decoration\b/, /\bwall\s+tile\b/,
    ]],
    [9, [
      /\bplumbing\s+finals?\b/, /\bcarpentry\s+finals?\b/, /\belectrical\s+finals?\b/,
      /\bappliances?\b/, /\bsnag\s+patch\b/, /\bdec(?:oration)?\s+finals?\b/,
      /\bbuild\s+clean\b/, /\bmastic\b/, /\bsealant\b/, /\bflooring\b/,
      /\bdoors\s+over\s+carpets\b/, /\btouch\s*ups?\s+after\s+carpets\b/,
      /\breclean\b/, /\bqa\s+pre\s+handover\b/, /\bhome\s+tour\b/, /\bpre\s*handover\b/,
    ]],
  ];

  for (const [stage, patterns] of rules) {
    if (patterns.some((pattern) => pattern.test(text))) return stage;
  }
  return activity.stage;
}

/**
 * Canonical activity-to-stage truth for every house type.
 * Stage is determined by the discipline/task itself, not by where it happens
 * to sit in a particular house-type programme.
 */
export function applyStandardHouseTypeStages(template: PlotTemplate): PlotTemplate {
  if (template.id === 'timberFrame' || template.constructionMethod === 'timberFrame') return template;
  const activities = template.activities.map((activity) => ({
    ...activity,
    stage: canonicalStageForActivity(activity),
  }));
  return { ...template, stageCount: 9, standardVersion: Math.max(3, template.standardVersion ?? 0), activities };
}

function ordinal(value: number) {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${value}th`;
  if (value % 10 === 1) return `${value}st`;
  if (value % 10 === 2) return `${value}nd`;
  if (value % 10 === 3) return `${value}rd`;
  return `${value}th`;
}

function shouldAddThreeStoreyFixDay(activity: TemplateActivity, roofTileOrder: number) {
  if (activity.order <= roofTileOrder) return false;
  if (!['Carpenter', 'Plumber', 'Electrician'].includes(activity.trade)) return false;
  return /\b(?:1st|2nd)\s+fix\b/i.test(activity.code);
}

export function applyHouseTypeFloorConfiguration(template: PlotTemplate, floors: number): PlotTemplate {
  const normalisedFloors = Math.max(1, Math.min(3, Math.round(Number(floors) || 2)));
  const hasThreeStoreyGeneratedRows = template.activities.some((activity) => activity.autoAddedForThreeStorey);

  // Saving or re-editing an existing 3-storey house type must not regenerate its
  // automatic rows, otherwise user changes to those rows are silently lost.
  if (normalisedFloors === 3 && template.floors === 3 && hasThreeStoreyGeneratedRows) {
    return { ...template, floors: 3, activities: reindexActivities(template.activities.slice().sort((a, b) => a.order - b.order)) };
  }

  const sourceActivities = template.activities.map((activity) =>
    template.floors === 3 && LEGACY_THREE_STOREY_AUTO_CODES.has(activity.code)
      ? { ...activity, autoAddedForThreeStorey: true }
      : activity,
  );
  const baseActivities: TemplateActivity[] = sourceActivities
    .filter((activity) => !activity.autoAddedForThreeStorey)
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((activity) => ({
      ...activity,
      durationDays: activity.autoThreeStoreyFixDay ? Math.max(1, activity.durationDays - 1) : activity.durationDays,
      autoThreeStoreyFixDay: false,
    }));

  if (normalisedFloors !== 3) {
    return { ...template, floors: normalisedFloors, activities: reindexActivities(baseActivities) };
  }

  const roofTileOrder = baseActivities.find((activity) => activity.code.toLowerCase() === 'roof tile')?.order ?? Number.MAX_SAFE_INTEGER;
  const adjustedActivities = baseActivities.map((activity) =>
    shouldAddThreeStoreyFixDay(activity, roofTileOrder)
      ? { ...activity, durationDays: activity.durationDays + 1, autoThreeStoreyFixDay: true }
      : activity,
  );

  const liftNumbers = adjustedActivities
    .map((activity) => activity.code.match(/(\d+)(?:st|nd|rd|th)\s+lift\s+brickwork/i))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => Number(match[1]))
    .filter(Number.isFinite);
  const nextLift = (liftNumbers.length ? Math.max(...liftNumbers) : 3) + 1;
  const liftLabel = ordinal(nextLift);

  const wallPlateIndex = adjustedActivities.findIndex((activity) => activity.code.toLowerCase() === 'wall plate');
  const trussIndex = adjustedActivities.findIndex((activity) => activity.code.toLowerCase() === 'truss');
  const insertAt = wallPlateIndex >= 0 ? wallPlateIndex : trussIndex >= 0 ? trussIndex : adjustedActivities.length;
  const preceding = adjustedActivities[Math.max(0, insertAt - 1)];
  const structureStage = (preceding?.stage ?? 3) as ProgrammeActivity['stage'];

  const extras: TemplateActivity[] = [
    { ...templateActivity(0, '2nd floor joists and flooring', 'Carpenter', '2F Joist & Floor', 2, structureStage), autoAddedForThreeStorey: true },
    { ...templateActivity(0, `${liftLabel} lift brickwork`, 'Bricklayer', `${liftLabel} Lift`, 7, structureStage), autoAddedForThreeStorey: true },
    { ...templateActivity(0, `${liftLabel} lift scaffold`, 'Scaffolder', `${liftLabel} Scaffold`, 2, structureStage), autoAddedForThreeStorey: true },
  ];

  const next = adjustedActivities.slice();
  next.splice(insertAt, 0, ...extras);
  return { ...template, floors: normalisedFloors, activities: reindexActivities(next) };
}

export function createHouseTypeTemplate(input: { name: string; bedrooms: number; floors: number; baseTemplate?: PlotTemplate }): PlotTemplate {
  const name = input.name.trim();
  const bedrooms = Math.max(1, Math.min(8, Math.round(Number(input.bedrooms) || 3)));
  const floors = Math.max(1, Math.min(3, Math.round(Number(input.floors) || 2)));
  const preferredBaseId = getStandardTemplateIdForBedrooms(bedrooms);
  const base = input.baseTemplate
    ?? DEFAULT_PLOT_TEMPLATES.find((template) => template.id === preferredBaseId)
    ?? DEFAULT_PLOT_TEMPLATES.find((template) => template.id === 'threeBed')
    ?? DEFAULT_PLOT_TEMPLATES[0];
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'house-type';
  const draft: PlotTemplate = {
    ...base,
    id: `house-${slug}-${Date.now()}`,
    name,
    houseTypeCode: name,
    bedrooms,
    floors,
    isHouseType: true,
    isSystemTemplate: false,
    constructionMethod: undefined,
    description: `${bedrooms} bedroom · ${floors} storey house type`,
    activities: base.activities.map((activity) => ({ ...activity })),
  };
  return applyHouseTypeFloorConfiguration(draft, floors);
}

export function getHouseTypeTemplates(templates: PlotTemplate[]) {
  return templates.filter((template) => template.isHouseType);
}

export function getTemplateForPlot(plot: TemplateSitePlot, templates: PlotTemplate[]) {
  if (plot.constructionMethod === 'timberFrame' || plot.templateId === 'timberFrame') {
    return templates.find((template) => template.id === 'timberFrame')
      ?? templates.find((template) => template.id === plot.houseTypeId)
      ?? templates.find((template) => template.id === 'threeBed')
      ?? templates[0];
  }
  const houseTypeId = plot.houseTypeId ?? plot.templateId;
  return templates.find((template) => template.id === houseTypeId)
    ?? templates.find((template) => template.id === 'threeBed')
    ?? templates[0];
}

export function getTemplateById(templateId: string | undefined, templates: PlotTemplate[]) {
  return templates.find((template) => template.id === templateId) ?? templates.find((template) => template.id === 'threeBed') ?? templates[0];
}

export function orderedActivities(template: PlotTemplate) {
  return template.activities.slice().filter((activity) => activity.durationDays > 0).sort((a, b) => a.order - b.order);
}

export function getTemplateActivityRanges(template: PlotTemplate) {
  const ranges: { activity: TemplateActivity; start: number; finish: number }[] = [];
  const byCode = new Map<string, { activity: TemplateActivity; start: number; finish: number }>();
  let nextSequentialDay = 1;
  orderedActivities(template).forEach((activity) => {
    let start = nextSequentialDay;
    if (activity.overlapAllowed && activity.overlapLinkCode) {
      const linkedRange = byCode.get(activity.overlapLinkCode);
      if (linkedRange) {
        const lag = Math.max(0, activity.overlapLagDays ?? 0);
        const anchor = activity.overlapStartFrom === 'finish' ? linkedRange.finish + 1 : linkedRange.start;
        start = Math.max(1, anchor + lag);
      }
    }
    const finish = start + Math.max(1, activity.durationDays) - 1;
    const range = { activity, start, finish };
    ranges.push(range);
    byCode.set(activity.code, range);
    nextSequentialDay = Math.max(nextSequentialDay, finish + 1);
  });
  return ranges;
}

export function getEffectiveProgrammeWeeks(template: PlotTemplate, setup?: Partial<SiteProgrammeSetup>) {
  const workingDays = workingDaysPerWeek(setup);
  const ranges = getTemplateActivityRanges(template);
  const lastFinish = ranges.length ? Math.max(...ranges.map((range) => range.finish)) : template.programmeWeeks * workingDays;
  return Math.max(template.programmeWeeks, Math.ceil(lastFinish / workingDays));
}

export function getTemplateProgrammeWorkingDays(template: PlotTemplate) {
  const ranges = getTemplateActivityRanges(template);
  return ranges.length ? Math.max(...ranges.map((range) => range.finish)) : Math.max(1, template.programmeWeeks * DEFAULT_WORKING_DAYS_IN_WEEK);
}

function getPlotActivityBaseOffset(plot: TemplateSitePlot, template: PlotTemplate, setup?: Partial<SiteProgrammeSetup>) {
  const exactCompletionIndex = plot.plotCompletionDate && setup?.programmeStartDate
    ? getProgrammeWorkingDayIndexForDate(setup.programmeStartDate, plot.plotCompletionDate, Boolean(setup.includeSaturday), Boolean(setup.includeSunday))
    : null;
  if (exactCompletionIndex) return exactCompletionIndex - getTemplateProgrammeWorkingDays(template);

  const exactStartIndex = plot.plotStartDate && setup?.programmeStartDate
    ? getProgrammeWorkingDayIndexForDate(setup.programmeStartDate, plot.plotStartDate, Boolean(setup.includeSaturday), Boolean(setup.includeSunday))
    : null;
  if (exactStartIndex) return exactStartIndex - 1;

  const linearStage1Week = getLinearStage1StartWeekForPlot(plot, [template], setup);
  return firstProgrammeDayIndexForWeek(linearStage1Week, setup) - 1;
}

export function getPlotCompletionProgrammeWeek(plot: TemplateSitePlot, setup?: Partial<SiteProgrammeSetup>) {
  const exactWeek = plot.plotCompletionDate && setup?.programmeStartDate
    ? getProgrammeWeekForDate(setup.programmeStartDate, plot.plotCompletionDate)
    : undefined;
  return exactWeek ?? plot.stage9CompleteWeek;
}

export function getPlotLiveFinishProgrammeWeek(
  plot: TemplateSitePlot,
  delays: ActivityDelay[],
  moves: ActivityMove[],
  templates: PlotTemplate[],
  setup?: Partial<SiteProgrammeSetup>,
) {
  const template = getTemplateForPlot(plot, templates);
  const activities = orderedActivities(template);
  if (!activities.length) return getPlotCompletionProgrammeWeek(plot, setup);
  const latestWorkingDay = Math.max(
    ...activities.map((activity) => getActivityProgrammeRange(plot, template, activity, delays, moves, setup).finish),
  );
  return Math.max(1, Math.ceil(latestWorkingDay / workingDaysPerWeek(setup)));
}

export function getPlotLiveFinishDate(plot: TemplateSitePlot, delays: ActivityDelay[], moves: ActivityMove[], templates: PlotTemplate[], setup: Partial<SiteProgrammeSetup>) {
  const template = getTemplateForPlot(plot, templates);
  const activities = orderedActivities(template);
  if (!activities.length) return plot.plotCompletionDate ?? '';
  const finish = Math.max(...activities.map((activity) => getActivityProgrammeRange(plot, template, activity, delays, moves, setup).finish));
  return getProgrammeDateForWorkingDayIndex(setup.programmeStartDate, finish, setup.includeSaturday, setup.includeSunday);
}

export function getMasterProgrammeWeeks(
  plots: TemplateSitePlot[],
  startWeek: number,
  delays: ActivityDelay[],
  moves: ActivityMove[],
  templates: PlotTemplate[],
  setup?: Partial<SiteProgrammeSetup>,
) {
  const safeStart = Math.max(1, Math.round(startWeek || 1));
  const lastWeek = plots.length
    ? Math.max(
        safeStart,
        ...plots.map((plot) => plot.finalStageAdjustmentWeeks ? getPlotLiveFinishProgrammeWeek(plot, delays, moves, templates, setup) : Math.max(
          getPlotCompletionProgrammeWeek(plot, setup),
          getPlotLiveFinishProgrammeWeek(plot, delays, moves, templates, setup),
        )),
      )
    : safeStart;
  return Array.from({ length: lastWeek - safeStart + 1 }, (_, index) => safeStart + index);
}

/** Weekly stages from the same moved/delayed activity ranges used by the live programme. */
export function getLiveStageNumbersForPlotWeek(
  plot: TemplateSitePlot, week: number, delays: ActivityDelay[], moves: ActivityMove[],
  templates: PlotTemplate[], setup?: Partial<SiteProgrammeSetup>,
) {
  const template = getTemplateForPlot(plot, templates);
  const days = workingDaysPerWeek(setup);
  const firstDay = (week - 1) * days + 1;
  const lastDay = week * days;
  const stages = orderedActivities(template).filter((activity) => {
    const range = getActivityProgrammeRange(plot, template, activity, delays, moves, setup);
    return range.start <= lastDay && range.finish >= firstDay;
  }).map((activity) => activity.stage);
  const lowestStage = [...new Set(stages)].sort((a, b) => a - b)[0];
  if (!lowestStage) return '';
  if (!plot.holdStage || lowestStage < plot.holdStage) return String(lowestStage);
  return lowestStage === plot.holdStage ? `${lowestStage}H` : `H${plot.holdStage}`;
}

export function getLinearStage1StartWeekForPlot(plot: TemplateSitePlot, templates: PlotTemplate[], setup?: Partial<SiteProgrammeSetup>) {
  const template = getTemplateForPlot(plot, templates);
  return getPlotCompletionProgrammeWeek(plot, setup) - getEffectiveProgrammeWeeks(template, setup) + 1;
}

export function getStage1StartWeekForPlot(plot: TemplateSitePlot, templates: PlotTemplate[], setup?: Partial<SiteProgrammeSetup>) {
  return normaliseProgrammeWeek(getLinearStage1StartWeekForPlot(plot, templates, setup));
}

export function getStageNumberForPlotWeek(plot: TemplateSitePlot, week: number, templates: PlotTemplate[], setup?: Partial<SiteProgrammeSetup>) {
  const relativeWeek = week - getStage1StartWeekForPlot(plot, templates, setup) + 1;
  if (relativeWeek < 1 || relativeWeek > 23) return '';
  const stage = getStageNumberForRelativeWeek(relativeWeek);
  if (!plot.holdStage || !stage || stage < plot.holdStage) return stage;
  return stage === plot.holdStage ? `${stage}H` : `H${plot.holdStage}`;
}
export function getStageLabelForNumber(stage: ProgrammeStageNumber) { return PROGRAMME_STAGE_SEQUENCE.find((item) => item.stage === stage)?.label ?? `Stage ${stage}`; }

export function getMilestoneForPlotWeek(plot: TemplateSitePlot, week: number, templates: PlotTemplate[], setup?: Partial<SiteProgrammeSetup>) {
  const template = getTemplateForPlot(plot, templates);
  const effectiveWeeks = getEffectiveProgrammeWeeks(template, setup);
  const displayWeek = normaliseProgrammeWeek(week);
  for (let stage = 1; stage <= template.stageCount; stage += 1) {
    const weeksFromHandover = Math.round(((template.stageCount - stage) * (effectiveWeeks - 1)) / Math.max(1, template.stageCount - 1));
    const milestoneWeek = normaliseProgrammeWeek(getPlotCompletionProgrammeWeek(plot, setup) - weeksFromHandover);
    if (milestoneWeek === displayWeek) return String(stage);
  }
  return '';
}

function delayBefore(plotId: string, activityOrder: number, delays: ActivityDelay[], activities: TemplateActivity[]) {
  return delays.reduce((total, delay) => {
    if (delay.plotId !== plotId) return total;
    const activity = activities.find((item) => item.code === delay.activityCode);
    return activity && activity.order < activityOrder ? total + delay.delayDays : total;
  }, 0);
}

function delayUpTo(plotId: string, activityOrder: number, delays: ActivityDelay[], activities: TemplateActivity[]) {
  return delays.reduce((total, delay) => {
    if (delay.plotId !== plotId) return total;
    const activity = activities.find((item) => item.code === delay.activityCode);
    return activity && activity.order <= activityOrder ? total + delay.delayDays : total;
  }, 0);
}

function movementOffsetUpTo(plotId: string, activityOrder: number, moves: ActivityMove[], activities: TemplateActivity[]) {
  return moves.reduce((total, move) => {
    if (move.plotId !== plotId) return total;
    const movedActivity = activities.find((item) => item.code === move.activityCode);
    return movedActivity && movedActivity.order <= activityOrder ? total + move.deltaDays : total;
  }, 0);
}

export function getFinalStageAdjustmentDelays(plot: TemplateSitePlot, template: PlotTemplate, delays: ActivityDelay[], setup?: Partial<SiteProgrammeSetup>) {
  if (!plot.finalStageAdjustmentWeeks) return [];
  const activities = orderedActivities(template);
  const last = activities.at(-1);
  if (!last) return [];
  const days = Math.round(plot.finalStageAdjustmentWeeks ?? 0) * workingDaysPerWeek(setup);
  if (days >= 0) return days ? [{ plotId: plot.id, activityCode: last.code, delayDays: days }] : [];
  let remaining = -days;
  const adjustments: ActivityDelay[] = [];
  for (const activity of activities.slice().reverse()) {
    if (activity.stage !== last.stage) continue;
    const existing = delays.filter((delay) => delay.plotId === plot.id && delay.activityCode === activity.code).reduce((sum, delay) => sum + delay.delayDays, 0);
    const reduction = Math.min(remaining, Math.max(0, activity.durationDays + existing - 1));
    if (reduction) adjustments.push({ plotId: plot.id, activityCode: activity.code, delayDays: -reduction });
    remaining -= reduction;
  }
  return adjustments;
}

export function canAdjustFinalStageWeek(plot: TemplateSitePlot, delta: -1 | 1, templates: PlotTemplate[], delays: ActivityDelay[], setup?: Partial<SiteProgrammeSetup>) {
  const template = getTemplateForPlot(plot, templates);
  const activities = orderedActivities(template);
  if (!activities.length || plot.holdStage) return false;
  const nextWeeks = (plot.finalStageAdjustmentWeeks ?? 0) + delta;
  if (nextWeeks >= 0) return true;
  // Compressing overlapping tasks requires an explicit replan, not an automatic week removal.
  const lastStage = activities.at(-1)!.stage;
  if (activities.some((activity) => activity.stage === lastStage && activity.overlapAllowed)) return false;
  const applied = getFinalStageAdjustmentDelays({ ...plot, finalStageAdjustmentWeeks: nextWeeks }, template, delays, setup).reduce((sum, delay) => sum + delay.delayDays, 0);
  return applied === nextWeeks * workingDaysPerWeek(setup);
}

export function getActivityProgrammeRange(plot: TemplateSitePlot, template: PlotTemplate, activity: TemplateActivity, delays: ActivityDelay[], moves: ActivityMove[] = [], setup?: Partial<SiteProgrammeSetup>) {
  const scheduled = getTemplateActivityRanges(template).find((item) => item.activity.code === activity.code);
  const relativeStart = scheduled?.start ?? 1;
  const relativeFinish = scheduled?.finish ?? relativeStart;
  const baseOffset = getPlotActivityBaseOffset(plot, template, setup);
  const moveOffset = movementOffsetUpTo(plot.id, activity.order, moves, template.activities);
  const liveDelays = [...delays, ...getFinalStageAdjustmentDelays(plot, template, delays, setup)];
  return {
    start: baseOffset + relativeStart + delayBefore(plot.id, activity.order, liveDelays, template.activities) + moveOffset,
    finish: baseOffset + relativeFinish + delayUpTo(plot.id, activity.order, liveDelays, template.activities) + moveOffset,
  };
}


export function getActivitiesForTemplateDay(plot: TemplateSitePlot, week: number, day: number, delays: ActivityDelay[], templates: PlotTemplate[], setup?: Partial<SiteProgrammeSetup>, moves: ActivityMove[] = []) {
  if (!isProgrammeWorkingDay(day, setup)) return [];
  const template = getTemplateForPlot(plot, templates);
  const currentDay = programmeDayIndex(normaliseProgrammeWeek(week), day, setup);
  if (currentDay === null) return [];
  return orderedActivities(template).filter((activity) => {
    const range = getActivityProgrammeRange(plot, template, activity, delays, moves, setup);
    return currentDay >= range.start && currentDay <= range.finish;
  });
}

export function getPlotBreakdownTemplateText(plot: TemplateSitePlot, week: number, day: number, delays: ActivityDelay[], templates: PlotTemplate[], setup?: Partial<SiteProgrammeSetup>, moves: ActivityMove[] = []) {
  return getActivitiesForTemplateDay(plot, week, day, delays, templates, setup, moves).map((activity) => activity.code).join('\n');
}

export function getTradeTemplateText(plot: TemplateSitePlot, trade: string, week: number, day: number, delays: ActivityDelay[], templates: PlotTemplate[], setup?: Partial<SiteProgrammeSetup>, moves: ActivityMove[] = []) {
  return getActivitiesForTemplateDay(plot, trade === 'All' ? 0 : week, day, delays, templates, setup, moves)
    .filter((activity) => activity.trade === trade)
    .map((activity) => activity.displayText)
    .join('\n');
}

export function plotHasTradeWorkForTemplate(plot: TemplateSitePlot, trade: string, startWeek: number, delays: ActivityDelay[], templates: PlotTemplate[], setup?: Partial<SiteProgrammeSetup>, moves: ActivityMove[] = []) {
  for (let offset = 0; offset <= 1; offset += 1) {
    const week = normaliseProgrammeWeek(startWeek + offset);
    for (let day = 1; day <= 7; day += 1) {
      if (getTradeTemplateText(plot, trade, week, day, delays, templates, setup, moves)) return true;
    }
  }
  return false;
}

export function getActiveTemplateTrades(plots: TemplateSitePlot[], startWeek: number, delays: ActivityDelay[], templates: PlotTemplate[], setup?: Partial<SiteProgrammeSetup>, moves: ActivityMove[] = []) {
  return TRADE_ORDER.filter((trade) => plots.some((plot) => plotHasTradeWorkForTemplate(plot, trade, startWeek, delays, templates, setup, moves)));
}

