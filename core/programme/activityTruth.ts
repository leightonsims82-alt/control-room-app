export type CanonicalStageNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type CanonicalActivity = {
  code: string;
  trade: string;
  displayText: string;
  stage: CanonicalStageNumber;
  defaultDurationDays: number;
  threeStoreyOnly?: boolean;
};

/**
 * Programme V2 activity truth.
 *
 * This is the single activity -> trade -> stage relationship used by every
 * house type and every programme output. House types may override duration,
 * ordering and overlap behaviour, but they must not redefine stage ownership.
 *
 * The values below are transcribed from the agreed Site Setup table.
 */
export const CANONICAL_ACTIVITY_LIBRARY: CanonicalActivity[] = [
  { code: 'Foundations', trade: 'Groundworker', displayText: 'Foundations', stage: 1, defaultDurationDays: 5 },
  { code: 'Substructure', trade: 'Groundworker', displayText: 'Substructure', stage: 1, defaultDurationDays: 5 },
  { code: 'Drainage', trade: 'Groundworker', displayText: 'Drainage', stage: 1, defaultDurationDays: 5 },
  { code: 'QA Drainage', trade: 'Site Team', displayText: 'QA Drainage', stage: 1, defaultDurationDays: 1 },
  { code: 'NHBC Drainage', trade: 'Site Team', displayText: 'NHBC Drainage', stage: 1, defaultDurationDays: 1 },

  { code: 'Band Course', trade: 'Groundworker', displayText: 'Band Course', stage: 2, defaultDurationDays: 2 },
  { code: 'Slab Pour', trade: 'Groundworker', displayText: 'Slab Pour', stage: 2, defaultDurationDays: 5 },
  { code: 'QA Slab', trade: 'Site Team', displayText: 'QA Slab', stage: 2, defaultDurationDays: 2 },

  { code: '1st lift Brickwork', trade: 'Bricklayer', displayText: '1st Lift', stage: 3, defaultDurationDays: 7 },
  { code: 'Base Lift Scaffold', trade: 'Scaffolder', displayText: 'Base Lift', stage: 3, defaultDurationDays: 2 },
  { code: '2nd Lift Brickwork', trade: 'Bricklayer', displayText: '2nd Lift', stage: 3, defaultDurationDays: 3 },
  { code: '2nd Lift Scaffold', trade: 'Scaffolder', displayText: '2nd Lift Scaffold', stage: 3, defaultDurationDays: 2 },
  { code: 'Joist & Flooring', trade: 'Carpenter', displayText: 'Joist & Flooring', stage: 3, defaultDurationDays: 2 },
  { code: '3rd Lift Brickwork', trade: 'Bricklayer', displayText: '3rd Lift', stage: 3, defaultDurationDays: 7 },
  { code: '3rd & Bird Scaffold', trade: 'Scaffolder', displayText: '3rd & Bird', stage: 3, defaultDurationDays: 2 },
  { code: '4th lift Brickwork', trade: 'Bricklayer', displayText: '4th Bwk', stage: 3, defaultDurationDays: 1 },
  { code: '2nd Floor Joist', trade: 'Carpenter', displayText: '2nd Joist', stage: 3, defaultDurationDays: 1, threeStoreyOnly: true },
  { code: 'Wall Plate', trade: 'Carpenter', displayText: 'Wall Plate', stage: 3, defaultDurationDays: 2 },

  { code: 'Truss', trade: 'Carpenter', displayText: 'Truss', stage: 4, defaultDurationDays: 2 },
  { code: 'Gables', trade: 'Bricklayer', displayText: 'Gables', stage: 4, defaultDurationDays: 4 },
  { code: 'QA SS', trade: 'Site Team', displayText: 'QA SS', stage: 4, defaultDurationDays: 2 },
  { code: 'NHBC SS', trade: 'Site Team', displayText: 'NHBC SS', stage: 4, defaultDurationDays: 1 },
  { code: 'Felt and Batten', trade: 'Roofer', displayText: 'Felt & Batten', stage: 4, defaultDurationDays: 1 },
  { code: 'Solar PV', trade: 'Solar Installer', displayText: 'Solar PV', stage: 4, defaultDurationDays: 1 },
  { code: 'Roof tile', trade: 'Roofer', displayText: 'Roof Tile', stage: 4, defaultDurationDays: 2 },

  { code: 'Strip Scaffold', trade: 'Scaffolder', displayText: 'Strip Scaffold', stage: 5, defaultDurationDays: 1 },

  { code: '1st Fix Carp', trade: 'Carpenter', displayText: '1st Fix Carp', stage: 6, defaultDurationDays: 3 },
  { code: 'Windows', trade: 'Window Fitter', displayText: 'Windows', stage: 6, defaultDurationDays: 1 },
  { code: '1st fix plumbing', trade: 'Plumber', displayText: '1st Fix Plumbing', stage: 6, defaultDurationDays: 2 },
  { code: '1st fix electrics', trade: 'Electrician', displayText: '1st Fix Electrics', stage: 6, defaultDurationDays: 2 },
  { code: 'Cavity Blown Insulation', trade: 'Insulation Installer', displayText: 'Cavity Insulation', stage: 6, defaultDurationDays: 1 },
  { code: 'QA PP', trade: 'Site Team', displayText: 'QA PP', stage: 6, defaultDurationDays: 2 },
  { code: 'NHBC PP', trade: 'Site Team', displayText: 'NHBC PP', stage: 6, defaultDurationDays: 1 },
  { code: 'Plasterboard Tacking', trade: 'Dry liner', displayText: 'Tacking', stage: 6, defaultDurationDays: 2 },
  { code: 'Plasterboard Dabbing', trade: 'Dry liner', displayText: 'Dabbing', stage: 6, defaultDurationDays: 2 },
  { code: 'Plasterboard Taping', trade: 'Dry liner', displayText: 'Taping', stage: 6, defaultDurationDays: 4 },
  { code: 'Groundwork Externals', trade: 'Groundworker', displayText: 'GW Externals', stage: 6, defaultDurationDays: 3 },
  { code: 'Drying', trade: 'Site Team', displayText: 'Drying', stage: 6, defaultDurationDays: 3 },
  { code: 'Plasterboard Sand', trade: 'Dry liner', displayText: 'Sand', stage: 6, defaultDurationDays: 1 },
  { code: 'Mist Coat', trade: 'Decorator', displayText: 'Mist Coat', stage: 6, defaultDurationDays: 1 },
  { code: 'Loft insulation', trade: 'Loft Insulator', displayText: 'Loft Insulation', stage: 6, defaultDurationDays: 1 },

  { code: '2nd fix carpentry', trade: 'Carpenter', displayText: '2nd Fix Carp', stage: 7, defaultDurationDays: 3 },
  { code: '2nd fix plumbing', trade: 'Plumber', displayText: '2nd Fix Plumbing', stage: 7, defaultDurationDays: 2 },
  { code: '2nd fix electrics', trade: 'Electrician', displayText: '2nd Fix Electrics', stage: 7, defaultDurationDays: 2 },
  { code: 'Kitchen Installation', trade: 'Kitchen fitter', displayText: 'Kitchen', stage: 7, defaultDurationDays: 1 },

  { code: 'Patch', trade: 'Dry liner', displayText: 'Patch', stage: 8, defaultDurationDays: 2 },
  { code: 'Pre Paint Clean', trade: 'Cleaner', displayText: 'Pre Paint Clean', stage: 8, defaultDurationDays: 1 },
  { code: 'Decoration', trade: 'Decorator', displayText: 'Decoration', stage: 8, defaultDurationDays: 7 },
  { code: 'Wall Tile', trade: 'Tiler', displayText: 'Wall Tile', stage: 8, defaultDurationDays: 1 },

  { code: 'Plumbing Finals', trade: 'Plumber', displayText: 'Plumbing Finals', stage: 9, defaultDurationDays: 2 },
  { code: 'Carpentry finals', trade: 'Carpenter', displayText: 'Carpentry Finals', stage: 9, defaultDurationDays: 1 },
  { code: 'Electrical finals inc PV', trade: 'Electrician', displayText: 'Electrical Finals', stage: 9, defaultDurationDays: 1 },
  { code: 'Appliances', trade: 'Appliance fitter', displayText: 'Appliances', stage: 9, defaultDurationDays: 1 },
  { code: 'Snag Patch', trade: 'Dry liner', displayText: 'Snag Patch', stage: 9, defaultDurationDays: 2 },
  { code: 'Dec Finals', trade: 'Decorator', displayText: 'Dec Finals', stage: 9, defaultDurationDays: 1 },
  { code: 'Build Clean', trade: 'Cleaner', displayText: 'Build Clean', stage: 9, defaultDurationDays: 1 },
  { code: 'Mastic', trade: 'Mastic applicator', displayText: 'Mastic', stage: 9, defaultDurationDays: 1 },
];

