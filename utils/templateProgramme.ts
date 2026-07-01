import {
  ActivityDelay,
  BUILD_SEQUENCE,
  dayIndexFromWeekDay,
  getStageNumberForRelativeWeek,
  ProgrammeActivity,
  ProgrammeStageNumber,
  PROGRAMME_STAGE_SEQUENCE,
  SitePlot,
  TRADE_ORDER,
} from './siteProgrammeEngine';

export type TemplateSitePlot = SitePlot & {
  templateId?: string;
};

export type TemplateActivity = ProgrammeActivity & {
  overlapAllowed?: boolean;
};

export type ActivityMove = {
  id: string;
  plotId: string;
  activityCode: string;
  deltaDays: number;
  updatedAt: string;
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
  siteName: 'Programme Buddy Site',
  defaultProgrammeWeeks: 23,
  stageCount: 11,
  workingWeek: 'Monday to Friday',
};

export const STAGE_LABELS: Record<number, string> = PROGRAMME_STAGE_SEQUENCE.reduce(
  (labels, item) => ({ ...labels, [item.stage]: item.label }),
  {} as Record<number, string>,
);

const durationOverrides: Record<string, Record<string, number>> = {
  apartment: { FND: 6, DNG: 4, SLAB: 20, '1ST CARP': 2, '1ST PLUMB': 1, '1ST ELEC': 1, BOARD: 4, TAPE: 2, DRY: 2, '2ND CARP': 2, '2ND PLUMB': 1, '2ND ELEC': 1, PATCH: 3, DEC: 4, FLOORING: 3, 'FINAL DEC': 3 },
  twoBed: { '1ST CARP': 3, '1ST PLUMB': 1, '1ST ELEC': 1, BOARD: 4, TAPE: 2, DRY: 2, '2ND CARP': 3, '2ND PLUMB': 1, '2ND ELEC': 1, PATCH: 4, DEC: 4, FLOORING: 4, 'FINAL DEC': 4 },
  threeBed: {},
  fourBed: { '1ST CARP': 4, '1ST PLUMB': 3, '1ST ELEC': 3, BOARD: 6, TAPE: 4, DRY: 4, '2ND CARP': 5, '2ND PLUMB': 3, '2ND ELEC': 2, PATCH: 6, DEC: 7, FLOORING: 6, 'FINAL DEC': 6 },
  fiveBed: { '1ST CARP': 5, '1ST PLUMB': 3, '1ST ELEC': 3, BOARD: 7, TAPE: 4, DRY: 4, '2ND CARP': 6, '2ND PLUMB': 3, '2ND ELEC': 2, PATCH: 7, DEC: 8, FLOORING: 7, 'FINAL DEC': 7 },
};

function makeTemplate(id: string, name: string, description: string): PlotTemplate {
  const taskDurations = durationOverrides[id] ?? {};
  return {
    id,
    name,
    description,
    programmeWeeks: 23,
    stageCount: 11,
    activities: BUILD_SEQUENCE.map((activity) => ({
      ...activity,
      durationDays: taskDurations[activity.code] ?? activity.durationDays,
      overlapAllowed: activity.stage === 10 || activity.stage === 11,
    })).filter((activity) => activity.durationDays > 0),
  };
}

export const DEFAULT_PLOT_TEMPLATES: PlotTemplate[] = [
  makeTemplate('apartment', 'Apartment', 'Apartment route using the same stage-number programme logic'),
  makeTemplate('twoBed', '2 Bedroom', 'Smaller house template'),
  makeTemplate('threeBed', '3 Bedroom', 'Standard 23-week house template'),
  makeTemplate('fourBed', '4 Bedroom', 'Larger house with +1 style extensions to fix and finish tasks'),
  makeTemplate('fiveBed', '5 Bedroom', 'Largest house template with longer fix and finish tasks'),
];

export const DEFAULT_TEMPLATE_PLOTS: TemplateSitePlot[] = Array.from({ length: 10 }, (_, index) => ({
  id: `plot-${index + 1}`,
  plotNo: String(index + 1),
  stage9CompleteWeek: 23 + index,
  templateId: 'threeBed',
}));

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
  return orderedActivities(template).map((activity) => {
    const plannedStart = dayIndexFromWeekDay(activity.relativeWeek, activity.relativeDay);
    const finish = plannedStart + activity.durationDays - 1;
    return { activity, start: plannedStart, finish };
  });
}

export function getEffectiveProgrammeWeeks(template: PlotTemplate) {
  return template.programmeWeeks;
}

export function getStage1StartWeekForPlot(plot: TemplateSitePlot, templates: PlotTemplate[]) {
  const template = getTemplateForPlot(plot, templates);
  return plot.stage9CompleteWeek - getEffectiveProgrammeWeeks(template) + 1;
}

export function getStageNumberForPlotWeek(plot: TemplateSitePlot, week: number, templates: PlotTemplate[]) {
  const relativeWeek = week - getStage1StartWeekForPlot(plot, templates) + 1;
  if (relativeWeek < 1 || relativeWeek > 23) return '';
  return getStageNumberForRelativeWeek(relativeWeek);
}

