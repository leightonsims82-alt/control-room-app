export type DayName = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri';

export type SitePlot = {
  id: string;
  plotNo: string;
  stage9CompleteWeek: number;
};

export type ActivityDelay = {
  plotId: string;
  activityCode: string;
  delayDays: number;
};

export type ProgrammeStageNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

export type ProgrammeActivity = {
  order: number;
  code: string;
  trade: string;
  displayText: string;
  durationDays: number;
  relativeWeek: number;
  relativeDay: number;
  stage: ProgrammeStageNumber;
};

export const DAY_NAMES: DayName[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
export const WEEK_NUMBERS = Array.from({ length: 52 }, (_, index) => index + 1);

export const DEFAULT_SITE_PLOTS: SitePlot[] = [
  { id: 'plot-1', plotNo: '1', stage9CompleteWeek: 23 },
  { id: 'plot-2', plotNo: '2', stage9CompleteWeek: 24 },
  { id: 'plot-3', plotNo: '3', stage9CompleteWeek: 25 },
  { id: 'plot-4', plotNo: '4', stage9CompleteWeek: 26 },
  { id: 'plot-5', plotNo: '5', stage9CompleteWeek: 27 },
  { id: 'plot-6', plotNo: '6', stage9CompleteWeek: 28 },
  { id: 'plot-7', plotNo: '7', stage9CompleteWeek: 29 },
  { id: 'plot-8', plotNo: '8', stage9CompleteWeek: 30 },
  { id: 'plot-9', plotNo: '9', stage9CompleteWeek: 31 },
  { id: 'plot-10', plotNo: '10', stage9CompleteWeek: 32 },
];

export const PROGRAMME_STAGE_SEQUENCE: { stage: ProgrammeStageNumber; label: string; durationWeeks: number; startWeek: number; finishWeek: number }[] = [
  { stage: 1, label: 'Foundations', durationWeeks: 2, startWeek: 1, finishWeek: 2 },
  { stage: 2, label: 'Slab / oversite', durationWeeks: 6, startWeek: 3, finishWeek: 8 },
  { stage: 3, label: 'Superstructure incl. roof framing', durationWeeks: 4, startWeek: 9, finishWeek: 12 },
  { stage: 4, label: 'Roof covering', durationWeeks: 2, startWeek: 13, finishWeek: 14 },
  { stage: 5, label: 'Pre-plaster', durationWeeks: 2, startWeek: 15, finishWeek: 16 },
  { stage: 6, label: 'Drylinings', durationWeeks: 2, startWeek: 17, finishWeek: 18 },
  { stage: 7, label: '2nd fix', durationWeeks: 2, startWeek: 19, finishWeek: 20 },
  { stage: 8, label: 'Patching', durationWeeks: 1, startWeek: 21, finishWeek: 21 },
  { stage: 9, label: 'Finals', durationWeeks: 1, startWeek: 22, finishWeek: 22 },
  { stage: 10, label: 'Flooring', durationWeeks: 1, startWeek: 23, finishWeek: 23 },
  { stage: 11, label: 'Final decoration / pre-handover', durationWeeks: 1, startWeek: 23, finishWeek: 23 },
];

export const MASTER_MILESTONES = PROGRAMME_STAGE_SEQUENCE.map((item) => ({
  stage: item.stage,
  offsetFromStage9: item.finishWeek - 23,
  label: item.label,
})) as { stage: ProgrammeStageNumber; offsetFromStage9: number; label: string }[];

export const TRADE_ORDER = [
  'Groundworks',
  'Brickwork',
  'Scaffold',
  'Roof',
  'Carpenter',
  'Plumber',
  'Electrician',
  'Sprinkler',
  'Plastering',
  'Decorator',
  'Mastic',
  'Flooring',
  'Cleaning',
  'Handover / Site Team',
] as const;

export const BUILD_SEQUENCE: ProgrammeActivity[] = [
  { order: 1, code: 'FND', trade: 'Groundworks', displayText: 'FND', durationDays: 10, relativeWeek: 1, relativeDay: 1, stage: 1 },
  { order: 2, code: 'DNG', trade: 'Groundworks', displayText: 'DNG', durationDays: 5, relativeWeek: 2, relativeDay: 1, stage: 1 },
  { order: 3, code: 'SLAB', trade: 'Groundworks', displayText: 'Slab', durationDays: 30, relativeWeek: 3, relativeDay: 1, stage: 2 },
  { order: 4, code: '1ST BWK', trade: 'Brickwork', displayText: '1st Lift', durationDays: 8, relativeWeek: 9, relativeDay: 1, stage: 3 },
  { order: 5, code: 'SCAFF', trade: 'Scaffold', displayText: '1st Lift', durationDays: 3, relativeWeek: 9, relativeDay: 1, stage: 3 },
  { order: 6, code: '2ND BWK', trade: 'Brickwork', displayText: '2nd Lift', durationDays: 3, relativeWeek: 9, relativeDay: 3, stage: 3 },
  { order: 7, code: 'JOIST', trade: 'Carpenter', displayText: 'Joist', durationDays: 3, relativeWeek: 9, relativeDay: 5, stage: 3 },
  { order: 8, code: '2ND LIFT SCAFF', trade: 'Scaffold', displayText: '2nd Lift', durationDays: 3, relativeWeek: 10, relativeDay: 1, stage: 3 },
  { order: 9, code: '3RD BWK', trade: 'Brickwork', displayText: '3rd Lift', durationDays: 10, relativeWeek: 10, relativeDay: 1, stage: 3 },
  { order: 10, code: '3RD SCAFF', trade: 'Scaffold', displayText: '3rd Lift', durationDays: 3, relativeWeek: 11, relativeDay: 3, stage: 3 },
  { order: 11, code: '4TH BWK', trade: 'Brickwork', displayText: '4th Lift', durationDays: 3, relativeWeek: 12, relativeDay: 1, stage: 3 },
  { order: 12, code: '5TH SCAFF', trade: 'Scaffold', displayText: '5th Lift', durationDays: 2, relativeWeek: 12, relativeDay: 4, stage: 3 },
  { order: 13, code: 'TRUSS', trade: 'Roof', displayText: 'Truss', durationDays: 4, relativeWeek: 12, relativeDay: 2, stage: 3 },
  { order: 14, code: 'GABLES', trade: 'Brickwork', displayText: 'Gables', durationDays: 5, relativeWeek: 12, relativeDay: 3, stage: 3 },
  { order: 15, code: 'ROOF COVER', trade: 'Roof', displayText: 'Roof Cover', durationDays: 10, relativeWeek: 13, relativeDay: 1, stage: 4 },
  { order: 16, code: 'SS', trade: 'Roof', displayText: 'SS', durationDays: 2, relativeWeek: 13, relativeDay: 1, stage: 4 },
  { order: 17, code: 'F&B', trade: 'Roof', displayText: 'F&B', durationDays: 2, relativeWeek: 13, relativeDay: 3, stage: 4 },
  { order: 18, code: 'SOLAR', trade: 'Roof', displayText: 'Solar', durationDays: 1, relativeWeek: 13, relativeDay: 5, stage: 4 },
  { order: 19, code: 'TILE', trade: 'Roof', displayText: 'Tile', durationDays: 5, relativeWeek: 14, relativeDay: 1, stage: 4 },
  { order: 20, code: 'STRIP BC', trade: 'Scaffold', displayText: 'Strip BC', durationDays: 1, relativeWeek: 14, relativeDay: 5, stage: 4 },
  { order: 21, code: '1ST CARP', trade: 'Carpenter', displayText: '1st Fix', durationDays: 3, relativeWeek: 15, relativeDay: 1, stage: 5 },
  { order: 22, code: '1ST PLUMB', trade: 'Plumber', displayText: '1st Fix', durationDays: 2, relativeWeek: 15, relativeDay: 2, stage: 5 },
  { order: 23, code: '1ST ELEC', trade: 'Electrician', displayText: '1st Fix', durationDays: 2, relativeWeek: 15, relativeDay: 3, stage: 5 },
  { order: 24, code: '1ST SPRINKLER', trade: 'Sprinkler', displayText: '1st Fix', durationDays: 1, relativeWeek: 15, relativeDay: 5, stage: 5 },
  { order: 25, code: 'PP', trade: 'Plastering', displayText: 'PP', durationDays: 2, relativeWeek: 16, relativeDay: 1, stage: 5 },
  { order: 26, code: 'PRE-PLASTER QA', trade: 'Handover / Site Team', displayText: 'Pre-plaster QA', durationDays: 2, relativeWeek: 16, relativeDay: 4, stage: 5 },
  { order: 27, code: 'BOARD', trade: 'Plastering', displayText: 'Board', durationDays: 5, relativeWeek: 17, relativeDay: 1, stage: 6 },
  { order: 28, code: 'TAPE', trade: 'Plastering', displayText: 'Tape', durationDays: 3, relativeWeek: 18, relativeDay: 1, stage: 6 },
  { order: 29, code: 'DRY', trade: 'Plastering', displayText: 'Dry', durationDays: 3, relativeWeek: 18, relativeDay: 3, stage: 6 },
  { order: 30, code: 'MIST', trade: 'Decorator', displayText: 'Mist', durationDays: 1, relativeWeek: 18, relativeDay: 5, stage: 6 },
  { order: 31, code: '2ND CARP', trade: 'Carpenter', displayText: '2nd Fix', durationDays: 4, relativeWeek: 19, relativeDay: 1, stage: 7 },
  { order: 32, code: '2ND PLUMB', trade: 'Plumber', displayText: '2nd Fix', durationDays: 2, relativeWeek: 19, relativeDay: 2, stage: 7 },
  { order: 33, code: '2ND ELEC', trade: 'Electrician', displayText: '2nd Fix', durationDays: 1, relativeWeek: 19, relativeDay: 4, stage: 7 },
  { order: 34, code: 'KITCHEN', trade: 'Carpenter', displayText: 'Kitchen', durationDays: 3, relativeWeek: 20, relativeDay: 1, stage: 7 },
  { order: 35, code: 'PATCH', trade: 'Decorator', displayText: 'Patch', durationDays: 5, relativeWeek: 21, relativeDay: 1, stage: 8 },
  { order: 36, code: 'DEC', trade: 'Decorator', displayText: 'Decorate', durationDays: 5, relativeWeek: 22, relativeDay: 1, stage: 9 },
  { order: 37, code: 'CARP FINALS', trade: 'Carpenter', displayText: 'Finals', durationDays: 1, relativeWeek: 22, relativeDay: 4, stage: 9 },
  { order: 38, code: 'PLUMB FINALS', trade: 'Plumber', displayText: 'Finals', durationDays: 1, relativeWeek: 22, relativeDay: 4, stage: 9 },
  { order: 39, code: 'ELEC FINALS', trade: 'Electrician', displayText: 'Finals', durationDays: 1, relativeWeek: 22, relativeDay: 5, stage: 9 },
  { order: 40, code: 'FLOORING', trade: 'Flooring', displayText: 'Flooring', durationDays: 5, relativeWeek: 23, relativeDay: 1, stage: 10 },
  { order: 41, code: 'FINAL DEC', trade: 'Decorator', displayText: 'Final Dec', durationDays: 5, relativeWeek: 23, relativeDay: 1, stage: 11 },
  { order: 42, code: 'BUILD CLEAN', trade: 'Cleaning', displayText: 'Build Clean', durationDays: 1, relativeWeek: 23, relativeDay: 2, stage: 11 },
  { order: 43, code: 'PRE HANDOVER', trade: 'Handover / Site Team', displayText: 'Pre Handover', durationDays: 2, relativeWeek: 23, relativeDay: 4, stage: 11 },
];

export function getStage1StartWeek(plot: SitePlot) {
  return plot.stage9CompleteWeek - 22;
}

export function getStageNumberForRelativeWeek(relativeWeek: number) {
  const activeStages = PROGRAMME_STAGE_SEQUENCE.filter((item) => relativeWeek >= item.startWeek && relativeWeek <= item.finishWeek).map((item) => String(item.stage));
  return activeStages.join('/');
}

export function getStageNumberForWeek(plot: SitePlot, week: number) {
  const relativeWeek = week - getStage1StartWeek(plot) + 1;
  if (relativeWeek < 1 || relativeWeek > 23) return '';
  return getStageNumberForRelativeWeek(relativeWeek);
}

export function getMilestoneForWeek(plot: SitePlot, week: number) {
  const relativeWeek = week - getStage1StartWeek(plot) + 1;
  const completedStages = PROGRAMME_STAGE_SEQUENCE.filter((item) => relativeWeek === item.finishWeek).map((item) => String(item.stage));
  return completedStages.join('/');
}

export function dayIndexFromWeekDay(week: number, day: number) {
  return (week - 1) * 5 + day;
}

function getDelayDaysBeforeActivity(plotId: string, activityOrder: number, delays: ActivityDelay[] = []) {
  return delays
    .filter((delay) => delay.plotId === plotId)
    .reduce((total, delay) => {
      const activity = BUILD_SEQUENCE.find((item) => item.code === delay.activityCode);
      if (!activity) return total;
      return activity.order < activityOrder ? total + delay.delayDays : total;
    }, 0);
}

function getDelayDaysUpToActivity(plotId: string, activityOrder: number, delays: ActivityDelay[] = []) {
  return delays
    .filter((delay) => delay.plotId === plotId)
    .reduce((total, delay) => {
      const activity = BUILD_SEQUENCE.find((item) => item.code === delay.activityCode);
      if (!activity) return total;
      return activity.order <= activityOrder ? total + delay.delayDays : total;
    }, 0);
}

export function getActivityLiveRange(plot: SitePlot, activity: ProgrammeActivity, delays: ActivityDelay[] = []) {
  const stage1StartWeek = getStage1StartWeek(plot);
  const baseStartDay = dayIndexFromWeekDay(stage1StartWeek + activity.relativeWeek - 1, activity.relativeDay);
  const baseFinishDay = baseStartDay + activity.durationDays - 1;
  return {
    startDayIndex: baseStartDay + getDelayDaysBeforeActivity(plot.id, activity.order, delays),
    finishDayIndex: baseFinishDay + getDelayDaysUpToActivity(plot.id, activity.order, delays),
  };
}

export function getActivitiesForDay(plot: SitePlot, week: number, day: number, delays: ActivityDelay[] = []) {
  const cellDayIndex = dayIndexFromWeekDay(week, day);
  return BUILD_SEQUENCE.filter((activity) => {
    const range = getActivityLiveRange(plot, activity, delays);
    return cellDayIndex >= range.startDayIndex && cellDayIndex <= range.finishDayIndex;
  });
}

export function getPlotBreakdownCellText(plot: SitePlot, week: number, day: number, delays: ActivityDelay[] = []) {
  return getActivitiesForDay(plot, week, day, delays)
    .map((activity) => activity.code)
    .join('\n');
}

export function getTradeCellText(plot: SitePlot, trade: string, week: number, day: number, delays: ActivityDelay[] = []) {
  return getActivitiesForDay(plot, week, day, delays)
    .filter((activity) => activity.trade === trade)
    .map((activity) => activity.displayText)
    .join('\n');
}

export function plotHasTradeWorkInWindow(plot: SitePlot, trade: string, startWeek: number, delays: ActivityDelay[] = []) {
  for (let week = startWeek; week <= startWeek + 1; week += 1) {
    for (let day = 1; day <= 5; day += 1) {
      if (getTradeCellText(plot, trade, week, day, delays)) return true;
    }
  }
  return false;
}

export function getActiveTradesForWindow(plots: SitePlot[], startWeek: number, delays: ActivityDelay[] = []) {
  return TRADE_ORDER.filter((trade) => plots.some((plot) => plotHasTradeWorkInWindow(plot, trade, startWeek, delays)));
}
