import {
  CANONICAL_ACTIVITY_LIBRARY,
  canonicaliseActivity,
  getCanonicalActivity,
} from './activityTruth';
import type { V2Activity, V2Template } from './scheduleEngine';

export type V2HouseType = V2Template & {
  name: string;
  houseTypeCode?: string;
  bedrooms?: number;
  floors?: number;
  description?: string;
  isHouseType?: boolean;
  isSystemTemplate?: boolean;
  standardVersion?: number;
  constructionMethod?: string;
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function nextOrder(activities: V2Activity[]) {
  return activities.length ? Math.max(...activities.map((activity) => activity.order)) + 1 : 1;
}

function canonicalBaseActivities() {
  return CANONICAL_ACTIVITY_LIBRARY
    .filter((activity) => !activity.threeStoreyOnly)
    .map((activity, index): V2Activity => ({
      order: index + 1,
      code: activity.code,
      trade: activity.trade,
      displayText: activity.displayText,
      durationDays: activity.defaultDurationDays,
      stage: activity.stage,
      overlapAllowed: false,
      overlapStartFrom: 'start',
      overlapLagDays: 0,
    }));
}

/**
 * New house types start from the agreed activity library. Existing house types
 * keep their own sequence/durations, but stage/trade truth is reapplied.
 */
export function createV2HouseType(input: {
  id: string;
  name: string;
  bedrooms: number;
  floors: number;
  programmeWeeks?: number;
}): V2HouseType {
  const base: V2HouseType = {
    id: input.id,
    name: input.name.trim(),
    houseTypeCode: input.name.trim(),
    bedrooms: Math.max(1, Math.round(input.bedrooms || 3)),
    floors: Math.max(1, Math.min(3, Math.round(input.floors || 2))),
    description: `${Math.max(1, Math.round(input.bedrooms || 3))} bedroom · ${Math.max(1, Math.min(3, Math.round(input.floors || 2)))} storey house type`,
    programmeWeeks: Math.max(1, Math.round(input.programmeWeeks || 25)),
    isHouseType: true,
    isSystemTemplate: false,
    standardVersion: 2,
    activities: canonicalBaseActivities(),
  };
  return applyV2FloorRules(base, base.floors ?? 2);
}

export function applyV2ActivityTruth<T extends V2HouseType>(template: T): T {
  if (template.constructionMethod === 'timberFrame' || template.id === 'timberFrame') return clone(template);
  const activities = template.activities.map((activity) => {
    const canonical = getCanonicalActivity(activity.code) ?? getCanonicalActivity(activity.displayText);
    if (!canonical) return canonicaliseActivity(activity);
    return {
      ...activity,
      code: canonical.code,
      trade: canonical.trade,
      displayText: canonical.displayText,
      stage: canonical.stage,
    };
  });
  return {
    ...clone(template),
    standardVersion: Math.max(2, template.standardVersion ?? 0),
    activities,
  };
}

function removeGeneratedThreeStoreyRows(activities: V2Activity[]) {
  const generatedCodes = new Set([
    '2nd Floor Joist',
    '2nd Floor Joists',
    '2nd floor joists and flooring',
    '5th lift Brickwork',
    '5th Lift Brickwork',
    '5th lift scaffold',
    '5th Lift Scaffold',
  ].map((value) => value.toLowerCase()));
  return activities.filter((activity) => !generatedCodes.has(activity.code.toLowerCase()));
}

function reindex(activities: V2Activity[]) {
  return activities.map((activity, index) => ({ ...activity, order: index + 1 }));
}

export function applyV2FloorRules<T extends V2HouseType>(template: T, floors: number): T {
  const floorCount = Math.max(1, Math.min(3, Math.round(floors || 2)));
  let activities = removeGeneratedThreeStoreyRows(template.activities)
    .map((activity) => ({ ...activity }));

  if (floorCount === 3) {
    const wallPlateIndex = activities.findIndex((activity) => activity.code.toLowerCase() === 'wall plate');
    const insertAt = wallPlateIndex >= 0 ? wallPlateIndex : activities.length;

    const joistTruth = CANONICAL_ACTIVITY_LIBRARY.find((activity) => activity.code === '2nd Floor Joist')!;
    const extraRows: V2Activity[] = [
      {
        order: nextOrder(activities),
        code: joistTruth.code,
        trade: joistTruth.trade,
        displayText: joistTruth.displayText,
        durationDays: joistTruth.defaultDurationDays,
        stage: joistTruth.stage,
        overlapAllowed: false,
      },
      {
        order: nextOrder(activities) + 1,
        code: '5th lift Brickwork',
        trade: 'Bricklayer',
        displayText: '5th Lift',
        durationDays: 7,
        stage: 3,
        overlapAllowed: false,
      },
      {
        order: nextOrder(activities) + 2,
        code: '5th Lift Scaffold',
        trade: 'Scaffolder',
        displayText: '5th Lift Scaffold',
        durationDays: 2,
        stage: 3,
        overlapAllowed: false,
      },
    ];
    activities.splice(insertAt, 0, ...extraRows);

    const roofTileIndex = activities.findIndex((activity) => activity.code.toLowerCase() === 'roof tile');
    activities = activities.map((activity, index) => {
      if (index <= roofTileIndex) return activity;
      const addDay = /\b(?:1st|2nd)\s+fix\b/i.test(activity.code) &&
        ['Carpenter', 'Plumber', 'Electrician'].includes(activity.trade);
      return addDay ? { ...activity, durationDays: activity.durationDays + 1 } : activity;
    });
  }

  return applyV2ActivityTruth({
    ...clone(template),
    floors: floorCount,
    activities: reindex(activities),
  }) as T;
}

export function normaliseV2HouseType<T extends V2HouseType>(template: T): T {
  const truth = applyV2ActivityTruth(template);
  return applyV2FloorRules(truth, truth.floors ?? 2);
}

export function validateV2HouseType(template: V2HouseType) {
  const errors: string[] = [];
  if (!template.name?.trim()) errors.push('House type name is required.');
  if (!template.activities.length) errors.push('House type must contain programme activities.');

  const names = template.activities.map((activity) => activity.code.trim().toLowerCase());
  if (names.some((name) => !name)) errors.push('Every activity must have a name.');
  if (new Set(names).size !== names.length) errors.push('Activity names must be unique.');

  for (const activity of template.activities) {
    const canonical = getCanonicalActivity(activity.code) ?? getCanonicalActivity(activity.displayText);
    if (canonical && canonical.stage !== activity.stage) {
      errors.push(`${activity.code} must be Stage ${canonical.stage}, not Stage ${activity.stage}.`);
    }
  }
  return errors;
}
