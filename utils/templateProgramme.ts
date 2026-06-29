import { ActivityDelay, BUILD_SEQUENCE, dayIndexFromWeekDay, ProgrammeActivity, SitePlot, TRADE_ORDER } from './siteProgrammeEngine';

export type TemplateSitePlot = SitePlot & {
  templateId?: string;
};

export type PlotTemplate = {
  id: string;
  name: string;
  description: string;
  programmeWeeks: number;
  stageCount: number;
  activities: ProgrammeActivity[];
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

const overrides: Record<string, Record<string, number>> = {
  apartment: { FND: 3, DNG: 3, SLAB: 15, '1ST BWK': 4, SCAFF: 2, '2ND BWK': 2, JOIST: 1, '3RD BWK': 4, TRUSS: 1, '1ST CARP': 3, '1ST PLUMB': 1, '1ST ELEC': 1, PP: 2, TAC: 1, DAB: 1, TAPE: 2, DRY: 2, '2ND CARP': 2, '2ND PLUMB': 1, PATCH: 2, DEC: 4, FLOORING: 2, 'PRE HANDOVER': 2 },
  twoBed: { '1ST CARP': 3, '1ST PLUMB': 1, '1ST ELEC': 1, PP: 2, TAC: 1, DAB: 1, TAPE: 2, DRY: 2, '2ND CARP': 2, '2ND PLUMB': 1, DEC: 4, FLOORING: 3, 'PRE HANDOVER': 3 },
  threeBed: {},
  fourBed: { SLAB: 28, '1ST BWK': 10, '1ST CARP': 6, '1ST PLUMB': 3, '1ST ELEC': 3, PP: 4, TAC: 3, DAB: 3, TAPE: 4, DRY: 4, '2ND CARP': 4, '2ND PLUMB': 3, PATCH: 4, DEC: 8, FLOORING: 6, 'PRE HANDOVER': 5 },
  fiveBed: { SLAB: 30, '1ST BWK': 10, '3RD BWK': 12, '1ST CARP': 7, '1ST PLUMB': 3, '1ST ELEC': 3, PP: 4, TAC: 3, DAB: 3, TAPE: 4, DRY: 4, '2ND CARP': 5, '2ND PLUMB': 3, PATCH: 4, DEC: 9, 'CARP FINALS': 3, 'PLUMB FINALS': 3, FLOORING: 7, 'PRE HANDOVER': 5 },
};

function makeTemplate(id: string, name: string, description: string, programmeWeeks: number): PlotTemplate {
  const taskOverrides = overrides[id] ?? {};
  return {
    id,
    name,
    description,
    programmeWeeks,
    stageCount: 9,
    activities: BUILD_SEQUENCE.map((activity) => ({ ...activity, durationDays: taskOverrides[activity.code] ?? activity.durationDays })),
  };
}

export const DEFAULT_PLOT_TEMPLATES: PlotTemplate[] = [
  makeTemplate('apartment', 'Apartment', 'Shorter apartment route', 20),
  makeTemplate('twoBed', '2 Bedroom', 'Smaller house template with shorter fix and finish durations', 22),
  makeTemplate('threeBed', '3 Bedroom', 'Standard 23-week house template', 23),
  makeTemplate('fourBed', '4 Bedroom', 'Larger house with extended fix and finish durations', 26),
  makeTemplate('fiveBed', '5 Bedroom', 'Largest house template with longer finish and handover durations', 28),
];

export const DEFAULT_TEMPLATE_PLOTS: TemplateSitePlot[] = [
  { id: 'plot-101', plotNo: '101', stage9CompleteWeek: 23, templateId: 'threeBed' },
  { id: 'plot-102', plotNo: '102', stage9CompleteWeek: 36, templateId: 'fourBed' },
  { id: 'plot-103', plotNo: '103', stage9CompleteWeek: 24, templateId: 'twoBed' },
  { id: 'plot-104', plotNo: '104', stage9CompleteWeek: 25, templateId: 'fiveBed' },
];

export function getTemplateForPlot(plot: TemplateSitePlot, templates: PlotTemplate[]) {
  return templates.find((template) => template.id === plot.templateId) ?? templates.find((template) => template.id === 'threeBed') ?? templates[0];
}

export function getTemplateById(templateId: string | undefined, templates: PlotTemplate[]) {
  return templates.find((template) => template.id === templateId) ?? templates.find((template) => template.id === 'threeBed') ?? templates[0];
}

export function getStage1StartWeekForPlot(plot: TemplateSitePlot, templates: PlotTemplate[]) {
  const template = getTemplateForPlot(plot, templates);
  return plot.stage9CompleteWeek - template.programmeWeeks + 1;
}

export function getMilestoneForPlotWeek(plot: TemplateSitePlot, week: number, templates: PlotTemplate[]) {
  const template = getTemplateForPlot(plot, templates);
  for (let stage = 1; stage <= template.stageCount; stage += 1) {
    const weeksFromHandover = Math.round(((template.stageCount - stage) * (template.programmeWeeks - 1)) / Math.max(1, template.stageCount - 1));
    if (plot.stage9CompleteWeek - weeksFromHandover === week) return String(stage);
  }
  return '';
}

function delayBefore(plotId: string, activityOrder: number, delays: ActivityDelay[], activities: ProgrammeActivity[]) {
  return delays.reduce((total, delay) => {
    if (delay.plotId !== plotId) return total;
    const activity = activities.find((item) => item.code === delay.activityCode);
    return activity && activity.order < activityOrder ? total + delay.delayDays : total;
  }, 0);
}

function delayUpTo(plotId: string, activityOrder: number, delays: ActivityDelay[], activities: ProgrammeActivity[]) {
  return delays.reduce((total, delay) => {
    if (delay.plotId !== plotId) return total;
    const activity = activities.find((item) => item.code === delay.activityCode);
    return activity && activity.order <= activityOrder ? total + delay.delayDays : total;
  }, 0);
}

function activityRange(plot: TemplateSitePlot, template: PlotTemplate, activity: ProgrammeActivity, delays: ActivityDelay[]) {
  const startWeek = plot.stage9CompleteWeek - template.programmeWeeks + 1;
  const baseStart = dayIndexFromWeekDay(startWeek + activity.relativeWeek - 1, activity.relativeDay);
  const baseFinish = baseStart + activity.durationDays - 1;
  return {
    start: baseStart + delayBefore(plot.id, activity.order, delays, template.activities),
    finish: baseFinish + delayUpTo(plot.id, activity.order, delays, template.activities),
  };
}

export function getActivitiesForTemplateDay(plot: TemplateSitePlot, week: number, day: number, delays: ActivityDelay[], templates: PlotTemplate[]) {
  const template = getTemplateForPlot(plot, templates);
  const dayIndex = dayIndexFromWeekDay(week, day);
  return template.activities.filter((activity) => {
    const range = activityRange(plot, template, activity, delays);
    return dayIndex >= range.start && dayIndex <= range.finish;
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
  for (let week = startWeek; week <= startWeek + 1; week += 1) {
    for (let day = 1; day <= 5; day += 1) {
      if (getTradeTemplateText(plot, trade, week, day, delays, templates)) return true;
    }
  }
  return false;
}

export function getActiveTemplateTrades(plots: TemplateSitePlot[], startWeek: number, delays: ActivityDelay[], templates: PlotTemplate[]) {
  return TRADE_ORDER.filter((trade) => plots.some((plot) => plotHasTradeWorkForTemplate(plot, trade, startWeek, delays, templates)));
}
