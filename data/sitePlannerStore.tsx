import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { ActivityDelay, DEFAULT_SITE_PLOTS, SitePlot } from '../utils/siteProgrammeEngine';

const SITE_PLOTS_KEY = 'siteprog:week-based-plots:v1';
const SITE_DELAYS_KEY = 'siteprog:week-based-delays:v1';

type SitePlannerStore = {
  sitePlots: SitePlot[];
  activityDelays: ActivityDelay[];
  isSitePlannerLoaded: boolean;
  upsertSitePlot: (input: { plotNo: string; stage9CompleteWeek: number }) => Promise<void>;
  removeSitePlot: (plotId: string) => Promise<void>;
  setActivityDelay: (input: ActivityDelay) => Promise<void>;
};

const SitePlannerContext = createContext<SitePlannerStore | undefined>(undefined);

async function readArray<T>(key: string, fallback: T[]) {
  const stored = await AsyncStorage.getItem(key);
  if (!stored) {
    await AsyncStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
  }
  return JSON.parse(stored) as T[];
}

export function SitePlannerProvider({ children }: PropsWithChildren) {
  const [sitePlots, setSitePlots] = useState<SitePlot[]>(DEFAULT_SITE_PLOTS);
  const [activityDelays, setActivityDelays] = useState<ActivityDelay[]>([]);
  const [isSitePlannerLoaded, setIsSitePlannerLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadPlanner() {
      try {
        const [storedPlots, storedDelays] = await Promise.all([
          readArray<SitePlot>(SITE_PLOTS_KEY, DEFAULT_SITE_PLOTS),
          readArray<ActivityDelay>(SITE_DELAYS_KEY, []),
        ]);
        if (mounted) {
          setSitePlots(storedPlots);
          setActivityDelays(storedDelays);
        }
      } catch (error) {
        console.warn('Unable to load site planner data', error);
      } finally {
        if (mounted) setIsSitePlannerLoaded(true);
      }
    }
    loadPlanner();
    return () => {
      mounted = false;
    };
  }, []);

  const upsertSitePlot = async (input: { plotNo: string; stage9CompleteWeek: number }) => {
    const plotNo = input.plotNo.trim();
    if (!plotNo || !Number.isFinite(input.stage9CompleteWeek)) return;

    const existing = sitePlots.find((plot) => plot.plotNo.toLowerCase() === plotNo.toLowerCase());
    const nextPlot: SitePlot = existing
      ? { ...existing, plotNo, stage9CompleteWeek: input.stage9CompleteWeek }
      : { id: `site-plot-${Date.now()}`, plotNo, stage9CompleteWeek: input.stage9CompleteWeek };
    const nextPlots = existing
      ? sitePlots.map((plot) => (plot.id === existing.id ? nextPlot : plot))
      : [...sitePlots, nextPlot];

    setSitePlots(nextPlots);
    await AsyncStorage.setItem(SITE_PLOTS_KEY, JSON.stringify(nextPlots));
  };

  const removeSitePlot = async (plotId: string) => {
    const nextPlots = sitePlots.filter((plot) => plot.id !== plotId);
    const nextDelays = activityDelays.filter((delay) => delay.plotId !== plotId);
    setSitePlots(nextPlots);
    setActivityDelays(nextDelays);
    await Promise.all([
      AsyncStorage.setItem(SITE_PLOTS_KEY, JSON.stringify(nextPlots)),
      AsyncStorage.setItem(SITE_DELAYS_KEY, JSON.stringify(nextDelays)),
    ]);
  };

  const setActivityDelay = async (input: ActivityDelay) => {
    const nextDelays = [
      ...activityDelays.filter((delay) => !(delay.plotId === input.plotId && delay.activityCode === input.activityCode)),
      input,
    ].filter((delay) => delay.delayDays !== 0);
    setActivityDelays(nextDelays);
    await AsyncStorage.setItem(SITE_DELAYS_KEY, JSON.stringify(nextDelays));
  };

  const value = useMemo(
    () => ({
      sitePlots,
      activityDelays,
      isSitePlannerLoaded,
      upsertSitePlot,
      removeSitePlot,
      setActivityDelay,
    }),
    [sitePlots, activityDelays, isSitePlannerLoaded],
  );

  return <SitePlannerContext.Provider value={value}>{children}</SitePlannerContext.Provider>;
}

export function useSitePlanner() {
  const context = useContext(SitePlannerContext);
  if (!context) throw new Error('useSitePlanner must be used within SitePlannerProvider');
  return context;
}
