import { ActivityDelay, BUILD_SEQUENCE, ProgrammeActivity, SitePlot, TRADE_ORDER } from './siteProgrammeEngine';

export type TemplateSitePlot = SitePlot & {
  templateId?: string;
};

export type TemplateActivity = ProgrammeActivity & {
  overlapAllowed?: boolean;
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
  defaultProgrammeWeeks: 23,
  stageCount: 9,
  workingWeek: 'Monday to Friday',
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

const durationOverrides: Record<string, Record<string, number>> = {
  apartment: { FND: 3, DNG: 3, SLAB: 15, '1ST BWK': 4, SCAFF: 2, '2ND BWK': 2, JOIST: 1, '3RD BWK': 4, TRUSS: 1, '1ST CARP': 3, '1ST PLUMB': 1, '1ST ELEC': 1, PP: 2, TAC: 1, DAB: 1, TAPE: 2, DRY: 2, '2ND CARP': 2, '2ND PLUMB': 1, PATCH: 2, DEC: 4, FLOORING: 2, 'PRE HANDOVER': 2 },
  twoBed: { '1ST CARP': 3, '1ST PLUMB': 1, '1ST ELEC': 1, PP: 2, TAC: 1, DAB: 1, TAPE: 2, DRY: 2, '2ND CARP': 2, '2ND PLUMB': 1, DEC: 4, FLOORING: 3, 'PRE HANDOVER': 3 },
  threeBed: {},
  fourBed: { SLAB: 28, '1ST BWK': 10, '1ST CARP': 6, '1ST PLUMB': 3, '1ST ELEC': 3, PP: 4, TAC: 3, DAB: 3, TAPE: 4, DRY: 4, '2ND CARP': 4, '2ND PLUMB': 3, PATCH: 4, DEC: 8, FLOORING: 6, 'PRE HANDOVER': 5 },
  fiveBed: { SLAB: 30, '1ST BWK': 10, '3RD BWK': 12, '1ST CARP': 7, '1ST PLUMB': 3, '1ST ELEC': 3, PP: 4, TAC: 3, DAB: 3, TAPE: 4, DRY: 4, '2ND CARP': 5, '2ND PLUMB': 3, PATCH: 4, DEC: 9, 'CARP FINALS': 3, 'PLUMB FINALS': 3, FLOORING: 7, 'PRE HANDOVER': 5 },
};

function makeTemplate(id: string, name: string, description: string, programmeWeeks: number): PlotTemplate {
  const taskDurations = durationOverrides[id] ?? {};
  return {
    id,
    name,
    description,
    programmeWeeks,
    stageCount: 9,
    activities: BUILD_SEQUENCE.map((activity) => ({
      ...activity,
      durationDays: taskDurations[activity.code] ?? activity.durationDays,
      overlapAllowed: false,
    })).filter((activity) => activity.durationDays > 0),
  };
}

function templateActivity(order: number, code: string, trade: string, displayText: string, durationDays: number, relativeWeek: number, relativeDay: number, stage: ProgrammeActivity['stage']): TemplateActivity {
  return { order, code, trade, displayText, durationDays, relativeWeek, relativeDay, stage, overlapAllowed: false };
}

function makeTimberFrameTemplate(): PlotTemplate {
  return {
    id: 'timberFrame',
    name: 'Timber Frame',
    description: 'Timber frame route with sole plate, frame erection, roof/watertight stage, external leaf and then internal fixes.',
    programmeWeeks: 20,
    stageCount: 9,
    activities: [
      templateActivity(1, 'FND', 'Groundworks', 'FND', 5, 1, 1, 1),
      templateActivity(2, 'DNG', 'Groundworks', 'DNG', 5, 2, 1, 1),
      templateActivity(3, 'SLAB', 'Groundworks', 'Slab', 20, 3, 1, 2),
      templateActivity(4, 'SOLE PLATE', 'Carpenter', 'Sole Plate', 1, 7, 1, 4),
      templateActivity(5, 'SCAFF', 'Scaffold', 'Scaffold', 2, 7, 2, 4),
      templateActivity(6, 'TF FRAME', 'Carpenter', 'Timber Frame', 5, 7, 4, 4),
      templateActivity(7, 'TRUSS', 'Roof', 'Truss', 3, 8, 4, 5),
      templateActivity(8, 'SS', 'Roof', 'SS', 2, 9, 2, 5),
      templateActivity(9, 'F&B', 'Roof', 'F&B', 2, 9, 4, 5),
      templateActivity(10, 'TILE', 'Roof', 'Tile', 2, 10, 1, 5),
      templateActivity(11, 'WINDOWS', 'Carpenter', 'Windows', 2, 10, 3, 5),
      templateActivity(12, 'BRICK OUTER', 'Brickwork', 'Outer Leaf', 8, 11, 1, 5),
      templateActivity(13, 'STRIP BC', 'Scaffold', 'Strip BC', 1, 12, 4, 5),
      templateActivity(14, '1ST CARP', 'Carpenter', '1st Fix', 4, 12, 5, 6),
      templateActivity(15, '1ST PLUMB', 'Plumber', '1st Fix', 2, 13, 4, 6),
      templateActivity(16, '1ST ELEC', 'Electrician', '1st Fix', 2, 14, 1, 6),
      templateActivity(17, '1ST SPRINKLER', 'Sprinkler', '1st Fix', 1, 14, 3, 6),
      templateActivity(18, 'PP', 'Plastering', 'PP', 3, 14, 4, 6),
      templateActivity(19, 'DAB', 'Plastering', 'Dab', 2, 15, 2, 6),
      templateActivity(20, 'TAPE', 'Plastering', 'Tape', 3, 15, 4, 6),
      templateActivity(21, 'DRY', 'Dry Liner', 'Dry', 2, 16, 2, 6),
      templateActivity(22, '2ND CARP', 'Carpenter', '2nd Fix', 4, 16, 4, 7),
      templateActivity(23, '2ND PLUMB', 'Plumber', '2nd Fix', 2, 17, 3, 7),
      templateActivity(24, '2ND ELEC', 'Electrician', '2nd Fix', 2, 17, 5, 7),
      templateActivity(25, 'WALL TILING', 'Tiler', 'Wall Tiling', 2, 18, 2, 7),
      templateActivity(26, 'KITCHEN', 'Kitchen Fitter', 'Kitchen', 3, 18, 4, 7),
      templateActivity(27, 'PATCH', 'Dry Liner', 'Patch', 2, 19, 2, 8),
      templateActivity(28, 'DEC', 'Decorator', 'Decorate', 6, 19, 4, 8),
      templateActivity(29, 'CARP FINALS', 'Carpenter', 'Finals', 2, 20, 5, 9),
      templateActivity(30, 'PLUMB FINALS', 'Plumber', 'Finals', 2, 21, 2, 9),
      templateActivity(31, 'ELEC FINALS', 'Electrician', 'Finals', 2, 21, 4, 9),
      templateActivity(32, 'FINAL DEC', 'Decorator', 'Final Dec', 4, 22, 1, 9),
      templateActivity(33, 'BUILD CLEAN', 'Cleaning', 'Build Clean', 1, 22, 5, 9),
      templateActivity(34, 'MASTIC', 'Mastic', 'Mastic', 1, 23, 1, 9),
      templateActivity(35, 'FLOORING', 'Flooring', 'Flooring', 3, 23, 2, 9),
      templateActivity(36, 'SPARKLE', 'Cleaning', 'Sparkle', 2, 23, 5, 9),
      templateActivity(37, 'PRE HANDOVER', 'Handover / Site Team', 'Pre Handover', 2, 24, 2, 9),
    ],
  };
}

export const DEFAULT_PLOT_TEMPLATES: PlotTemplate[] = [
  makeTemplate('apartment', 'Apartment', 'Shorter apartment route', 20),
  makeTemplate('twoBed', '2 Bedroom', 'Smaller house template with shorter fix and finish durations', 22),
  makeTemplate('threeBed', '3 Bedroom', 'Standard 23-week house template', 23),
  makeTimberFrameTemplate(),
  makeTemplate('fourBed', '4 Bedroom', 'Larger house with extended fix and finish durations', 26),
  makeTemplate('fiveBed', '5 Bedroom', 'Largest house template with longer finish and handover durations', 28),
];

export const DEFAULT_TEMPLATE_PLOTS: TemplateSitePlot[] = [];

export function getTemplateForPlot(plot: TemplateSitePlot, templates: PlotTemplate[]) {
  return templates.find((template) => template.id === plot.templateId) ?? templates.find((template) => template.id === 'threeBed') ?? templates[0];
}

export function getTemplateById(templateId: string | undefined, templates: PlotTemplate[]) {
  return templates.find((template) => template.id === templateId) ?? templates.find((template) => template.id === 'threeBed') ?? templates[0];
}

function orderedActivities(template: PlotTemplate) {
  return template.activities.slice().filter((activity) => activity.durationDays > 0).sort((a, b) => a.order - b.order);
}

export function getTemplateActivityRanges(template: PlotTemplate) {
  let nextSequentialDay = 1;
  return orderedActivities(template).map((activity) => {
    const start = nextSequentialDay;
    const finish = start + Math.max(1, activity.durationDays) - 1;
    nextSequentialDay = finish + 1;
    return { activity, start, finish };
  });
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
  return getActivitiesForTemplateDay(plot, week, day, delays, templates, setup)
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
