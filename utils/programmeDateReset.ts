import AsyncStorage from '@react-native-async-storage/async-storage';

const SITE_PLOTS_KEY = 'programme-buddy:plots:v1';
const RESET_MARKER_KEY = 'programme-buddy:existing-programme-dates-cleared:2026-10-01';

// A deliberately unreachable programme week used to keep the plot row and
// metadata while treating its master programme as not yet scheduled.
export const UNSCHEDULED_PROGRAMME_WEEK = 10000;

export async function clearExistingProgrammeDatesOnce() {
  const alreadyCleared = await AsyncStorage.getItem(RESET_MARKER_KEY);
  if (alreadyCleared) return false;

  const stored = await AsyncStorage.getItem(SITE_PLOTS_KEY);
  if (stored) {
    const plots = JSON.parse(stored) as Array<Record<string, unknown>>;
    const resetPlots = plots.map((plot) => ({
      ...plot,
      stage9CompleteWeek: UNSCHEDULED_PROGRAMME_WEEK,
    }));
    await AsyncStorage.setItem(SITE_PLOTS_KEY, JSON.stringify(resetPlots));
  }

  await AsyncStorage.setItem(RESET_MARKER_KEY, new Date().toISOString());
  return true;
}
