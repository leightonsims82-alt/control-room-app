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

export function dayIndexFromWeekDay(week: number, day: number) {
  return (week - 1) * 5 + day;
}

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
  'Solar Panels Installer',
  'Carpenter',
  'Plumber',
  'Electrician',
  'Sprinkler',
  'Dry Liner',
  'Plastering',
  'Kitchen Fitter',
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
  { order: 14, code: 'HOP UPS', trade: 'Scaffold', displayText: 'Hop Ups', durationDays: 1, relativeWeek: 13, relativeDay: 4, stage: 5 },
  { order: 15, code: 'GABLES 2', trade: 'Brickwork', displayText: 'Gables', durationDays: 1, relativeWeek: 13, relativeDay: 5, stage: 5 },
  { order: 16, code: 'SS', trade: 'Roof', displayText: 'SS', durationDays: 2, relativeWeek: 14, relativeDay: 1, stage: 5 },
  { order: 17, code: 'F&B', trade: 'Roof', displayText: 'F&B', durationDays: 2, relativeWeek: 14, relativeDay: 2, stage: 5 },
  { order: 18, code: 'SOLAR', trade: 'Solar Panels Installer', displayText: 'Solar', durationDays: 1, relativeWeek: 14, relativeDay: 3, stage: 5 },
  { order: 19, code: 'TILE', trade: 'Roof', displayText: 'Tile', durationDays: 2, relativeWeek: 14, relativeDay: 4, stage: 5 },
  { order: 20, code: 'STRIP BC', trade: 'Scaffold', displayText: 'Strip BC', durationDays: 1, relativeWeek: 14, relativeDay: 5, stage: 5 },
  { order: 21, code: '1ST CARP', trade: 'Carpenter', displayText: '1st Fix', durationDays: 5, relativeWeek: 15, relativeDay: 1, stage: 6 },
  { order: 22, code: '1ST PLUMB', trade: 'Plumber', displayText: '1st Fix', durationDays: 2, relativeWeek: 15, relativeDay: 2, stage: 6 },
  { order: 23, code: '1ST ELEC', trade: 'Electrician', displayText: '1st Fix', durationDays: 2, relativeWeek: 15, relativeDay: 3, stage: 6 },
  { order: 24, code: '1ST SPRINKLER', trade: 'Sprinkler', displayText: '1st Fix', durationDays: 1, relativeWeek: 15, relativeDay: 5, stage: 6 },
  { order: 25, code: 'PP', trade: 'Plastering', displayText: 'PP', durationDays: 3, relativeWeek: 16, relativeDay: 1, stage: 6 },
  { order: 26, code: 'DAB', trade: 'Plastering', displayText: 'Dab', durationDays: 2, relativeWeek: 16, relativeDay: 4, stage: 6 },
  { order: 27, code: 'TAPE', trade: 'Plastering', displayText: 'Tape', durationDays: 4, relativeWeek: 17, relativeDay: 1, stage: 6 },
  { order: 28, code: 'DRY', trade: 'Dry Liner', displayText: 'Dry', durationDays: 3, relativeWeek: 17, relativeDay: 5, stage: 6 },
  { order: 29, code: '2ND CARP', trade: 'Carpenter', displayText: '2nd Fix', durationDays: 5, relativeWeek: 18, relativeDay: 3, stage: 7 },
  { order: 30, code: '2ND PLUMB', trade: 'Plumber', displayText: '2nd Fix', durationDays: 2, relativeWeek: 19, relativeDay: 3, stage: 7 },
  { order: 31, code: '2ND ELEC', trade: 'Electrician', displayText: '2nd Fix', durationDays: 2, relativeWeek: 19, relativeDay: 4, stage: 7 },
  { order: 32, code: 'KITCHEN', trade: 'Kitchen Fitter', displayText: 'Kitchen', durationDays: 3, relativeWeek: 20, relativeDay: 1, stage: 7 },
  { order: 33, code: 'PATCH', trade: 'Dry Liner', displayText: 'Patch', durationDays: 3, relativeWeek: 20, relativeDay: 4, stage: 8 },
  { order: 34, code: 'DEC', trade: 'Decorator', displayText: 'Decorate', durationDays: 8, relativeWeek: 21, relativeDay: 2, stage: 8 },
  { order: 35, code: 'MASTIC', trade: 'Mastic', displayText: 'Mastic', durationDays: 1, relativeWeek: 22, relativeDay: 1, stage: 8 },
  { order: 36, code: 'CARP FINALS', trade: 'Carpenter', displayText: 'Finals', durationDays: 2, relativeWeek: 22, relativeDay: 2, stage: 9 },
  { order: 37, code: 'PLUMB FINALS', trade: 'Plumber', displayText: 'Finals', durationDays: 2, relativeWeek: 22, relativeDay: 3, stage: 9 },
  { order: 38, code: 'ELEC FINALS', trade: 'Electrician', displayText: 'Finals', durationDays: 2, relativeWeek: 22, relativeDay: 4, stage: 9 },
  { order: 39, code: 'FINAL DEC', trade: 'Decorator', displayText: 'Final Dec', durationDays: 5, relativeWeek: 23, relativeDay: 1, stage: 9 },
  { order: 40, code: 'BUILD CLEAN', trade: 'Cleaning', displayText: 'Build Clean', durationDays: 1, relativeWeek: 23, relativeDay: 5, stage: 9 },
  { order: 41, code: 'FLOORING', trade: 'Flooring', displayText: 'Flooring', durationDays: 4, relativeWeek: 24, relativeDay: 1, stage: 9 },
  { order: 42, code: 'SPARKLE', trade: 'Cleaning', displayText: 'Sparkle', durationDays: 2, relativeWeek: 24, relativeDay: 5, stage: 9 },
  { order: 43, code: 'PRE HANDOVER', trade: 'Handover / Site Team', displayText: 'Pre Handover', durationDays: 2, relativeWeek: 25, relativeDay: 2, stage: 9 },
];