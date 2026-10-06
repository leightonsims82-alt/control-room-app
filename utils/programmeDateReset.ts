import AsyncStorage from '@react-native-async-storage/async-storage';

const RESET_MARKER_KEY = 'programme-buddy:existing-plots-cleared:2026-10-01-v1';

/**
 * Historical marker retained for compatibility only.
 * Programme Buddy must never erase live plot/programme/QA data automatically at startup.
 */
export async function clearExistingPlotDataOnce() {
  const alreadyCleared = await AsyncStorage.getItem(RESET_MARKER_KEY);
  if (!alreadyCleared) await AsyncStorage.setItem(RESET_MARKER_KEY, new Date().toISOString());
  return false;
}

/** True when a programme week is intentionally unscheduled/invalid. */
export function isUnscheduledProgrammeWeek(week: number) {
  return !Number.isFinite(week) || week < 1;
}
