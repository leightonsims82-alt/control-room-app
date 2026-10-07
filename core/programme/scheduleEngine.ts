import {
  getProgrammeDateForWorkingDayIndex,
  getProgrammeWeekForDate,
  getProgrammeWorkingDayIndexForDate,
} from '../../utils/programmeDates';
import { canonicaliseActivity, CanonicalStageNumber } from './activityTruth';

export type V2ProgrammeSetup = {
  programmeStartDate: string;
  includeSaturday?: boolean;
  includeSunday?: boolean;
};

export type V2Activity = {
  order: number;
  code: string;
  trade: string;
  displayText: string;
  durationDays: number;
  stage: number;
  overlapAllowed?: boolean;
  overlapLinkCode?: string;
  overlapStartFrom?: 'start' | 'finish';
  overlapLagDays?: number;
};

export type V2Template = {
  id: string;
  programmeWeeks: number;
  activities: V2Activity[];
};

export type V2Plot = {
  id: string;
  stage9CompleteWeek: number;
  plotStartDate?: string;
  plotCompletionDate?: string;
  holdStage?: number;
  finalStageAdjustmentWeeks?: number;
};

export type V2Delay = { plotId: string; activityCode: string; delayDays: number };
export type V2Move = { plotId: string; activityCode: string; deltaDays: number };

export type V2ActivityRange = {
  activity: V2Activity & { stage: CanonicalStageNumber };
  start: number;
  finish: number;
};

export function getV2WorkingDayNumbers(setup?: Partial<V2ProgrammeSetup>) {
  const days = [1, 2, 3, 4, 5];
  if (setup?.includeSaturday) days.push(6);
  if (setup?.includeSunday) days.push(7);
  return days;
}

export function getV2WorkingDaysPerWeek(setup?: Partial<V2ProgrammeSetup>) {
  return getV2WorkingDayNumbers(setup).length || 5;
}

export function getV2WeekEndingDay(setup?: Partial<V2ProgrammeSetup>) {
  if (setup?.includeSunday) return 7;
  if (setup?.includeSaturday) return 6;
  return 5;
}

export function normaliseV2Activities<T extends V2Activity>(activities: T[]) {
  return activities
    .slice()
    .sort((a, b) => a.order - b.order)
    .filter((activity) => activity.durationDays > 0)
    .map((activity, index) => ({
      ...canonicaliseActivity(activity),
      order: index + 1,
      durationDays: Math.max(1, Math.round(Number(activity.durationDays) || 1)),
    }));
}

/**
 * Pure template schedule. Sequential by default. An activity may deliberately
 * overlap another activity; this is the only place overlap is interpreted.
 */
export function buildV2TemplateRanges<T extends V2Activity>(activities: T[]): V2ActivityRange[] {
  const ordered = normaliseV2Activities(activities);
  const ranges: V2ActivityRange[] = [];
  const byCode = new Map<string, V2ActivityRange>();
  let nextSequentialDay = 1;

  for (const activity of ordered) {
    let start = nextSequentialDay;
    if (activity.overlapAllowed && activity.overlapLinkCode) {
      const linked = byCode.get(activity.overlapLinkCode);
      if (linked) {
        const lag = Math.max(0, Math.round(activity.overlapLagDays ?? 0));
        const anchor = activity.overlapStartFrom === 'finish' ? linked.finish + 1 : linked.start;
        start = Math.max(1, anchor + lag);
      }
    }
    const finish = start + activity.durationDays - 1;
    const range = { activity, start, finish };
    ranges.push(range);
    byCode.set(activity.code, range);
    nextSequentialDay = Math.max(nextSequentialDay, finish + 1);
  }

  return ranges;
}

export function getV2TemplateWorkingDays(template: V2Template) {
  const ranges = buildV2TemplateRanges(template.activities);
  return ranges.length ? Math.max(...ranges.map((range) => range.finish)) : Math.max(1, template.programmeWeeks * 5);
}

export function getV2EffectiveProgrammeWeeks(template: V2Template, setup?: Partial<V2ProgrammeSetup>) {
  return Math.max(
    Math.max(1, Math.round(template.programmeWeeks || 1)),
    Math.ceil(getV2TemplateWorkingDays(template) / getV2WorkingDaysPerWeek(setup)),
  );
}

function firstWorkingDayIndexForWeek(week: number, setup?: Partial<V2ProgrammeSetup>) {
  return (Math.max(1, Math.round(week)) - 1) * getV2WorkingDaysPerWeek(setup) + 1;
}

