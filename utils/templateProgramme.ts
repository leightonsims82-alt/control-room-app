import { ActivityDelay, BUILD_SEQUENCE, dayIndexFromWeekDay, ProgrammeActivity, SitePlot, TRADE_ORDER } from './siteProgrammeEngine';

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
};

export const DEFAULT_SITE_PROGRAMME_SETUP: SiteProgrammeSetup = {
  siteName: 'New Site',
  defaultProgrammeWeeks: 23,
  stageCount: 9,
  workingWeek: 'Monday to Friday',
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

function stage7SecondFixOverride(activity: ProgrammeActivity): Partial<ProgrammeActivity> {
  if (activity.code === '2ND CARP') return { code: '2ND FIX', trade: 'Carpenter', displayText: '2nd Fix', durationDays: 5, stage: 7 } as Partial<ProgrammeActivity>;
  if (activity.code === '2ND PLUMB' || activity.code === '2ND ELEC') return { durationDays: 0, stage: 7 } as Partial<ProgrammeActivity>;
  return {};
}

function makeTemplate(id: string, name: string, description: string, programmeWeeks: number): PlotTemplate {
  const taskDurations = durationOverrides[id] ?? {};
  return {
    id,
    name,
    description,
    programmeWeeks,
    stageCount: 9,
    activities: BUILD_SEQUENCE.map((activity) => {
      const stageOverride = stage7SecondFixOverride(activity);
      const code = stageOverride.code ?? activity.code;
      return {
        ...activity,
        ...stageOverride,
        durationDays: taskDurations[code] ?? stageOverride.durationDays ?? taskDurations[activity.code] ?? activity.durationDays,
        overlapAllowed: false,
      };
    }).filter((activity) => activity.durationDays > 0),
  };
}

export const DEFAULT_PLOT_TEMPLATES: PlotTemplate[] = [
  makeTemplate('apartment', 'Apartment', 'Shorter apartment route', 20),
  makeTemplate('twoBed', '2 Bedroom', 'Smaller house template with shorter fix and finish durations', 22),
  makeTemplate('threeBed', '3 Bedroom', 'Standard 23-week house template', 23),
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
    const plannedDay = dayIndexFromWeekDay(activity.relativeWeek, activity.relativeDay);
    const start = activity.overlapAllowed ? plannedDay : nextSequentialDay;
    const finish = start + activity.durationDays - 1;
    if (!activity.overlapAllowed) nextSequentialDay = finish + 1;
    return { activity, start, finish };
  });
}

export function getEffectiveProgrammeWeeks(template: PlotTemplate) {
  const ranges = getTemplateActivityRanges(template);
  const lastFinish = ranges.length ? Math.max(...ranges.map((range) => range.finish)) : template.programmeWeeks * 5;
  return Math.max(template.programmeWeeks, Math.ceil(lastFinish / 5));
}

export function getLinearStage1StartWeekForPlot(plot: TemplateSitePlot, templates: PlotTemplate[]) {
  const template = getTemplateForPlot(plot, templates);
  return plot.stage9CompleteWeek - getEffectiveProgrammeWeeks(template) + 1;
}

export function getStage1StartWeekForPlot(plot: TemplateSitePlot, templates: PlotTemplate[]) {
  return normaliseProgrammeWeek(getLinearStage1StartWeekForPlot(plot, templates));
}

export function getMilestoneForPlotWeek(plot: TemplateSitePlot, week: number, templates: PlotTemplate[]) {
  const template = getTemplateForPlot(plot, templates);
  const effectiveWeeks = getEffectiveProgrammeWeeks(template);
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

function activityRange(plot: TemplateSitePlot, template: PlotTemplate, activity: TemplateActivity, delays: ActivityDelay[]) {
  const linearStage1Week = getLinearStage1StartWeekForPlot(plot, [template]);
  const scheduled = getTemplateActivityRanges(template).find((item) => item.activity.code === activity.code);
  const relativeStart = scheduled?.start ?? 1;
  const relativeFinish = scheduled?.finish ?? relativeStart;
  const baseOffset = dayIndexFromWeekDay(linearStage1Week, 1) - 1;
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

export function getActivitiesForTemplateDay(plot: TemplateSitePlot, week: number, day: number, delays: ActivityDelay[], templates: PlotTemplate[]) {
  const template = getTemplateForPlot(plot, templates);
  const linearStage1Week = getLinearStage1StartWeekForPlot(plot, [template]);
  const currentDays = weekCandidates(week, linearStage1Week).map((candidateWeek) => dayIndexFromWeekDay(candidateWeek, day));
  return orderedActivities(template).filter((activity) => {
    const range = activityRange(plot, template, activity, delays);
    return currentDays.some((currentDay) => currentDay >= range.start && currentDay <= range.finish);
  });
}

export function getPlotBreakdownTemplateText(plot: TemplateSitePlot, week: number, day: number, delays: ActivityDelay[], templates: PlotTemplate[]) {
  return getActivitiesForTemplateDay(plot, week, day, delays, templates).map((activity) => activity.code).join('\n');
}

export function getTradeTemplateText(plot: TemplateSitePlot, trade: string, week: number, day: number, delays: ActivityDelay[], templates: PlotTemplate[]) {
  return getActivitiesForTemplateDay(plot, week, day, delays, templates)
    .filter((activity) => activity.trade === trade)
    .map((activity) => activity.displayText)
    .join('\n');
}

export function plotHasTradeWorkForTemplate(plot: TemplateSitePlot, trade: string, startWeek: number, delays: ActivityDelay[], templates: PlotTemplate[]) {
  for (let offset = 0; offset <= 1; offset += 1) {
    const week = normaliseProgrammeWeek(startWeek + offset);
    for (let day = 1; day <= 5; day += 1) {
      if (getTradeTemplateText(plot, trade, week, day, delays, templates)) return true;
    }
  }
  return false;
}

export function getActiveTemplateTrades(plots: TemplateSitePlot[], startWeek: number, delays: ActivityDelay[], templates: PlotTemplate[]) {
  return TRADE_ORDER.filter((trade) => plots.some((plot) => plotHasTradeWorkForTemplate(plot, trade, startWeek, delays, templates)));
}