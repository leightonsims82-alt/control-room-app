import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { ActivityDelay, TRADE_ORDER } from '../utils/siteProgrammeEngine';
import { DEFAULT_PLOT_TEMPLATES, DEFAULT_SITE_PROGRAMME_SETUP, DEFAULT_TEMPLATE_PLOTS, PlotTemplate, SiteProgrammeSetup, TemplateSitePlot } from '../utils/templateProgramme';

const SITE_PLOTS_KEY = 'siteprog:week-based-plots:v3';
const SITE_DELAYS_KEY = 'siteprog:week-based-delays:v2';
const TRADE_CONTACTS_KEY = 'siteprog:trade-contacts:v1';
const ISSUE_SETTINGS_KEY = 'siteprog:issue-settings:v1';
const ISSUE_LOGS_KEY = 'siteprog:issue-logs:v1';
const PLOT_TEMPLATES_KEY = 'siteprog:plot-templates:v8';
const SITE_PROGRAMME_SETUP_KEY = 'siteprog:programme-setup:v1';

export type TradeContact = { id: string; trade: string; contractor: string; supervisorName: string; supervisorEmail: string; supervisorPhone: string };
export type IssueSettings = { managerEmail: string; issueDay: string; issueTime: string; autoIssueEnabled: boolean };
export type IssueLog = { id: string; startWeek: number; issuedAt: string; recipientCount: number; note: string };

type SitePlannerStore = {
  sitePlots: TemplateSitePlot[];
  activityDelays: ActivityDelay[];
  tradeContacts: TradeContact[];
  issueSettings: IssueSettings;
  issueLogs: IssueLog[];
  plotTemplates: PlotTemplate[];
  siteSetup: SiteProgrammeSetup;
  isSitePlannerLoaded: boolean;
  upsertSitePlot: (input: { plotNo: string; stage9CompleteWeek: number; templateId: string }) => Promise<void>;
  removeSitePlot: (plotId: string) => Promise<void>;
  resetPlotData: () => Promise<void>;
  setActivityDelay: (input: ActivityDelay) => Promise<void>;
  upsertTradeContact: (input: TradeContact) => Promise<void>;
  setIssueSettings: (input: IssueSettings) => Promise<void>;
  recordIssue: (input: { startWeek: number; recipientCount: number; note: string }) => Promise<void>;
  updateSiteSetup: (input: Partial<SiteProgrammeSetup>) => Promise<void>;
  updatePlotTemplate: (input: PlotTemplate) => Promise<void>;
  updateTemplateActivityDuration: (templateId: string, activityCode: string, durationDays: number) => Promise<void>;
};