function getPlotBaseOffset(plot: V2Plot, template: V2Template, setup?: Partial<V2ProgrammeSetup>) {
  if (plot.plotCompletionDate && setup?.programmeStartDate) {
    const completionIndex = getProgrammeWorkingDayIndexForDate(
      setup.programmeStartDate,
      plot.plotCompletionDate,
      Boolean(setup.includeSaturday),
      Boolean(setup.includeSunday),
    );
    if (completionIndex) return completionIndex - getV2TemplateWorkingDays(template);
  }

  if (plot.plotStartDate && setup?.programmeStartDate) {
    const startIndex = getProgrammeWorkingDayIndexForDate(
      setup.programmeStartDate,
      plot.plotStartDate,
      Boolean(setup.includeSaturday),
      Boolean(setup.includeSunday),
    );
    if (startIndex) return startIndex - 1;
  }

  const completionWeek = plot.plotCompletionDate && setup?.programmeStartDate
    ? getProgrammeWeekForDate(setup.programmeStartDate, plot.plotCompletionDate) ?? plot.stage9CompleteWeek
    : plot.stage9CompleteWeek;
  const startWeek = Math.max(1, completionWeek - getV2EffectiveProgrammeWeeks(template, setup) + 1);
  return firstWorkingDayIndexForWeek(startWeek, setup) - 1;
}

function adjustmentBefore(
  plotId: string,
  order: number,
  adjustments: Array<V2Delay | V2Move>,
  activities: V2Activity[],
  inclusive: boolean,
  field: 'delayDays' | 'deltaDays',
) {
  return adjustments.reduce((total, adjustment) => {
    if (adjustment.plotId !== plotId) return total;
    const moved = activities.find((activity) => activity.code === adjustment.activityCode);
    if (!moved) return total;
    const qualifies = inclusive ? moved.order <= order : moved.order < order;
    return qualifies ? total + Number(adjustment[field] || 0) : total;
  }, 0);
}

export function getV2FinalStageAdjustments(
  plot: V2Plot,
  template: V2Template,
  delays: V2Delay[],
  setup?: Partial<V2ProgrammeSetup>,
): V2Delay[] {
  const weeks = Math.round(plot.finalStageAdjustmentWeeks ?? 0);
  if (!weeks) return [];
  const activities = normaliseV2Activities(template.activities);
  const last = activities.at(-1);
  if (!last) return [];
  const days = weeks * getV2WorkingDaysPerWeek(setup);

  if (days > 0) return [{ plotId: plot.id, activityCode: last.code, delayDays: days }];

  let remaining = Math.abs(days);
  const result: V2Delay[] = [];
  for (const activity of activities.slice().reverse()) {
    if (activity.stage !== last.stage) continue;
    const existing = delays
      .filter((delay) => delay.plotId === plot.id && delay.activityCode === activity.code)
      .reduce((sum, delay) => sum + Number(delay.delayDays || 0), 0);
    const reducible = Math.max(0, activity.durationDays + existing - 1);
    const reduction = Math.min(remaining, reducible);
    if (reduction) result.push({ plotId: plot.id, activityCode: activity.code, delayDays: -reduction });
    remaining -= reduction;
    if (remaining <= 0) break;
  }
  return result;
}

export function canV2AdjustFinalStage(
  plot: V2Plot,
  delta: -1 | 1,
  template: V2Template,
  delays: V2Delay[],
  setup?: Partial<V2ProgrammeSetup>,
) {
  if (plot.holdStage) return false;
  const activities = normaliseV2Activities(template.activities);
  if (!activities.length) return false;
  const next = { ...plot, finalStageAdjustmentWeeks: (plot.finalStageAdjustmentWeeks ?? 0) + delta };
  if ((next.finalStageAdjustmentWeeks ?? 0) >= 0) return true;
  const lastStage = activities.at(-1)!.stage;
  if (activities.some((activity) => activity.stage === lastStage && activity.overlapAllowed)) return false;
  const applied = getV2FinalStageAdjustments(next, template, delays, setup)
    .reduce((sum, delay) => sum + delay.delayDays, 0);
  return applied === (next.finalStageAdjustmentWeeks ?? 0) * getV2WorkingDaysPerWeek(setup);
}

