export type DayName = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri';

export type SitePlot = { id: string; plotNo: string; stage9CompleteWeek: number };
export type ActivityDelay = { plotId: string; activityCode: string; delayDays: number };
export type ProgrammeActivity = { order: number; code: string; trade: string; displayText: string; durationDays: number; relativeWeek: number; relativeDay: number; stage: 1 | 2 | 4 | 5 | 6 | 7 | 8 | 9 };

export const DAY_NAMES: DayName[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
export const WEEK_NUMBERS = Array.from({ length: 52 }, (_, index) => index + 1);
export function dayIndexFromWeekDay(week: number, day: number) { return (week - 1) * 5 + day; }

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

const taskCode = (left: string, right: string) => left + right;
export const TRADE_ORDER = ['Groundworks', 'Brickwork', 'Scaffold', 'Roof', 'Solar Panels Installer', 'Carpenter', 'Plumber', 'Electrician', 'Tiler', 'Sprinkler', 'Dry Liner', 'Plastering', 'Kitchen Fitter', 'Decorator', taskCode('M', 'astic'), 'Flooring', 'Cleaning', 'Handover / Site Team'] as const;
const a = (order: number, code: string, trade: string, displayText: string, durationDays: number, relativeWeek: number, relativeDay: number, stage: ProgrammeActivity['stage']): ProgrammeActivity => ({ order, code, trade, displayText, durationDays, relativeWeek, relativeDay, stage });

export const BUILD_SEQUENCE: ProgrammeActivity[] = [
  a(1, 'FND', 'Groundworks', 'FND', 5, 1, 1, 1),
  a(2, 'DNG', 'Groundworks', 'DNG', 5, 2, 1, 1),
  a(3, 'DNG QA', 'Handover / Site Team', 'Drainage QA', 1, 2, 5, 1),
  a(4, 'SLAB', 'Groundworks', 'Slab', 25, 3, 1, 2),
  a(5, '1ST BWK', 'Brickwork', '1st Lift', 8, 8, 1, 4),
  a(6, 'SCAFF', 'Scaffold', '1st Lift', 3, 9, 1, 4),
  a(7, '2ND BWK', 'Brickwork', '2nd Lift', 3, 9, 3, 4),
  a(8, 'JOIST', 'Carpenter', 'Joist', 3, 9, 5, 4),
  a(9, '2ND LIFT SCAFF', 'Scaffold', '2nd Lift', 3, 10, 1, 4),
  a(10, '3RD BWK', 'Brickwork', '3rd Lift', 10, 10, 1, 4),
  a(11, '3RD SCAFF', 'Scaffold', '3rd Lift', 3, 11, 3, 4),
  a(12, '4TH BWK', 'Brickwork', '4th Lift', 3, 12, 1, 4),
  a(13, '5TH SCAFF', 'Scaffold', '5th Lift', 2, 12, 4, 4),
  a(14, 'TRUSS', 'Roof', 'Truss', 3, 13, 1, 5),
  a(15, 'GABLES 1', 'Brickwork', 'Gables', 1, 13, 4, 5),
  a(16, 'HOP UPS', 'Scaffold', 'Hop Ups', 1, 13, 5, 5),
  a(17, 'GABLES 2', 'Brickwork', 'Gables', 1, 14, 1, 5),
  a(18, 'SS', 'Roof', 'SS', 2, 14, 2, 5),
  a(19, 'F&B', 'Roof', 'F&B', 2, 14, 3, 5),
  a(20, 'SOLAR', 'Solar Panels Installer', 'Solar', 1, 14, 4, 5),
  a(21, 'TILE', 'Roof', 'Tile', 2, 14, 5, 5),
  a(22, taskCode('STR', 'IP BC'), 'Scaffold', taskCode('Str', 'ip BC'), 1, 15, 1, 5),
  a(23, '1ST CARP', 'Carpenter', '1st Fix', 5, 15, 2, 6),
  a(24, '1ST PLUMB', 'Plumber', '1st Fix', 2, 16, 2, 6),
  a(25, '1ST ELEC', 'Electrician', '1st Fix', 2, 16, 4, 6),
  a(26, '1ST SPRINKLER', 'Sprinkler', '1st Fix', 1, 17, 1, 6),
  a(27, 'PP', 'Plastering', 'PP', 3, 17, 2, 6),
  a(28, 'DAB', 'Plastering', 'Dab', 2, 18, 1, 6),
  a(29, 'TAPE', 'Plastering', 'Tape', 4, 18, 3, 6),
  a(30, 'DRY', 'Dry Liner', 'Dry', 3, 19, 2, 6),
  a(31, '2ND CARP', 'Carpenter', '2nd Fix', 5, 20, 1, 7),
  a(32, '2ND PLUMB', 'Plumber', '2nd Fix', 2, 21, 1, 7),
  a(33, '2ND ELEC', 'Electrician', '2nd Fix', 2, 21, 3, 7),
  a(34, 'WALL TILING', 'Tiler', 'Wall Tiling', 2, 22, 1, 7),
  a(35, 'KITCHEN', 'Kitchen Fitter', 'Kitchen', 3, 22, 3, 7),
  a(36, 'PATCH', 'Dry Liner', 'Patch', 3, 23, 1, 8),
  a(37, 'DEC', 'Decorator', 'Decorate', 8, 23, 4, 8),
  a(38, 'CARP FINALS', 'Carpenter', 'Finals', 2, 25, 2, 9),
  a(39, 'PLUMB FINALS', 'Plumber', 'Finals', 2, 25, 4, 9),
  a(40, 'ELEC FINALS', 'Electrician', 'Finals', 2, 26, 1, 9),
  a(41, 'FINAL DEC', 'Decorator', 'Final Dec', 5, 26, 3, 9),
  a(42, 'BUILD CLEAN', 'Cleaning', 'Build Clean', 1, 27, 3, 9),
  a(43, taskCode('MAS', 'TIC'), taskCode('M', 'astic'), taskCode('M', 'astic'), 1, 27, 4, 9),
  a(44, 'FLOORING', 'Flooring', 'Flooring', 4, 27, 5, 9),
  a(45, 'SPARKLE', 'Cleaning', 'Sparkle', 2, 28, 4, 9),
  a(46, 'PRE HANDOVER', 'Handover / Site Team', 'Pre Handover', 2, 29, 1, 9),
];