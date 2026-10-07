import { CANONICAL_ACTIVITY_LIBRARY } from '../core/programme/activityTruth';

export type DayName = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export type SitePlot = { id: string; plotNo: string; stage9CompleteWeek: number };
export type ActivityDelay = { plotId: string; activityCode: string; delayDays: number };
export type ProgrammeStageNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
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

export const DAY_NAMES: DayName[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const WEEK_NUMBERS = Array.from({ length: 53 }, (_, index) => index + 1);

/**
 * Labels only. Live stage timing comes from the activity schedule engine.
 * The ranges are a baseline representation of the agreed 25-week standard
 * and may overlap where two stages occupy the same calendar week.
 */
export const PROGRAMME_STAGE_SEQUENCE: {
  stage: ProgrammeStageNumber;
  label: string;
  durationWeeks: number;
  startWeek: number;
  finishWeek: number;
}[] = [
  { stage: 1, label: 'Foundations / substructure', durationWeeks: 4, startWeek: 1, finishWeek: 4 },
  { stage: 2, label: 'Band course / slab', durationWeeks: 3, startWeek: 4, finishWeek: 6 },
  { stage: 3, label: 'Superstructure', durationWeeks: 6, startWeek: 6, finishWeek: 11 },
  { stage: 4, label: 'Roof', durationWeeks: 4, startWeek: 11, finishWeek: 14 },
  { stage: 5, label: 'Strip scaffold', durationWeeks: 1, startWeek: 14, finishWeek: 14 },
  { stage: 6, label: '1st fix / pre-plaster', durationWeeks: 6, startWeek: 14, finishWeek: 19 },
  { stage: 7, label: '2nd fix / kitchen', durationWeeks: 3, startWeek: 19, finishWeek: 21 },
  { stage: 8, label: 'Patch / decoration', durationWeeks: 3, startWeek: 21, finishWeek: 23 },
  { stage: 9, label: 'Finals / close-out', durationWeeks: 3, startWeek: 23, finishWeek: 25 },
];

export function getStageNumberForRelativeWeek(week: number): ProgrammeStageNumber | '' {
  return PROGRAMME_STAGE_SEQUENCE
    .filter((item) => week >= item.startWeek && week <= item.finishWeek)
    .map((item) => item.stage)
    .sort((a, b) => a - b)[0] ?? '';
}

export function dayIndexFromWeekDay(week: number, day: number) {
  return (week - 1) * 5 + day;
}

export const DEFAULT_SITE_PLOTS: SitePlot[] = [];

/**
 * Retained for backwards compatibility only. Master V2 does not use milestone
 * interpolation; it reads stages directly from scheduled live activities.
 */
export const MASTER_MILESTONES = [
  { stage: 1, offsetFromStage9: -24, label: 'Foundations / substructure' },
  { stage: 2, offsetFromStage9: -21, label: 'Band course / slab' },
  { stage: 3, offsetFromStage9: -19, label: 'Superstructure' },
  { stage: 4, offsetFromStage9: -14, label: 'Roof' },
  { stage: 5, offsetFromStage9: -11, label: 'Strip scaffold' },
  { stage: 6, offsetFromStage9: -11, label: '1st fix / pre-plaster' },
  { stage: 7, offsetFromStage9: -6, label: '2nd fix / kitchen' },
  { stage: 8, offsetFromStage9: -4, label: 'Patch / decoration' },
  { stage: 9, offsetFromStage9: 0, label: 'Finals / close-out' },
] as const;

export const TRADE_ORDER = [
  'Groundworker',
  'Site Team',
  'Bricklayer',
  'Scaffolder',
  'Carpenter',
  'Roofer',
  'Solar Installer',
  'Window Fitter',
  'Plumber',
  'Electrician',
  'Sprinkler',
  'Insulation Installer',
  'Dry liner',
  'Decorator',
  'Kitchen fitter',
  'Loft Insulator',
  'Tiler',
  'Mastic applicator',
  'Appliance fitter',
  'Floor layer',
  'Cleaner',
] as const;

let sequentialDay = 1;
export const BUILD_SEQUENCE: ProgrammeActivity[] = CANONICAL_ACTIVITY_LIBRARY
  .filter((activity) => !activity.threeStoreyOnly)
  .map((activity, index) => {
    const relativeWeek = Math.floor((sequentialDay - 1) / 5) + 1;
    const relativeDay = ((sequentialDay - 1) % 5) + 1;
    const row: ProgrammeActivity = {
      order: index + 1,
      code: activity.code,
      trade: activity.trade,
      displayText: activity.displayText,
      durationDays: activity.defaultDurationDays,
      relativeWeek,
      relativeDay,
      stage: activity.stage,
    };
    sequentialDay += activity.defaultDurationDays;
    return row;
  });
