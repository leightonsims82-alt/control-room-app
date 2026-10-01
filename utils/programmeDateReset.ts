import AsyncStorage from '@react-native-async-storage/async-storage';

const SITE_PLOTS_KEY = 'programme-buddy:plots:v1';
const PLOT_PROGRAMMES_KEY = 'siteprog:plot-programmes:v1';
const PLOT_STAGES_KEY = 'siteprog:plot-stages:v1';
const RESET_MARKER_KEY = 'programme-buddy:existing-programme-dates-cleared:2026-10-01';

// A deliberately unreachable programme week used to retain plot/setup data
// while treating the plot as not yet scheduled. Entering a new start or
// completion date for that plot replaces this value with a real programme week.
export const UNSCHEDULED_PROGRAMME_WEEK = 10000;

export function isUnscheduledProgrammeWeek(week: unknown) {
  return Number(week) >= UNSCHEDULED_PROGRAMME_WEEK;
}

export async function clearExistingProgrammeDatesOnce() {
  const alreadyCleared = await AsyncStorage.getItem(RESET_MARKER_KEY);
  if (alreadyCleared) return false;

  const [storedSitePlots, storedProgrammes, storedStages] = await Promise.all([
    AsyncStorage.getItem(SITE_PLOTS_KEY),
    AsyncStorage.getItem(PLOT_PROGRAMMES_KEY),
    AsyncStorage.getItem(PLOT_STAGES_KEY),
  ]);

  const writes: Promise<void>[] = [];

  if (storedSitePlots) {
    const plots = JSON.parse(storedSitePlots) as Array<Record<string, unknown>>;
    const resetPlots = plots.map((plot) => ({
      ...plot,
      stage9CompleteWeek: UNSCHEDULED_PROGRAMME_WEEK,
    }));
    writes.push(AsyncStorage.setItem(SITE_PLOTS_KEY, JSON.stringify(resetPlots)));
  }

  if (storedProgrammes) {
    const programmes = JSON.parse(storedProgrammes) as Array<Record<string, unknown>>;
    const resetProgrammes = programmes.map((plot) => ({
      ...plot,
      startDate: '',
      endDate: '',
    }));
    writes.push(AsyncStorage.setItem(PLOT_PROGRAMMES_KEY, JSON.stringify(resetProgrammes)));
  }

  if (storedStages) {
    const stages = JSON.parse(storedStages) as Array<Record<string, unknown>>;
    const resetStages = stages.map((stage) => ({
      ...stage,
      startDate: '',
      endDate: '',
    }));
    writes.push(AsyncStorage.setItem(PLOT_STAGES_KEY, JSON.stringify(resetStages)));
  }

  await Promise.all(writes);
  await AsyncStorage.setItem(RESET_MARKER_KEY, new Date().toISOString());
  return true;
}