const DEFAULT_TRADE_CONTACTS: TradeContact[] = TRADE_ORDER.map((trade) => ({ id: `trade-${trade.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, trade, contractor: '', supervisorName: '', supervisorEmail: '', supervisorPhone: '' }));
const DEFAULT_ISSUE_SETTINGS: IssueSettings = { managerEmail: '', issueDay: 'Friday', issueTime: '15:00', autoIssueEnabled: false };
const SitePlannerContext = createContext<SitePlannerStore | undefined>(undefined);

async function readArray<T>(key: string, fallback: T[]) { const stored = await AsyncStorage.getItem(key); if (!stored) { await AsyncStorage.setItem(key, JSON.stringify(fallback)); return fallback; } return JSON.parse(stored) as T[]; }
async function readObject<T>(key: string, fallback: T) { const stored = await AsyncStorage.getItem(key); if (!stored) { await AsyncStorage.setItem(key, JSON.stringify(fallback)); return fallback; } return JSON.parse(stored) as T; }

function mergeDefaultTradeContacts(stored: TradeContact[]) {
  const storedByTrade = new Map(stored.map((contact) => [contact.trade.toLowerCase(), contact]));
  const defaults = DEFAULT_TRADE_CONTACTS.map((contact) => storedByTrade.get(contact.trade.toLowerCase()) ?? contact);
  const defaultTradeNames = new Set(DEFAULT_TRADE_CONTACTS.map((contact) => contact.trade.toLowerCase()));
  const customTrades = stored.filter((contact) => !defaultTradeNames.has(contact.trade.toLowerCase()));
  return [...defaults, ...customTrades];
}
function normalisePlots(stored: TemplateSitePlot[]) { return stored.map((plot) => ({ ...plot, templateId: plot.templateId || 'threeBed' })); }
function repairTemplate(defaultTemplate: PlotTemplate, storedTemplate?: PlotTemplate) {
  const storedByCode = new Map((storedTemplate?.activities ?? []).map((activity) => [activity.code, activity]));
  return {
    ...defaultTemplate,
    name: storedTemplate?.name ?? defaultTemplate.name,
    description: defaultTemplate.description,
    programmeWeeks: storedTemplate?.programmeWeeks ?? defaultTemplate.programmeWeeks,
    stageCount: defaultTemplate.stageCount,
    activities: defaultTemplate.activities.map((activity) => {
      const saved = storedByCode.get(activity.code);
      return { ...activity, overlapAllowed: saved?.overlapAllowed ?? activity.overlapAllowed ?? false, overlapLinkCode: saved?.overlapLinkCode ?? activity.overlapLinkCode, overlapStartFrom: saved?.overlapStartFrom ?? activity.overlapStartFrom ?? 'start', overlapLagDays: saved?.overlapLagDays ?? activity.overlapLagDays ?? 0 };
    }),
  };
}
function mergeDefaultTemplates(stored: PlotTemplate[]) {
  const storedById = new Map(stored.map((template) => [template.id, template]));
  return DEFAULT_PLOT_TEMPLATES.map((template) => repairTemplate(template, storedById.get(template.id)));
}

export function SitePlannerProvider({ children }: PropsWithChildren) {
  const [sitePlots, setSitePlots] = useState<TemplateSitePlot[]>(DEFAULT_TEMPLATE_PLOTS);
  const [activityDelays, setActivityDelays] = useState<ActivityDelay[]>([]);
  const [tradeContacts, setTradeContacts] = useState<TradeContact[]>(DEFAULT_TRADE_CONTACTS);
  const [issueSettingsState, setIssueSettingsState] = useState<IssueSettings>(DEFAULT_ISSUE_SETTINGS);
  const [issueLogs, setIssueLogs] = useState<IssueLog[]>([]);
  const [plotTemplates, setPlotTemplates] = useState<PlotTemplate[]>(DEFAULT_PLOT_TEMPLATES);
  const [siteSetup, setSiteSetupState] = useState<SiteProgrammeSetup>(DEFAULT_SITE_PROGRAMME_SETUP);
  const [isSitePlannerLoaded, setIsSitePlannerLoaded] = useState(false);
  useEffect(() => {
    let mounted = true;
    async function loadPlanner() {
      try {
        const [storedPlots, storedDelays, storedContacts, storedIssueSettings, storedIssueLogs, storedTemplates, storedSiteSetup] = await Promise.all([readArray<TemplateSitePlot>(SITE_PLOTS_KEY, DEFAULT_TEMPLATE_PLOTS), readArray<ActivityDelay>(SITE_DELAYS_KEY, []), readArray<TradeContact>(TRADE_CONTACTS_KEY, DEFAULT_TRADE_CONTACTS), readObject<IssueSettings>(ISSUE_SETTINGS_KEY, DEFAULT_ISSUE_SETTINGS), readArray<IssueLog>(ISSUE_LOGS_KEY, []), readArray<PlotTemplate>(PLOT_TEMPLATES_KEY, DEFAULT_PLOT_TEMPLATES), readObject<SiteProgrammeSetup>(SITE_PROGRAMME_SETUP_KEY, DEFAULT_SITE_PROGRAMME_SETUP)]);
        const repairedTemplates = mergeDefaultTemplates(storedTemplates);
        if (mounted) { setSitePlots(normalisePlots(storedPlots)); setActivityDelays(storedDelays); setTradeContacts(mergeDefaultTradeContacts(storedContacts)); setIssueSettingsState(storedIssueSettings); setIssueLogs(storedIssueLogs); setPlotTemplates(repairedTemplates); setSiteSetupState({ ...DEFAULT_SITE_PROGRAMME_SETUP, ...storedSiteSetup }); }
        await AsyncStorage.setItem(PLOT_TEMPLATES_KEY, JSON.stringify(repairedTemplates));
      } catch (error) { console.warn('Unable to load site planner data', error); } finally { if (mounted) setIsSitePlannerLoaded(true); }
    }
    loadPlanner(); return () => { mounted = false; };
  }, []);
  const upsertSitePlot = async (input: { plotNo: string; stage9CompleteWeek: number; templateId: string }) => { const plotNo = input.plotNo.trim(); if (!plotNo || !Number.isFinite(input.stage9CompleteWeek)) return; const existing = sitePlots.find((plot) => plot.plotNo.toLowerCase() === plotNo.toLowerCase()); const nextPlot: TemplateSitePlot = existing ? { ...existing, plotNo, stage9CompleteWeek: input.stage9CompleteWeek, templateId: input.templateId } : { id: `site-plot-${Date.now()}`, plotNo, stage9CompleteWeek: input.stage9CompleteWeek, templateId: input.templateId }; const nextPlots = existing ? sitePlots.map((plot) => (plot.id === existing.id ? nextPlot : plot)) : [...sitePlots, nextPlot]; setSitePlots(nextPlots); await AsyncStorage.setItem(SITE_PLOTS_KEY, JSON.stringify(nextPlots)); };
  const removeSitePlot = async (plotId: string) => { const nextPlots = sitePlots.filter((plot) => plot.id !== plotId); const nextDelays = activityDelays.filter((delay) => delay.plotId !== plotId); setSitePlots(nextPlots); setActivityDelays(nextDelays); await Promise.all([AsyncStorage.setItem(SITE_PLOTS_KEY, JSON.stringify(nextPlots)), AsyncStorage.setItem(SITE_DELAYS_KEY, JSON.stringify(nextDelays))]); };
  const resetPlotData = async () => { setSitePlots([]); setActivityDelays([]); await Promise.all([AsyncStorage.setItem(SITE_PLOTS_KEY, JSON.stringify([])), AsyncStorage.setItem(SITE_DELAYS_KEY, JSON.stringify([]))]); };
  const setActivityDelay = async (input: ActivityDelay) => { const nextDelays = [...activityDelays.filter((delay) => !(delay.plotId === input.plotId && delay.activityCode === input.activityCode)), input].filter((delay) => delay.delayDays !== 0); setActivityDelays(nextDelays); await AsyncStorage.setItem(SITE_DELAYS_KEY, JSON.stringify(nextDelays)); };
  const upsertTradeContact = async (input: TradeContact) => { const cleanTrade = input.trade.trim(); if (!cleanTrade) return; const cleanInput = { ...input, trade: cleanTrade }; const existing = tradeContacts.find((contact) => contact.id === input.id || contact.trade.toLowerCase() === cleanTrade.toLowerCase()); const nextContacts = existing ? tradeContacts.map((contact) => (contact.id === existing.id ? { ...cleanInput, id: existing.id } : contact)) : [...tradeContacts, cleanInput]; setTradeContacts(nextContacts); await AsyncStorage.setItem(TRADE_CONTACTS_KEY, JSON.stringify(nextContacts)); };
  const setIssueSettings = async (input: IssueSettings) => { setIssueSettingsState(input); await AsyncStorage.setItem(ISSUE_SETTINGS_KEY, JSON.stringify(input)); };
  const recordIssue = async (input: { startWeek: number; recipientCount: number; note: string }) => { const nextLog: IssueLog = { id: `issue-${Date.now()}`, startWeek: input.startWeek, recipientCount: input.recipientCount, note: input.note, issuedAt: new Date().toISOString() }; const nextLogs = [nextLog, ...issueLogs].slice(0, 25); setIssueLogs(nextLogs); await AsyncStorage.setItem(ISSUE_LOGS_KEY, JSON.stringify(nextLogs)); };
  const updateSiteSetup = async (input: Partial<SiteProgrammeSetup>) => { const nextSetup = { ...siteSetup, ...input }; setSiteSetupState(nextSetup); await AsyncStorage.setItem(SITE_PROGRAMME_SETUP_KEY, JSON.stringify(nextSetup)); };
  const updatePlotTemplate = async (input: PlotTemplate) => { const nextTemplates = plotTemplates.map((template) => (template.id === input.id ? input : template)); setPlotTemplates(nextTemplates); await AsyncStorage.setItem(PLOT_TEMPLATES_KEY, JSON.stringify(nextTemplates)); };
  const updateTemplateActivityDuration = async (templateId: string, activityCode: string, durationDays: number) => { const nextTemplates = plotTemplates.map((template) => template.id !== templateId ? template : { ...template, activities: template.activities.map((activity) => activity.code === activityCode ? { ...activity, durationDays: Math.max(0, durationDays) } : activity) }); setPlotTemplates(nextTemplates); await AsyncStorage.setItem(PLOT_TEMPLATES_KEY, JSON.stringify(nextTemplates)); };
  const value = useMemo(() => ({ sitePlots, activityDelays, tradeContacts, issueSettings: issueSettingsState, issueLogs, plotTemplates, siteSetup, isSitePlannerLoaded, upsertSitePlot, removeSitePlot, resetPlotData, setActivityDelay, upsertTradeContact, setIssueSettings, recordIssue, updateSiteSetup, updatePlotTemplate, updateTemplateActivityDuration }), [sitePlots, activityDelays, tradeContacts, issueSettingsState, issueLogs, plotTemplates, siteSetup, isSitePlannerLoaded]);
  return <SitePlannerContext.Provider value={value}>{children}</SitePlannerContext.Provider>;
}

export function useSitePlanner() { const context = useContext(SitePlannerContext); if (!context) throw new Error('useSitePlanner must be used within SitePlannerProvider'); return context; }