export function getV2ActivityRange(
  plot: V2Plot,
  template: V2Template,
  target: V2Activity,
  delays: V2Delay[] = [],
  moves: V2Move[] = [],
  setup?: Partial<V2ProgrammeSetup>,
) {
  const activities = normaliseV2Activities(template.activities);
  const base = buildV2TemplateRanges(activities).find((range) => range.activity.code === target.code);
  const baseOffset = getPlotBaseOffset(plot, template, setup);
  const allDelays = [...delays, ...getV2FinalStageAdjustments(plot, template, delays, setup)];
  const startShift =
    adjustmentBefore(plot.id, target.order, allDelays, activities, false, 'delayDays') +
    adjustmentBefore(plot.id, target.order, moves, activities, true, 'deltaDays');
  const finishShift =
    adjustmentBefore(plot.id, target.order, allDelays, activities, true, 'delayDays') +
    adjustmentBefore(plot.id, target.order, moves, activities, true, 'deltaDays');

  return {
    start: baseOffset + (base?.start ?? 1) + startShift,
    finish: baseOffset + (base?.finish ?? 1) + finishShift,
  };
}

export function getV2ActivitiesForWorkingDay(
  plot: V2Plot,
  template: V2Template,
  absoluteWorkingDayIndex: number,
  delays: V2Delay[] = [],
  moves: V2Move[] = [],
  setup?: Partial<V2ProgrammeSetup>,
) {
  return normaliseV2Activities(template.activities).filter((activity) => {
    const range = getV2ActivityRange(plot, template, activity, delays, moves, setup);
    return range.start <= absoluteWorkingDayIndex && range.finish >= absoluteWorkingDayIndex;
  });
}

export function getV2StagesForWeek(
  plot: V2Plot,
  template: V2Template,
  week: number,
  delays: V2Delay[] = [],
  moves: V2Move[] = [],
  setup?: Partial<V2ProgrammeSetup>,
) {
  const days = getV2WorkingDaysPerWeek(setup);
  const first = (Math.max(1, Math.round(week)) - 1) * days + 1;
  const last = first + days - 1;
  return Array.from(new Set(
    normaliseV2Activities(template.activities)
      .filter((activity) => {
        const range = getV2ActivityRange(plot, template, activity, delays, moves, setup);
        return range.start <= last && range.finish >= first;
      })
      .map((activity) => activity.stage),
  )).sort((a, b) => a - b);
}

/** Master rule: if more than one stage occupies a week, display the lowest. */
export function getV2StageDisplayForWeek(
  plot: V2Plot,
  template: V2Template,
  week: number,
  delays: V2Delay[] = [],
  moves: V2Move[] = [],
  setup?: Partial<V2ProgrammeSetup>,
) {
  const lowest = getV2StagesForWeek(plot, template, week, delays, moves, setup)[0];
  if (!lowest) return '';
  if (!plot.holdStage || lowest < plot.holdStage) return String(lowest);
  return lowest === plot.holdStage ? `${lowest}H` : `H${plot.holdStage}`;
}

export function getV2LiveFinishWorkingDay(
  plot: V2Plot,
  template: V2Template,
  delays: V2Delay[] = [],
  moves: V2Move[] = [],
  setup?: Partial<V2ProgrammeSetup>,
) {
  const activities = normaliseV2Activities(template.activities);
  if (!activities.length) return 1;
  return Math.max(...activities.map((activity) => getV2ActivityRange(plot, template, activity, delays, moves, setup).finish));
}

export function getV2LiveFinishWeek(
  plot: V2Plot,
  template: V2Template,
  delays: V2Delay[] = [],
  moves: V2Move[] = [],
  setup?: Partial<V2ProgrammeSetup>,
) {
  return Math.max(1, Math.ceil(getV2LiveFinishWorkingDay(plot, template, delays, moves, setup) / getV2WorkingDaysPerWeek(setup)));
}

export function getV2LiveFinishDate(
  plot: V2Plot,
  template: V2Template,
  delays: V2Delay[] = [],
  moves: V2Move[] = [],
  setup?: Partial<V2ProgrammeSetup>,
) {
  if (!setup?.programmeStartDate) return plot.plotCompletionDate ?? '';
  return getProgrammeDateForWorkingDayIndex(
    setup.programmeStartDate,
    getV2LiveFinishWorkingDay(plot, template, delays, moves, setup),
    Boolean(setup.includeSaturday),
    Boolean(setup.includeSunday),
  );
}

export function getV2MasterWeeks(
  plots: Array<{ plot: V2Plot; template: V2Template }>,
  startWeek: number,
  delays: V2Delay[] = [],
  moves: V2Move[] = [],
  setup?: Partial<V2ProgrammeSetup>,
) {
  const first = Math.max(1, Math.round(startWeek || 1));
  const last = plots.length
    ? Math.max(first, ...plots.map(({ plot, template }) => getV2LiveFinishWeek(plot, template, delays, moves, setup)))
    : first;
  return Array.from({ length: last - first + 1 }, (_, index) => first + index);
}
