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
export const TRADE_ORDER = ['Groundworker', 'Site Team', 'Bricklayer', 'Scaffolder', 'Carpenter', 'Roofer', 'Solar Installer', 'Window Fitter', 'Plumber', 'Electrician', 'Sprinkler', 'Dry liner', 'Decorator', 'Kitchen fitter', 'Loft insulator', 'Tiler', taskCode('Mastic ', 'applicator'), 'Appliance fitter', 'Floor layer', 'Cleaner'] as const;
const a = (order: number, code: string, trade: string, displayText: string, durationDays: number, relativeWeek: number, relativeDay: number, stage: ProgrammeActivity['stage']): ProgrammeActivity => ({ order, code, trade, displayText, durationDays, relativeWeek, relativeDay, stage });

export const BUILD_SEQUENCE: ProgrammeActivity[] = [
  a(1, 'Foundation', 'Groundworker', 'FND', 5, 1, 1, 1),
  a(2, 'Drainage', 'Groundworker', 'DNG', 5, 2, 1, 1),
  a(3, 'QA Drainage', 'Site Team', 'QA', 1, 2, 5, 1),
  a(4, 'Slab', 'Groundworker', 'Slab', 25, 3, 1, 2),
  a(5, '1st lift brickwork', 'Bricklayer', '1st BWK', 8, 8, 1, 4),
  a(6, 'Base lift scaffold', 'Scaffolder', 'Base', 3, 9, 1, 4),
  a(7, '2nd lift brickwork', 'Bricklayer', '2nd BWK', 3, 9, 3, 4),
  a(8, '2nd lift Scaffolding', 'Scaffolder', '2nd Scaff', 3, 10, 1, 4),
  a(9, 'Joist and flooring', 'Carpenter', 'Joist', 3, 10, 4, 4),
  a(10, '3rd lift brickwork', 'Bricklayer', '3rd BWK', 10, 11, 1, 4),
  a(11, '3rd lift scaffold', 'Scaffolder', '3rd and bird', 3, 13, 1, 4),
  a(12, '4th lift Brickwork', 'Bricklayer', '4th Brickwork', 3, 13, 4, 4),
  a(13, '4th lift scaffold', 'Scaffolder', '4th scaff', 2, 14, 2, 4),
  a(14, 'Truss', 'Carpenter', 'Truss', 3, 14, 4, 5),
  a(15, 'Gables', 'Bricklayer', 'Gables', 1, 15, 2, 5),
  a(16, 'Hop up', 'Scaffolder', 'Hop up', 1, 15, 3, 5),
  a(17, 'Top Out', 'Bricklayer', 'Top out', 1, 15, 4, 5),
  a(18, 'QA superstructure', 'Site Team', 'QA', 1, 15, 5, 5),
  a(19, 'Tile and Batten', 'Roofer', 'T&B', 2, 16, 1, 5),
  a(20, 'Solar Panels', 'Solar Installer', 'Solar', 1, 16, 3, 5),
  a(21, 'Tile', 'Roofer', 'Tile', 2, 16, 4, 5),
  a(22, 'Windows', 'Window Fitter', 'Windows', 2, 17, 1, 6),
  a(23, '1st fix carpentry', 'Carpenter', '1st Carp', 5, 17, 3, 6),
  a(24, '1st fix Plumbing', 'Plumber', '1st plum', 2, 18, 3, 6),
  a(25, '1st fix electrics', 'Electrician', '1st elec', 2, 18, 5, 6),
  a(26, '1st fix sprinkler', 'Sprinkler', '1st sprinkler', 1, 19, 2, 6),
  a(27, 'QA pre plaster', 'Site Team', 'QA', 1, 19, 3, 6),
  a(28, 'Tac', 'Dry liner', 'Tac', 5, 19, 4, 6),
  a(29, 'dab', 'Dry liner', 'dab', 2, 20, 4, 6),
  a(30, 'tape and joint', 'Dry liner', 'tape', 4, 21, 1, 6),
  a(31, 'sand', 'Dry liner', 'sand', 3, 21, 5, 6),
  a(32, 'mist coat', 'Decorator', 'mist', 2, 22, 3, 6),
  a(33, '2nd fix carpentry', 'Carpenter', '2nd carp', 5, 22, 5, 7),
  a(34, '2nd fix plumbing', 'Plumber', '2nd plumb', 2, 23, 5, 7),
  a(35, '2nd fix electrician', 'Electrician', '2nd elec', 2, 24, 2, 7),
  a(36, 'Fit kitchen', 'Kitchen fitter', 'Kitchen', 3, 24, 4, 7),
  a(37, 'loft insulation', 'Loft insulator', 'Loft', 1, 25, 2, 7),
  a(38, 'patch', 'Dry liner', 'patch', 3, 25, 3, 8),
  a(39, 'Wall tile', 'Tiler', 'Tile', 2, 26, 1, 8),
  a(40, 'decorate', 'Decorator', 'dec', 8, 26, 3, 8),
  a(41, 'Carpentry Finals', 'Carpenter', 'Finals carp', 2, 28, 1, 9),
  a(42, 'Plumbing finals', 'Plumber', 'Finals Plumb', 2, 28, 3, 9),
  a(43, 'Electrical Finals', 'Electrician', 'Finals elec', 2, 28, 5, 9),
  a(44, 'Sprinkler commsision', 'Sprinkler', 'Sprinkler Com', 1, 29, 2, 9),
  a(45, 'build clean', 'Cleaner', 'Build clean', 1, 29, 3, 9),
  a(46, taskCode('mas', 'tic'), taskCode('Mastic ', 'applicator'), taskCode('Mas', 'tic'), 1, 29, 4, 9),
  a(47, 'Fit appliances', 'Appliance fitter', 'Appliances', 1, 29, 5, 9),
  a(48, 'Snag patch', 'Dry liner', 'Snag patch', 2, 30, 1, 9),
  a(49, 'Decoration finals', 'Decorator', 'Dec Finals', 2, 30, 3, 9),
  a(50, 'Flooring', 'Floor layer', 'carpets/vinyl', 4, 30, 5, 9),
  a(51, 'Doors over carpets', 'Carpenter', 'DOC', 1, 31, 4, 9),
  a(52, 'Touch ups after carpets', 'Decorator', 'After carpets', 1, 31, 5, 9),
  a(53, 'Reclean', 'Cleaner', 'Reclean', 1, 32, 1, 9),
  a(54, 'QA Pre handover', 'Site Team', 'QA', 1, 32, 2, 9),
  a(55, 'Home tour', 'Site Team', 'Home tour', 1, 32, 3, 9),
];