function key(value: string | undefined) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

const aliases: Record<string, string> = {
  'foundation': 'Foundations',
  'slab': 'Slab Pour',
  'joist and flooring': 'Joist & Flooring',
  'joist & floor': 'Joist & Flooring',
  '3rd and bird scaffold': '3rd & Bird Scaffold',
  '4th lift brickwork': '4th lift Brickwork',
  'first fix carpentry': '1st Fix Carp',
  '1st fix carpentry': '1st Fix Carp',
  'first fix plumbing': '1st fix plumbing',
  'first fix electrics': '1st fix electrics',
  'second fix carpentry': '2nd fix carpentry',
  'second fix plumbing': '2nd fix plumbing',
  'second fix electrics': '2nd fix electrics',
  'fit kitchen': 'Kitchen Installation',
  'kitchen': 'Kitchen Installation',
  'decorate': 'Decoration',
  'wall tile': 'Wall Tile',
  'electrical finals': 'Electrical finals inc PV',
  'decoration finals': 'Dec Finals',
  'build clean': 'Build Clean',
  'sealant': 'Mastic',
};

const byKey = new Map<string, CanonicalActivity>();
for (const activity of CANONICAL_ACTIVITY_LIBRARY) {
  byKey.set(key(activity.code), activity);
  byKey.set(key(activity.displayText), activity);
}
for (const [alias, canonicalCode] of Object.entries(aliases)) {
  const canonical = CANONICAL_ACTIVITY_LIBRARY.find((item) => item.code === canonicalCode);
  if (canonical) byKey.set(key(alias), canonical);
}

