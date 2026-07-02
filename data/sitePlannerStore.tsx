import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { ActivityDelay, TRADE_ORDER } from '../utils/siteProgrammeEngine';
import {
  ActivityMove,
  createHouseTypeTemplate,
  DEFAULT_PLOT_TEMPLATES,
  DEFAULT_SITE_PROGRAMME_SETUP,
  DEFAULT_TEMPLATE_PLOTS,
  getSortedSitePlots,
  PlotTemplate,
  SiteProgrammeSetup,
  TemplateSitePlot,
} from '../utils/templateProgramme';

const SITE_PLOTS_KEY = 'programme-buddy:plots:v1';
const SITE_DELAYS_KEY = 'programme-buddy:delays:v1';
const ACTIVITY_MOVES_KEY = 'programme-buddy:activity-moves:v1';
const TRADE_CONTACTS_KEY = 'programme-buddy:trade-contacts:v1';
const ISSUE_SETTINGS_KEY = 'programme-buddy:issue-settings:v1';
const ISSUE_LOGS_KEY = 'programme-buddy:issue-logs:v1';
const PLOT_TEMPLATES_KEY = 'programme-buddy:plot-templates:v1';
const SITE_PROGRAMME_SETUP_KEY = 'programme-buddy:programme-setup:v1';
const PROGRAMME_NOTES_KEY = 'programme-buddy:programme-notes:v1';

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

export type ProgrammeNote = {
  id: string;
  plotId: string;
  trade: string;
  startWeek: number;
  note: string;
  updatedAt: string;
};