export function getMilestoneForPlotWeek(plot: TemplateSitePlot, week: number, templates: PlotTemplate[]) {
  const relativeWeek = week - getStage1StartWeekForPlot(plot, templates) + 1;
  const completedStages = PROGRAMME_STAGE_SEQUENCE
    .filter((item) => relativeWeek === item.finishWeek)
    .map((item) => String(item.stage));
  return completedStages.join('/');
}

export function getStageLabelForNumber(stage: ProgrammeStageNumber) {
  return STAGE_LABELS[stage] ?? `Stage ${stage}`;
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

function cascadingMoveDelta(plotId: string, activityOrder: number, moves: ActivityMove[], activities: TemplateActivity[]) {
  return moves.reduce((total, move) => {
    if (move.plotId !== plotId) return total;
    const movedActivity = activities.find((item) => item.code === move.activityCode);
    if (!movedActivity) return total;
    return movedActivity.order <= activityOrder ? total + move.deltaDays : total;
  }, 0);
}

export function getActivityBaseStartDay(template: PlotTemplate, activityCode: string) {
  const activity = template.activities.find((item) => item.code === activityCode);
  if (!activity) return null;
  return dayIndexFromWeekDay(activity.relativeWeek, activity.relativeDay);
}

function activityRange(plot: TemplateSitePlot, template: PlotTemplate, activity: TemplateActivity, delays: ActivityDelay[], moves: ActivityMove[] = []) {
  const stage1Week = getStage1StartWeekForPlot(plot, [template]);
  const scheduled = getTemplateActivityRanges(template).find((item) => item.activity.code === activity.code);
  const relativeStart = scheduled?.start ?? 1;
  const relativeFinish = scheduled?.finish ?? relativeStart;
  const baseOffset = dayIndexFromWeekDay(stage1Week, 1) - 1;
  const moveDelta = cascadingMoveDelta(plot.id, activity.order, moves, template.activities);
  return {
    start: baseOffset + relativeStart + moveDelta + delayBefore(plot.id, activity.order, delays, template.activities),
    finish: baseOffset + relativeFinish + moveDelta + delayUpTo(plot.id, activity.order, delays, template.activities),
  };
}

export function getActivityRangeForPlot(plot: TemplateSitePlot, activityCode: string, delays: ActivityDelay[], templates: PlotTemplate[], moves: ActivityMove[] = []) {
  const template = getTemplateForPlot(plot, templates);
  const activity = template.activities.find((item) => item.code === activityCode);
  if (!activity) return null;
  return activityRange(plot, template, activity, delays, moves);
}

export function getActivityMoveDeltaToTarget(plot: TemplateSitePlot, activityCode: string, targetWeek: number, targetDay: number, delays: ActivityDelay[], templates: PlotTemplate[], moves: ActivityMove[] = []) {
  const currentRange = getActivityRangeForPlot(plot, activityCode, delays, templates, moves);
  if (!currentRange) return 0;
  const targetDayIndex = dayIndexFromWeekDay(targetWeek, targetDay);
  const existingOwnMove = moves.find((move) => move.plotId === plot.id && move.activityCode === activityCode)?.deltaDays ?? 0;
  return existingOwnMove + (targetDayIndex - currentRange.start);
}

export function getActivitiesForTemplateDay(plot: TemplateSitePlot, week: number, day: number, delays: ActivityDelay[], templates: PlotTemplate[], moves: ActivityMove[] = []) {
  const template = getTemplateForPlot(plot, templates);
  const currentDay = dayIndexFromWeekDay(week, day);
  return orderedActivities(template).filter((activity) => {
    const range = activityRange(plot, template, activity, delays, moves);
    return currentDay >= range.start && currentDay <= range.finish;
  });
}

export function getPlotBreakdownTemplateText(plot: TemplateSitePlot, week: number, day: number, delays: ActivityDelay[], templates: PlotTemplate[], moves: ActivityMove[] = []) {
  return getActivitiesForTemplateDay(plot, week, day, delays, templates, moves).map((activity) => activity.code).join('\n');
}

export function getTradeTemplateText(plot: TemplateSitePlot, trade: string, week: number, day: number, delays: ActivityDelay[], templates: PlotTemplate[], moves: ActivityMove[] = []) {
  return getActivitiesForTemplateDay(plot, week, day, delays, templates, moves)
    .filter((activity) => activity.trade === trade)
    .map((activity) => activity.displayText)
    .join('\n');
}

export function plotHasTradeWorkForTemplate(plot: TemplateSitePlot, trade: string, startWeek: number, delays: ActivityDelay[], templates: PlotTemplate[], moves: ActivityMove[] = []) {
  for (let week = startWeek; week <= startWeek + 1; week += 1) {
    for (let day = 1; day <= 5; day += 1) {
      if (getTradeTemplateText(plot, trade, week, day, delays, templates, moves)) return true;
    }
  }
  return false;
}

export function getActiveTemplateTrades(plots: TemplateSitePlot[], startWeek: number, delays: ActivityDelay[], templates: PlotTemplate[], moves: ActivityMove[] = []) {
  return TRADE_ORDER.filter((trade) => plots.some((plot) => plotHasTradeWorkForTemplate(plot, trade, startWeek, delays, templates, moves)));
}