export function getCanonicalActivity(value: string | undefined) {
  return byKey.get(key(value));
}

export function getCanonicalStage(value: string | undefined, fallback?: number): CanonicalStageNumber | undefined {
  return getCanonicalActivity(value)?.stage ?? (
    fallback && fallback >= 1 && fallback <= 9 ? fallback as CanonicalStageNumber : undefined
  );
}

export function canonicaliseActivity<T extends {
  code: string;
  trade?: string;
  displayText?: string;
  stage?: number;
  durationDays?: number;
}>(activity: T): T & { stage: CanonicalStageNumber } {
  const canonical = getCanonicalActivity(activity.code) ?? getCanonicalActivity(activity.displayText);
  const stage = canonical?.stage ?? getCanonicalStage(activity.code, activity.stage) ?? 1;
  return {
    ...activity,
    trade: canonical?.trade ?? activity.trade,
    displayText: canonical?.displayText ?? activity.displayText,
    stage,
  } as T & { stage: CanonicalStageNumber };
}

export function assertCanonicalStageTruth(activities: Array<{ code: string; displayText?: string; stage: number }>) {
  const failures = activities.flatMap((activity) => {
    const canonical = getCanonicalActivity(activity.code) ?? getCanonicalActivity(activity.displayText);
    if (!canonical || canonical.stage === activity.stage) return [];
    return [{ code: activity.code, expected: canonical.stage, actual: activity.stage }];
  });
  return failures;
}
