import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { ActivityDelay, DEFAULT_SITE_PLOTS, SitePlot, TRADE_ORDER } from '../utils/siteProgrammeEngine';

const SITE_PLOTS_KEY = 'siteprog:week-based-plots:v1';
const SITE_DELAYS_KEY = 'siteprog:week-based-delays:v1';
const TRADE_CONTACTS_KEY = 'siteprog:trade-contacts:v1';
const ISSUE_SETTINGS_KEY = 'siteprog:issue-settings:v1';
const ISSUE_LOGS_KEY = 'siteprog:issue-logs:v1';

export type TradeContact = {
  id: string;
  trade: string;
  contractor: string;
  supervisorName: string;
  supervisorEmail: string;
  supervisorPhone: string;
};

export type IssueSettings = {
  managerEmail: string;
  issueDay: string;
  issueTime: string;
  autoIssueEnabled: boolean;
};

export type IssueLog = {
  id: string;
  startWeek: number;
  issuedAt: string;
  recipientCount: number;
  note: string;
};

const DEFAULT_TRADE_CONTACTS: TradeContact[] = TRADE_ORDER.map((trade) => ({
  id: `trade-${trade.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
  trade,
  contractor: '',
  supervisorName: '',
  supervisorEmail: '',
  supervisorPhone: '',
}));

const DEFAULT_ISSUE_SETTINGS: IssueSettings = {
  managerEmail: '',
  issueDay: 'Friday',
  issueTime: '15:00',
  autoIssueEnabled: false,
};

type SitePlannerStore = {
  sitePlots: SitePlot[];
  activityDelays: ActivityDelay[];
  tradeContacts: TradeContact[];
  issueSettings: IssueSettings;
  issueLogs: IssueLog[];
  isSitePlannerLoaded: boolean;
  upsertSitePlot: (input: { plotNo: string; stage9CompleteWeek: number }) => Promise<void>;
  removeSitePlot: (plotId: string) => Promise<void>;
  setActivityDelay: (input: ActivityDelay) => Promise<void>;
  upsertTradeContact: (input: TradeContact) => Promise<void>;
  setIssueSettings: (input: IssueSettings) => Promise<void>;
  recordIssue: (input: { startWeek: number; recipientCount: number; note: string }) => Promise<void>;
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

async function readObject<T>(key: string, fallback: T) {
  const stored = await AsyncStorage.getItem(key);
  if (!stored) {
    await AsyncStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
  }
  return JSON.parse(stored) as T;
}

function mergeDefaultTradeContacts(stored: TradeContact[]) {
  const storedByTrade = new Map(stored.map((contact) => [contact.trade, contact]));
  return DEFAULT_TRADE_CONTACTS.map((contact) => storedByTrade.get(contact.trade) ?? contact);
}

export function SitePlannerProvider({ children }: PropsWithChildren) {
  const [sitePlots, setSitePlots] = useState<SitePlot[]>(DEFAULT_SITE_PLOTS);
  const [activityDelays, setActivityDelays] = useState<ActivityDelay[]>([]);
  const [tradeContacts, setTradeContacts] = useState<TradeContact[]>(DEFAULT_TRADE_CONTACTS);
  const [issueSettingsState, setIssueSettingsState] = useState<IssueSettings>(DEFAULT_ISSUE_SETTINGS);
  const [issueLogs, setIssueLogs] = useState<IssueLog[]>([]);
  const [isSitePlannerLoaded, setIsSitePlannerLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadPlanner() {
      try {
        const [storedPlots, storedDelays, storedContacts, storedIssueSettings, storedIssueLogs] = await Promise.all([
          readArray<SitePlot>(SITE_PLOTS_KEY, DEFAULT_SITE_PLOTS),
          readArray<ActivityDelay>(SITE_DELAYS_KEY, []),
          readArray<TradeContact>(TRADE_CONTACTS_KEY, DEFAULT_TRADE_CONTACTS),
          readObject<IssueSettings>(ISSUE_SETTINGS_KEY, DEFAULT_ISSUE_SETTINGS),
          readArray<IssueLog>(ISSUE_LOGS_KEY, []),
        ]);
        if (mounted) {
          setSitePlots(storedPlots);
          setActivityDelays(storedDelays);
          setTradeContacts(mergeDefaultTradeContacts(storedContacts));
          setIssueSettingsState(storedIssueSettings);
          setIssueLogs(storedIssueLogs);
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

  const upsertTradeContact = async (input: TradeContact) => {
    const nextContacts = tradeContacts.map((contact) => (contact.id === input.id ? input : contact));
    setTradeContacts(nextContacts);
    await AsyncStorage.setItem(TRADE_CONTACTS_KEY, JSON.stringify(nextContacts));
  };

  const setIssueSettings = async (input: IssueSettings) => {
    setIssueSettingsState(input);
    await AsyncStorage.setItem(ISSUE_SETTINGS_KEY, JSON.stringify(input));
  };

  const recordIssue = async (input: { startWeek: number; recipientCount: number; note: string }) => {
    const nextLog: IssueLog = {
      id: `issue-${Date.now()}`,
      startWeek: input.startWeek,
      recipientCount: input.recipientCount,
      note: input.note,
      issuedAt: new Date().toISOString(),
    };
    const nextLogs = [nextLog, ...issueLogs].slice(0, 25);
    setIssueLogs(nextLogs);
    await AsyncStorage.setItem(ISSUE_LOGS_KEY, JSON.stringify(nextLogs));
  };

  const value = useMemo(
    () => ({
      sitePlots,
      activityDelays,
      tradeContacts,
      issueSettings: issueSettingsState,
      issueLogs,
      isSitePlannerLoaded,
      upsertSitePlot,
      removeSitePlot,
      setActivityDelay,
      upsertTradeContact,
      setIssueSettings,
      recordIssue,
    }),
    [sitePlots, activityDelays, tradeContacts, issueSettingsState, issueLogs, isSitePlannerLoaded],
  );

  return <SitePlannerContext.Provider value={value}>{children}</SitePlannerContext.Provider>;
}

export function useSitePlanner() {
  const context = useContext(SitePlannerContext);
  if (!context) throw new Error('useSitePlanner must be used within SitePlannerProvider');
  return context;
}
