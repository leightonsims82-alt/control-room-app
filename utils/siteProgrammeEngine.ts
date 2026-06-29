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

export type ProgrammeActivity = {
  order: number;
  code: string;
  trade: string;
  displayText: string;
  durationDays: number;
  relativeWeek: number;
  relativeDay: number;
  stage: 1 | 2 | 4 | 5 | 6 | 7 | 8 | 9;
};

export const DAY_NAMES: DayName[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
export const WEEK_NUMBERS = Array.from({ length: 52 }, (_, index) => index + 1);

export const DEFAULT_SITE_PLOTS: SitePlot[] = [
  { id: 'plot-101', plotNo: '101', stage9CompleteWeek: 23 },
  { id: 'plot-102', plotNo: '102', stage9CompleteWeek: 36 },
  { id: 'plot-103', plotNo: '103', stage9CompleteWeek: 24 },
  { id: 'plot-104', plotNo: '104', stage9CompleteWeek: 25 },
];

export const MASTER_MILESTONES = [
  { stage: 1, offsetFromStage9: -21, label: 'Foundation complete' },
  { stage: 2, offsetFromStage9: -16, label: 'Slab complete' },
  { stage: 4, offsetFromStage9: -11, label: 'Wall plate complete' },
  { stage: 5, offsetFromStage9: -9, label: 'Roof complete' },
  { stage: 6, offsetFromStage9: -7, label: 'Pre-plaster complete' },
  { stage: 7, offsetFromStage9: -5, label: '2nd fix complete' },
  { stage: 8, offsetFromStage9: -3, label: 'Decoration complete' },
  { stage: 9, offsetFromStage9: 0, label: 'Handover complete' },
] as const;

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
  { order: 1, code: 'FND', trade: 'Groundworks', displayText: 'FND', durationDays: 5, relativeWeek: 1, relativeDay: 1, stage: 1 },
  { order: 2, code: 'DNG', trade: 'Groundworks', displayText: 'DNG', durationDays: 5, relativeWeek: 2, relativeDay: 1, stage: 1 },
  { order: 3, code: 'SLAB', trade: 'Groundworks', displayText: 'Slab', durationDays: 25, relativeWeek: 3, relativeDay: 1, stage: 2 },
  { order: 4, code: '1ST BWK', trade: 'Brickwork', displayText: '1st Lift', durationDays: 8, relativeWeek: 8, relativeDay: 1, stage: 4 },
  { order: 5, code: 'SCAFF', trade: 'Scaffold', displayText: '1st Lift', durationDays: 3, relativeWeek: 9, relativeDay: 1, stage: 4 },
  { order: 6, code: '2ND BWK', trade: 'Brickwork', displayText: '2nd Lift', durationDays: 3, relativeWeek: 9, relativeDay: 3, stage: 4 },
  { order: 7, code: 'JOIST', trade: 'Carpenter', displayText: 'Joist', durationDays: 3, relativeWeek: 9, relativeDay: 5, stage: 4 },
  { order: 8, code: '2ND LIFT SCAFF', trade: 'Scaffold', displayText: '2nd Lift', durationDays: 3, relativeWeek: 10, relativeDay: 1, stage: 4 },
  { order: 9, code: '3RD BWK', trade: 'Brickwork', displayText: '3rd Lift', durationDays: 10, relativeWeek: 10, relativeDay: 1, stage: 4 },
  { order: 10, code: '3RD SCAFF', trade: 'Scaffold', displayText: '3rd Lift', durationDays: 3, relativeWeek: 11, relativeDay: 3, stage: 4 },
  { order: 11, code: '4TH BWK', trade: 'Brickwork', displayText: '4th Lift', durationDays: 3, relativeWeek: 12, relativeDay: 1, stage: 4 },
  { order: 12, code: '5TH SCAFF', trade: 'Scaffold', displayText: '5th Lift', durationDays: 2, relativeWeek: 12, relativeDay: 4, stage: 4 },
  { order: 13, code: 'TRUSS', trade: 'Roof', displayText: 'Truss', durationDays: 3, relativeWeek: 13, relativeDay: 1, stage: 5 },
  { order: 14, code: 'GABLES 1', trade: 'Brickwork', displayText: 'Gables', durationDays: 4, relativeWeek: 13, relativeDay: 2, stage: 5 },
  { order: 15, code: 'HOP UPS', trade: 'Scaffold', displayText: 'Hop Ups', durationDays: 1, relativeWeek: 13, relativeDay: 5, stage: 5 },
  { order: 16, code: 'GABLES 2', trade: 'Brickwork', displayText: 'Gables', durationDays: 1, relativeWeek: 14, relativeDay: 1, stage: 5 },
  { order: 17, code: 'SS', trade: 'Roof', displayText: 'SS', durationDays: 2, relativeWeek: 14, relativeDay: 2, stage: 5 },
  { order: 18, code: 'F&B', trade: 'Roof', displayText: 'F&B', durationDays: 2, relativeWeek: 14, relativeDay: 3, stage: 5 },
  { order: 19, code: 'SOLAR', trade: 'Roof', displayText: 'Solar', durationDays: 1, relativeWeek: 14, relativeDay: 4, stage: 5 },
  { order: 20, code: 'TILE', trade: 'Roof', displayText: 'Tile', durationDays: 2, relativeWeek: 14, relativeDay: 4, stage: 5 },
  { order: 21, code: 'STRIP BC', trade: 'Scaffold', displayText: 'Strip BC', durationDays: 1, relativeWeek: 14, relativeDay: 5, stage: 5 },
  { order: 22, code: '1ST CARP', trade: 'Carpenter', displayText: '1st Fix', durationDays: 5, relativeWeek: 15, relativeDay: 1, stage: 6 },
  { order: 23, code: '1ST PLUMB', trade: 'Plumber', displayText: '1st Fix', durationDays: 2, relativeWeek: 15, relativeDay: 2, stage: 6 },
  { order: 24, code: '1ST ELEC', trade: 'Electrician', displayText: '1st Fix', durationDays: 2, relativeWeek: 15, relativeDay: 3, stage: 6 },
  { order: 25, code: '1ST SPRINKLER', trade: 'Sprinkler', displayText: '1st Fix', durationDays: 1, relativeWeek: 15, relativeDay: 5, stage: 6 },
  { order: 26, code: 'PP', trade: 'Plastering', displayText: 'PP', durationDays: 3, relativeWeek: 16, relativeDay: 1, stage: 6 },
  { order: 27, code: 'TAC', trade: 'Plastering', displayText: 'TAC', durationDays: 2, relativeWeek: 16, relativeDay: 3, stage: 6 },
  { order: 28, code: 'DAB', trade: 'Plastering', displayText: 'DAB', durationDays: 2, relativeWeek: 16, relativeDay: 4, stage: 6 },
  { order: 29, code: 'TAPE', trade: 'Plastering', displayText: 'Tape', durationDays: 3, relativeWeek: 17, relativeDay: 1, stage: 7 },
  { order: 30, code: 'DRY', trade: 'Plastering', displayText: 'Dry', durationDays: 3, relativeWeek: 17, relativeDay: 4, stage: 7 },
  { order: 31, code: 'SAND', trade: 'Plastering', displayText: 'Sand', durationDays: 1, relativeWeek: 18, relativeDay: 2, stage: 7 },
  { order: 32, code: 'MIST', trade: 'Decorator', displayText: 'Mist', durationDays: 1, relativeWeek: 18, relativeDay: 3, stage: 7 },
  { order: 33, code: '2ND CARP', trade: 'Carpenter', displayText: '2nd Fix', durationDays: 3, relativeWeek: 18, relativeDay: 1, stage: 7 },
  { order: 34, code: '2ND PLUMB', trade: 'Plumber', displayText: '2nd Fix', durationDays: 2, relativeWeek: 18, relativeDay: 2, stage: 7 },
  { order: 35, code: '2ND ELEC', trade: 'Electrician', displayText: '2nd Fix', durationDays: 1, relativeWeek: 18, relativeDay: 4, stage: 7 },
  { order: 36, code: 'PATCH', trade: 'Decorator', displayText: 'Patch', durationDays: 3, relativeWeek: 18, relativeDay: 5, stage: 7 },
  { order: 37, code: 'DEC', trade: 'Decorator', displayText: 'Decorate', durationDays: 6, relativeWeek: 19, relativeDay: 1, stage: 8 },
  { order: 38, code: 'CARP FINALS', trade: 'Carpenter', displayText: 'Finals', durationDays: 2, relativeWeek: 20, relativeDay: 2, stage: 8 },
  { order: 39, code: 'PLUMB FINALS', trade: 'Plumber', displayText: 'Finals', durationDays: 2, relativeWeek: 20, relativeDay: 3, stage: 8 },
  { order: 40, code: 'ELEC FINALS', trade: 'Electrician', displayText: 'Finals', durationDays: 1, relativeWeek: 20, relativeDay: 5, stage: 8 },
  { order: 41, code: 'SNAG PATCH', trade: 'Decorator', displayText: 'Snag Patch', durationDays: 2, relativeWeek: 21, relativeDay: 1, stage: 9 },
  { order: 42, code: 'MASTIC', trade: 'Mastic', displayText: 'Mastic', durationDays: 1, relativeWeek: 21, relativeDay: 3, stage: 9 },
  { order: 43, code: 'BUILD CLEAN', trade: 'Cleaning', displayText: 'Build Clean', durationDays: 1, relativeWeek: 21, relativeDay: 4, stage: 9 },
  { order: 44, code: 'FLOORING', trade: 'Flooring', displayText: 'Flooring', durationDays: 5, relativeWeek: 22, relativeDay: 1, stage: 9 },
  { order: 45, code: 'AFTER CARPETS', trade: 'Carpenter', displayText: 'After Carpets', durationDays: 1, relativeWeek: 23, relativeDay: 1, stage: 9 },
  { order: 46, code: 'RECLEAN', trade: 'Cleaning', displayText: 'Reclean', durationDays: 1, relativeWeek: 23, relativeDay: 2, stage: 9 },
  { order: 47, code: 'PRE HANDOVER', trade: 'Handover / Site Team', displayText: 'Pre Handover', durationDays: 4, relativeWeek: 23, relativeDay: 2, stage: 9 },
];

export function getStage1StartWeek(plot: SitePlot) {
  return plot.stage9CompleteWeek - 22;
}

export function getMilestoneForWeek(plot: SitePlot, week: number) {
  const milestone = MASTER_MILESTONES.find((item) => plot.stage9CompleteWeek + item.offsetFromStage9 === week);
  return milestone ? String(milestone.stage) : '';
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
