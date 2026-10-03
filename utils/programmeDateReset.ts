import AsyncStorage from '@react-native-async-storage/async-storage';

const RESET_MARKER_KEY = 'programme-buddy:existing-plots-cleared:2026-10-01-v1';

const EMPTY_ARRAY_KEYS = [
  'programme-buddy:plots:v1',
  'programme-buddy:delays:v1',
  'programme-buddy:activity-moves:v1',
  'programme-buddy:issue-logs:v1',
  'programme-buddy:programme-notes:v1',
  'programme-buddy:plot-inspection-story:v1',
  'siteprog:plot-programmes:v1',
  'siteprog:plot-stages:v1',
  'siteprog:inspections:v1',
  'siteprog:defects:v1',
  'siteprog:dabs-briefings:v1',
  'siteprog:8am-walk:v1',
  'siteprog:8am-walk-notes:v1',
  'siteprog:handover-readiness:v1',
];

const EMPTY_OBJECT_KEYS = [
  'programme-buddy:inspection-results:v1',
];

/**
 * One-time reset used to remove the old/demo plots before live programme testing.
 * It deliberately keeps site setup, plot templates, trade contacts, issue settings
 * and stage configuration so the user can immediately enter their own plots.
 */
export async function clearExistingPlotDataOnce() {
  const alreadyCleared = await AsyncStorage.getItem(RESET_MARKER_KEY);
  if (alreadyCleared) return false;

  await AsyncStorage.multiSet([
    ...EMPTY_ARRAY_KEYS.map((key) => [key, JSON.stringify([])] as [string, string]),
    ...EMPTY_OBJECT_KEYS.map((key) => [key, JSON.stringify({})] as [string, string]),
  ]);

  await AsyncStorage.setItem(RESET_MARKER_KEY, new Date().toISOString());
  return true;
}

/** True when a programme week is intentionally unscheduled/invalid. */
export function isUnscheduledProgrammeWeek(week: number) {
  return !Number.isFinite(week) || week < 1;
}
