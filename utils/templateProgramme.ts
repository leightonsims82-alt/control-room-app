import { ActivityDelay, BUILD_SEQUENCE, ProgrammeActivity, SitePlot, TRADE_ORDER } from './siteProgrammeEngine';

export type TemplateSitePlot = SitePlot & {
  templateId?: string;
};

export type OverlapStartFrom = 'start' | 'finish';

export type TemplateActivity = ProgrammeActivity & {
  overlapAllowed?: boolean;
  overlapLinkCode?: string;
  overlapStartFrom?: OverlapStartFrom;
  overlapLagDays?: number;
};

export type PlotTemplate = {
  id: string;
  name: string;
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
};

export const DEFAULT_SITE_PROGRAMME_SETUP: SiteProgrammeSetup = {
  siteName: 'New Site',
  defaultProgrammeWeeks: 25,
  stageCount: 9,
  workingWeek: '5 days - Monday to Friday',
  includeSaturday: false,
  includeSunday: false,
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
  return ((((Math.round(week) - 1) % WEEKS_IN_YEAR) + WEEKS_IN_YEAR) % WEEKS_IN_YEAR) + 1;
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

export const DEFAULT_PLOT_TEMPLATES: PlotTemplate[] = [
  makeTemplate('apartment', 'Apartment', 'Traditional route using the locked sequence and durations', 25),
  makeTemplate('twoBed', '2 Bedroom', 'Traditional route using the locked sequence and durations', 25),
  makeTemplate('threeBed', '3 Bedroom', 'Traditional route using the locked sequence and durations', 25),
  makeTimberFrameTemplate(),
  makeTemplate('fourBed', '4 Bedroom', 'Traditional route using the locked sequence and durations', 25),
  makeTemplate('fiveBed', '5 Bedroom', 'Traditional route using the locked sequence and durations', 25),
];

export const DEFAULT_TEMPLATE_PLOTS: TemplateSitePlot[] = [];

export function getTemplateForPlot(plot: TemplateSitePlot, templates: PlotTemplate[]) {
  return templates.find((template) => template.id === plot.templateId) ?? templates.find((template) => template.id === 'threeBed') ?? templates[0];
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

export function getLinearStage1StartWeekForPlot(plot: TemplateSitePlot, templates: PlotTemplate[], setup?: Partial<SiteProgrammeSetup>) {
  const template = getTemplateForPlot(plot, templates);
  return plot.stage9CompleteWeek - getEffectiveProgrammeWeeks(template, setup) + 1;
}

export function getStage1StartWeekForPlot(plot: TemplateSitePlot, templates: PlotTemplate[], setup?: Partial<SiteProgrammeSetup>) {
  return normaliseProgrammeWeek(getLinearStage1StartWeekForPlot(plot, templates, setup));
}

export function getMilestoneForPlotWeek(plot: TemplateSitePlot, week: number, templates: PlotTemplate[], setup?: Partial<SiteProgrammeSetup>) {
  const template = getTemplateForPlot(plot, templates);
  const effectiveWeeks = getEffectiveProgrammeWeeks(template, setup);
  const displayWeek = normaliseProgrammeWeek(week);
  for (let stage = 1; stage <= template.stageCount; stage += 1) {
    const weeksFromHandover = Math.round(((template.stageCount - stage) * (effectiveWeeks - 1)) / Math.max(1, template.stageCount - 1));
    const milestoneWeek = normaliseProgrammeWeek(plot.stage9CompleteWeek - weeksFromHandover);
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

function activityRange(plot: TemplateSitePlot, template: PlotTemplate, activity: TemplateActivity, delays: ActivityDelay[], setup?: Partial<SiteProgrammeSetup>) {
  const linearStage1Week = getLinearStage1StartWeekForPlot(plot, [template], setup);
  const scheduled = getTemplateActivityRanges(template).find((item) => item.activity.code === activity.code);
  const relativeStart = scheduled?.start ?? 1;
  const relativeFinish = scheduled?.finish ?? relativeStart;
  const baseOffset = firstProgrammeDayIndexForWeek(linearStage1Week, setup) - 1;
  return {
    start: baseOffset + relativeStart + delayBefore(plot.id, activity.order, delays, template.activities),
    finish: baseOffset + relativeFinish + delayUpTo(plot.id, activity.order, delays, template.activities),
  };
}

function weekCandidates(week: number, centreWeek: number) {
  const base = normaliseProgrammeWeek(week);
  const centre = Number.isFinite(centreWeek) ? centreWeek : base;
  const candidates = [base - WEEKS_IN_YEAR, base, base + WEEKS_IN_YEAR, base + WEEKS_IN_YEAR * 2, base - WEEKS_IN_YEAR * 2];
  return candidates.sort((a, b) => Math.abs(a - centre) - Math.abs(b - centre));
}

export function getActivitiesForTemplateDay(plot: TemplateSitePlot, week: number, day: number, delays: ActivityDelay[], templates: PlotTemplate[], setup?: Partial<SiteProgrammeSetup>) {
  if (!isProgrammeWorkingDay(day, setup)) return [];
  const template = getTemplateForPlot(plot, templates);
  const linearStage1Week = getLinearStage1StartWeekForPlot(plot, [template], setup);
  const currentDays = weekCandidates(week, linearStage1Week)
    .map((candidateWeek) => programmeDayIndex(candidateWeek, day, setup))
    .filter((value): value is number => typeof value === 'number');
  return orderedActivities(template).filter((activity) => {
    const range = activityRange(plot, template, activity, delays, setup);
    return currentDays.some((currentDay) => currentDay >= range.start && currentDay <= range.finish);
  });
}

export function getPlotBreakdownTemplateText(plot: TemplateSitePlot, week: number, day: number, delays: ActivityDelay[], templates: PlotTemplate[], setup?: Partial<SiteProgrammeSetup>) {
  return getActivitiesForTemplateDay(plot, week, day, delays, templates, setup).map((activity) => activity.code).join('\n');
}

export function getTradeTemplateText(plot: TemplateSitePlot, trade: string, week: number, day: number, delays: ActivityDelay[], templates: PlotTemplate[], setup?: Partial<SiteProgrammeSetup>) {
  return getActivitiesForTemplateDay(plot, trade === 'All' ? 0 : week, day, delays, templates, setup)
    .filter((activity) => activity.trade === trade)
    .map((activity) => activity.displayText)
    .join('\n');
}

export function plotHasTradeWorkForTemplate(plot: TemplateSitePlot, trade: string, startWeek: number, delays: ActivityDelay[], templates: PlotTemplate[], setup?: Partial<SiteProgrammeSetup>) {
  for (let offset = 0; offset <= 1; offset += 1) {
    const week = normaliseProgrammeWeek(startWeek + offset);
    for (let day = 1; day <= 7; day += 1) {
      if (getTradeTemplateText(plot, trade, week, day, delays, templates, setup)) return true;
    }
  }
  return false;
}

export function getActiveTemplateTrades(plots: TemplateSitePlot[], startWeek: number, delays: ActivityDelay[], templates: PlotTemplate[], setup?: Partial<SiteProgrammeSetup>) {
  return TRADE_ORDER.filter((trade) => plots.some((plot) => plotHasTradeWorkForTemplate(plot, trade, startWeek, delays, templates, setup)));
}
