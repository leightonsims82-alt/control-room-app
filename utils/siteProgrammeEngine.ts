export type DayName = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri';

export type SitePlot = { id: string; plotNo: string; stage9CompleteWeek: number };
export type ActivityDelay = { plotId: string; activityCode: string; delayDays: number };
export type ProgrammeActivity = { order: number; code: string; trade: string; displayText: string; durationDays: number; relativeWeek: number; relativeDay: number; stage: 1 | 2 | 4 | 5 | 6 | 7 | 8 | 9 };

export const DAY_NAMES: DayName[] = ['Mon', 'Tue', 'Wed', 'Fri'];
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
  a(3, 'QA Drainage', 'Site Team', 'QA', 1, 3, 1, 1),
  a(4, 'Slab', 'Groundworker', 'Slab', 15, 3, 2, 2),
  a(5, '1st lift brickwork', 'Bricklayer', '1st BWK', 7, 6, 2, 4),
  a(6, 'Base lift scaffold', 'Scaffolder', 'Base', 3, 7, 4, 4),
  a(7, '2nd lift brickwork', 'Bricklayer', '2nd BWK', 4, 8, 2, 4),
  a(8, '2nd lift Scaffolding', 'Scaffolder', '2nd Scaff', 2, 9, 1, 4),
  a(9, 'Joist and flooring', 'Carpenter', 'Joist', 2, 9, 3, 4),
  a(10, '3rd lift brickwork', 'Bricklayer', '3rd BWK', 7, 9, 5, 4),
  a(11, '3rd lift scaffold', 'Scaffolder', '3rd and bird', 2, 11, 2, 4),
  a(12, '4th lift Brickwork', 'Bricklayer', '4th Brickwork', 2, 11, 4, 4),
  a(13, '4th lift scaffold', 'Scaffolder', '4th scaff', 1, 12, 1, 4),
  a(14, 'Truss', 'Carpenter', 'Truss', 3, 12, 2, 5),
  a(15, 'Gables', 'Bricklayer', 'Gables', 2, 12, 5, 5),
  a(16, 'Hop up', 'Scaffolder', 'Hop up', 1, 13, 2, 5),
  a(17, 'Top Out', 'Bricklayer', 'Top out', 1, 13, 3, 5),
  a(18, 'QA superstructure', 'Site Team', 'QA', 1, 13, 4, 5),
  a(19, 'Tile and Batten', 'Roofer', 'T&B', 1, 13, 5, 5),
  a(20, 'Solar Panels', 'Solar Installer', 'Solar', 1, 14, 1, 5),
  a(21, 'Tile', 'Roofer', 'Tile', 1, 14, 2, 5),
  a(22, 'Windows', 'Window Fitter', 'Windows', 1, 14, 3, 6),
  a(23, '1st fix carpentry', 'Carpenter', '1st Carp', 3, 14, 4, 6),
  a(24, '1st fix Plumbing', 'Plumber', '1st plum', 2, 15, 2, 6),
  a(25, '1st fix electrics', 'Electrician', '1st elec', 2, 15, 4, 6),
  a(26, '1st fix sprinkler', 'Sprinkler', '1st sprinkler', 1, 16, 1, 6),
  a(27, 'QA pre plaster', 'Site Team', 'QA', 1, 16, 2, 6),
  a(28, 'Tac', 'Dry liner', 'Tac', 1, 16, 3, 6),
  a(29, 'dab', 'Dry liner', 'dab', 2, 16, 4, 6),
  a(30, 'tape and joint', 'Dry liner', 'tape', 3, 17, 1, 6),
  a(31, 'sand', 'Dry liner', 'sand', 4, 17, 4, 6),
  a(32, 'mist coat', 'Decorator', 'mist', 1, 18, 3, 6),
  a(33, '2nd fix carpentry', 'Carpenter', '2nd carp', 2, 18, 4, 7),
  a(34, '2nd fix plumbing', 'Plumber', '2nd plumb', 1, 19, 1, 7),
  a(35, '2nd fix electrician', 'Electrician', '2nd elec', 1, 19, 2, 7),
  a(36, 'Fit kitchen', 'Kitchen fitter', 'Kitchen', 2, 19, 3, 7),
  a(37, 'loft insulation', 'Loft insulator', 'Loft', 1, 19, 5, 7),
  a(38, 'patch', 'Dry liner', 'patch', 2, 20, 1, 8),
  a(39, 'Wall tile', 'Tiler', 'Tile', 1, 20, 3, 8),
  a(40, 'decorate', 'Decorator', 'dec', 5, 20, 4, 8),
  a(41, 'Carpentry Finals', 'Carpenter', 'Finals carp', 1, 21, 4, 9),
  a(42, 'Plumbing finals', 'Plumber', 'Finals Plumb', 1, 21, 5, 9),
  a(43, 'Electrical Finals', 'Electrician', 'Finals elec', 1, 22, 1, 9),
  a(44, 'Sprinkler commsision', 'Sprinkler', 'Sprinkler Com', 1, 22, 2, 9),
  a(45, 'build clean', 'Cleaner', 'Build clean', 1, 22, 3, 9),
  a(46, taskCode('mas', 'tic'), taskCode('Mastic ', 'applicator'), taskCode('Mas', 'tic'), 1, 22, 4, 9),
  a(47, 'Fit appliances', 'Appliance fitter', 'Appliances', 1, 22, 5, 9),
  a(48, 'Snag patch', 'Dry liner', 'Snag patch', 2, 23, 1, 9),
  a(49, 'Decoration finals', 'Decorator', 'Dec Finals', 1, 23, 3, 9),
  a(50, 'Flooring', 'Floor layer', 'carpets/vinyl', 3, 23, 4, 9),
  a(51, 'Doors over carpets', 'Carpenter', 'DOC', 1, 24, 2, 9),
  a(52, 'Touch ups after carpets', 'Decorator', 'After carpets', 1, 24, 3, 9),
  a(53, 'Reclean', 'Cleaner', 'Reclean', 1, 24, 4, 9),
  a(54, 'QA Pre handover', 'Site Team', 'QA', 1, 24, 5, 9),
  a(55, 'Home tour', 'Site Team', 'Home tour', 1, 25, 1, 9),
];