export type SitePlotInput = {
  plotNo: string;
  buildOrder?: number;
  stage9CompleteWeek: number;
  templateId: string;
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
  sitePlots: TemplateSitePlot[];
  activityDelays: ActivityDelay[];
  activityMoves: ActivityMove[];
  tradeContacts: TradeContact[];
  issueSettings: IssueSettings;
  issueLogs: IssueLog[];
  programmeNotes: ProgrammeNote[];
  plotTemplates: PlotTemplate[];
  siteSetup: SiteProgrammeSetup;
  isSitePlannerLoaded: boolean;
  upsertSitePlot: (input: SitePlotInput) => Promise<void>;
  bulkUpsertSitePlots: (inputs: SitePlotInput[]) => Promise<void>;
  removeSitePlot: (plotId: string) => Promise<void>;
  setActivityDelay: (input: ActivityDelay) => Promise<void>;
  setActivityMove: (input: { plotId: string; activityCode: string; deltaDays: number }) => Promise<void>;
  resetActivityMovesForPlot: (plotId: string) => Promise<void>;
  upsertTradeContact: (input: TradeContact) => Promise<void>;
  setIssueSettings: (input: IssueSettings) => Promise<void>;
  setProgrammeNote: (input: { plotId: string; trade: string; startWeek: number; note: string }) => Promise<void>;
  recordIssue: (input: { startWeek: number; recipientCount: number; note: string }) => Promise<void>;
  updateSiteSetup: (input: Partial<SiteProgrammeSetup>) => Promise<void>;
  addPlotTemplate: (input: { name: string; houseTypeCode: string; baseTemplateId?: string }) => Promise<void>;
  updatePlotTemplate: (input: PlotTemplate) => Promise<void>;
  updateTemplateActivityDuration: (templateId: string, activityCode: string, durationDays: number) => Promise<void>;
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

function normalisePlots(stored: TemplateSitePlot[]) {
  return stored.map((plot, index) => ({ ...plot, buildOrder: plot.buildOrder || index + 1, templateId: plot.templateId || 'threeBed' }));
}

function normaliseTemplate(template: PlotTemplate) {
  return {
    ...template,
    houseTypeCode: template.houseTypeCode || template.name,
    constructionMethod: template.constructionMethod ?? 'traditional',
  };
}

function mergeDefaultTemplates(stored: PlotTemplate[]) {
  const storedById = new Map(stored.map((template) => [template.id, template]));
  const defaultIds = new Set(DEFAULT_PLOT_TEMPLATES.map((template) => template.id));
  const mergedDefaults = DEFAULT_PLOT_TEMPLATES.map((template) => {
    const storedTemplate = storedById.get(template.id);
    if (!storedTemplate) return normaliseTemplate(template);
    const storedActivitiesByCode = new Map(storedTemplate.activities.map((activity) => [activity.code, activity]));
    return normaliseTemplate({
      ...template,
      name: storedTemplate.name || template.name,
      houseTypeCode: storedTemplate.houseTypeCode || template.houseTypeCode || template.name,
      constructionMethod: storedTemplate.constructionMethod ?? template.constructionMethod ?? 'traditional',
      description: storedTemplate.description || template.description,
      activities: template.activities.map((activity) => {
        const storedActivity = storedActivitiesByCode.get(activity.code);
        return storedActivity ? { ...activity, durationDays: storedActivity.durationDays ?? activity.durationDays } : activity;
      }),
    });
  });
  const customTemplates = stored.filter((template) => !defaultIds.has(template.id)).map(normaliseTemplate);
  return [...mergedDefaults, ...customTemplates];
}

function cleanPlotInput(input: SitePlotInput, fallbackBuildOrder: number): SitePlotInput | null {
  const plotNo = input.plotNo.trim();
  const stage9CompleteWeek = Number(input.stage9CompleteWeek);
  if (!plotNo || !Number.isFinite(stage9CompleteWeek) || stage9CompleteWeek <= 0) return null;
  return {
    plotNo,
    buildOrder: Number.isFinite(input.buildOrder) && input.buildOrder && input.buildOrder > 0 ? input.buildOrder : fallbackBuildOrder,
    stage9CompleteWeek,
    templateId: input.templateId || 'threeBed',
  };
}

function applyPlotInputs(currentPlots: TemplateSitePlot[], inputs: SitePlotInput[]) {
  let nextPlots = normalisePlots(currentPlots);
  inputs.forEach((input, inputIndex) => {
    const cleaned = cleanPlotInput(input, nextPlots.length + inputIndex + 1);
    if (!cleaned) return;
    const existing = nextPlots.find((plot) => plot.plotNo.toLowerCase() === cleaned.plotNo.toLowerCase());
    const nextPlot: TemplateSitePlot = existing
      ? { ...existing, plotNo: cleaned.plotNo, buildOrder: cleaned.buildOrder, stage9CompleteWeek: cleaned.stage9CompleteWeek, templateId: cleaned.templateId }
      : { id: `site-plot-${Date.now()}-${inputIndex}`, plotNo: cleaned.plotNo, buildOrder: cleaned.buildOrder, stage9CompleteWeek: cleaned.stage9CompleteWeek, templateId: cleaned.templateId };
    nextPlots = existing ? nextPlots.map((plot) => (plot.id === existing.id ? nextPlot : plot)) : [...nextPlots, nextPlot];
  });
  return getSortedSitePlots(nextPlots);
}

export function SitePlannerProvider({ children }: PropsWithChildren) {
  const [sitePlots, setSitePlots] = useState<TemplateSitePlot[]>(DEFAULT_TEMPLATE_PLOTS);
  const [activityDelays, setActivityDelays] = useState<ActivityDelay[]>([]);
  const [activityMoves, setActivityMoves] = useState<ActivityMove[]>([]);
  const [tradeContacts, setTradeContacts] = useState<TradeContact[]>(DEFAULT_TRADE_CONTACTS);
  const [issueSettingsState, setIssueSettingsState] = useState<IssueSettings>(DEFAULT_ISSUE_SETTINGS);
  const [issueLogs, setIssueLogs] = useState<IssueLog[]>([]);
  const [programmeNotes, setProgrammeNotes] = useState<ProgrammeNote[]>([]);
  const [plotTemplates, setPlotTemplates] = useState<PlotTemplate[]>(DEFAULT_PLOT_TEMPLATES);
  const [siteSetup, setSiteSetupState] = useState<SiteProgrammeSetup>(DEFAULT_SITE_PROGRAMME_SETUP);
  const [isSitePlannerLoaded, setIsSitePlannerLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadPlanner() {
      try {
        const [storedPlots, storedDelays, storedMoves, storedContacts, storedIssueSettings, storedIssueLogs, storedNotes, storedTemplates, storedSiteSetup] = await Promise.all([
          readArray<TemplateSitePlot>(SITE_PLOTS_KEY, DEFAULT_TEMPLATE_PLOTS),
          readArray<ActivityDelay>(SITE_DELAYS_KEY, []),
          readArray<ActivityMove>(ACTIVITY_MOVES_KEY, []),
          readArray<TradeContact>(TRADE_CONTACTS_KEY, DEFAULT_TRADE_CONTACTS),
          readObject<IssueSettings>(ISSUE_SETTINGS_KEY, DEFAULT_ISSUE_SETTINGS),
          readArray<IssueLog>(ISSUE_LOGS_KEY, []),
          readArray<ProgrammeNote>(PROGRAMME_NOTES_KEY, []),
          readArray<PlotTemplate>(PLOT_TEMPLATES_KEY, DEFAULT_PLOT_TEMPLATES),
          readObject<SiteProgrammeSetup>(SITE_PROGRAMME_SETUP_KEY, DEFAULT_SITE_PROGRAMME_SETUP),
        ]);
        if (mounted) {
          setSitePlots(getSortedSitePlots(normalisePlots(storedPlots)));
          setActivityDelays(storedDelays);
          setActivityMoves(storedMoves);
          setTradeContacts(mergeDefaultTradeContacts(storedContacts));
          setIssueSettingsState(storedIssueSettings);
          setIssueLogs(storedIssueLogs);
          setProgrammeNotes(storedNotes);
          setPlotTemplates(mergeDefaultTemplates(storedTemplates));
          setSiteSetupState({ ...DEFAULT_SITE_PROGRAMME_SETUP, ...storedSiteSetup });
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

  const upsertSitePlot = async (input: SitePlotInput) => {
    const nextPlots = applyPlotInputs(sitePlots, [input]);
    setSitePlots(nextPlots);
    await AsyncStorage.setItem(SITE_PLOTS_KEY, JSON.stringify(nextPlots));
  };

  const bulkUpsertSitePlots = async (inputs: SitePlotInput[]) => {
    const nextPlots = applyPlotInputs(sitePlots, inputs);
    setSitePlots(nextPlots);
    await AsyncStorage.setItem(SITE_PLOTS_KEY, JSON.stringify(nextPlots));
  };

  const removeSitePlot = async (plotId: string) => {
    const nextPlots = sitePlots.filter((plot) => plot.id !== plotId);
    const nextDelays = activityDelays.filter((delay) => delay.plotId !== plotId);
    const nextMoves = activityMoves.filter((move) => move.plotId !== plotId);
    const nextNotes = programmeNotes.filter((note) => note.plotId !== plotId);
    setSitePlots(nextPlots);
    setActivityDelays(nextDelays);
    setActivityMoves(nextMoves);
    setProgrammeNotes(nextNotes);
    await Promise.all([
      AsyncStorage.setItem(SITE_PLOTS_KEY, JSON.stringify(nextPlots)),
      AsyncStorage.setItem(SITE_DELAYS_KEY, JSON.stringify(nextDelays)),
      AsyncStorage.setItem(ACTIVITY_MOVES_KEY, JSON.stringify(nextMoves)),
      AsyncStorage.setItem(PROGRAMME_NOTES_KEY, JSON.stringify(nextNotes)),
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

  const setActivityMove = async (input: { plotId: string; activityCode: string; deltaDays: number }) => {
    const existing = activityMoves.find((move) => move.plotId === input.plotId && move.activityCode === input.activityCode);
    const nextMove: ActivityMove = existing
      ? { ...existing, deltaDays: input.deltaDays, updatedAt: new Date().toISOString() }
      : { id: `activity-move-${Date.now()}`, plotId: input.plotId, activityCode: input.activityCode, deltaDays: input.deltaDays, updatedAt: new Date().toISOString() };
    const nextMoves = input.deltaDays === 0
      ? activityMoves.filter((move) => !(move.plotId === input.plotId && move.activityCode === input.activityCode))
      : existing
        ? activityMoves.map((move) => (move.id === existing.id ? nextMove : move))
        : [...activityMoves, nextMove];
    setActivityMoves(nextMoves);
    await AsyncStorage.setItem(ACTIVITY_MOVES_KEY, JSON.stringify(nextMoves));
  };

  const resetActivityMovesForPlot = async (plotId: string) => {
    const nextMoves = activityMoves.filter((move) => move.plotId !== plotId);
    setActivityMoves(nextMoves);
    await AsyncStorage.setItem(ACTIVITY_MOVES_KEY, JSON.stringify(nextMoves));
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

  const setProgrammeNote = async (input: { plotId: string; trade: string; startWeek: number; note: string }) => {
    const existing = programmeNotes.find((item) => item.plotId === input.plotId && item.trade === input.trade && item.startWeek === input.startWeek);
    const cleanedNote = input.note.trim();
    const nextNote: ProgrammeNote = existing
      ? { ...existing, note: cleanedNote, updatedAt: new Date().toISOString() }
      : { id: `programme-note-${Date.now()}`, plotId: input.plotId, trade: input.trade, startWeek: input.startWeek, note: cleanedNote, updatedAt: new Date().toISOString() };
    const nextNotes = cleanedNote
      ? existing
        ? programmeNotes.map((item) => (item.id === existing.id ? nextNote : item))
        : [...programmeNotes, nextNote]
      : programmeNotes.filter((item) => item.id !== existing?.id);
    setProgrammeNotes(nextNotes);
    await AsyncStorage.setItem(PROGRAMME_NOTES_KEY, JSON.stringify(nextNotes));
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

  const updateSiteSetup = async (input: Partial<SiteProgrammeSetup>) => {
    const nextSetup = { ...siteSetup, ...input };
    setSiteSetupState(nextSetup);
    await AsyncStorage.setItem(SITE_PROGRAMME_SETUP_KEY, JSON.stringify(nextSetup));
  };

  const addPlotTemplate = async (input: { name: string; houseTypeCode: string; baseTemplateId?: string }) => {
    const baseTemplate = plotTemplates.find((template) => template.id === input.baseTemplateId) ?? plotTemplates.find((template) => template.id === 'threeBed') ?? plotTemplates[0];
    const nextTemplate = createHouseTypeTemplate({ ...input, baseTemplate });
    const nextTemplates = [...plotTemplates, nextTemplate];
    setPlotTemplates(nextTemplates);
    await AsyncStorage.setItem(PLOT_TEMPLATES_KEY, JSON.stringify(nextTemplates));
  };

  const updatePlotTemplate = async (input: PlotTemplate) => {
    const nextTemplates = plotTemplates.map((template) => (template.id === input.id ? input : template));
    setPlotTemplates(nextTemplates);
    await AsyncStorage.setItem(PLOT_TEMPLATES_KEY, JSON.stringify(nextTemplates));
  };

  const updateTemplateActivityDuration = async (templateId: string, activityCode: string, durationDays: number) => {
    const nextTemplates = plotTemplates.map((template) => {
      if (template.id !== templateId) return template;
      return {
        ...template,
        activities: template.activities.map((activity) =>
          activity.code === activityCode ? { ...activity, durationDays: Math.max(0, durationDays) } : activity,
        ),
      };
    });
    setPlotTemplates(nextTemplates);
    await AsyncStorage.setItem(PLOT_TEMPLATES_KEY, JSON.stringify(nextTemplates));
  };

  const value = useMemo(
    () => ({
      sitePlots,
      activityDelays,
      activityMoves,
      tradeContacts,
      issueSettings: issueSettingsState,
      issueLogs,
      programmeNotes,
      plotTemplates,
      siteSetup,
      isSitePlannerLoaded,
      upsertSitePlot,
      bulkUpsertSitePlots,
      removeSitePlot,
      setActivityDelay,
      setActivityMove,
      resetActivityMovesForPlot,
      upsertTradeContact,
      setIssueSettings,
      setProgrammeNote,
      recordIssue,
      updateSiteSetup,
      addPlotTemplate,
      updatePlotTemplate,
      updateTemplateActivityDuration,
    }),
    [sitePlots, activityDelays, activityMoves, tradeContacts, issueSettingsState, issueLogs, programmeNotes, plotTemplates, siteSetup, isSitePlannerLoaded],
  );

  return <SitePlannerContext.Provider value={value}>{children}</SitePlannerContext.Provider>;
}

export function useSitePlanner() {
  const context = useContext(SitePlannerContext);
  if (!context) throw new Error('useSitePlanner must be used within SitePlannerProvider');
  return context;
}
