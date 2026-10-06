import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { INSPECTION_RESULTS_KEY, INSPECTION_STORY_KEY } from '../utils/inspectionRecords';
import { getProgrammeStartDateValue, getProgrammeWeekForDate } from '../utils/programmeDates';
import { getPlotMetadataKey, readPlotMetadata } from '../utils/plotMetadata';
import { ActivityDelay, ProgrammeStageNumber, TRADE_ORDER } from '../utils/siteProgrammeEngine';
import {
  ActivityMove,
  applyHouseTypeFloorConfiguration,
  ConstructionMethod,
  createHouseTypeTemplate,
  DEFAULT_PLOT_TEMPLATES,
  DEFAULT_SITE_PROGRAMME_SETUP,
  getSortedSitePlots,
  isProgrammeStageNumber,
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
const HOUSE_TYPES_RESET_KEY = 'programme-buddy:house-types-reset:v2';
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
  assistantEmails?: string;
  sendMasterToSmTeam?: boolean;
  sendTwoWeekToSmTeam?: boolean;
  sendTradeProgrammeToSmTeam?: boolean;
  sendTradeProgrammesToTrades?: boolean;
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
  plotStartDate?: string;
  plotCompletionDate?: string;
  templateId: string;
  houseTypeId?: string;
  constructionMethod?: ConstructionMethod;
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
  removeSitePlot: (plotId: string) => Promise<void>;
  clearSitePlotData: () => Promise<void>;
  resetPlotData: () => Promise<void>;
  holdPlotAtStage: (input: { plotId: string; holdStage?: ProgrammeStageNumber; holdReason?: string }) => Promise<void>;
  setActivityDelay: (input: ActivityDelay) => Promise<void>;
  setActivityMove: (input: { plotId: string; activityCode: string; deltaDays: number }) => Promise<void>;
  resetActivityMovesForPlot: (plotId: string) => Promise<void>;
  upsertTradeContact: (input: TradeContact) => Promise<void>;
  setIssueSettings: (input: IssueSettings) => Promise<void>;
  setProgrammeNote: (input: { plotId: string; trade: string; startWeek: number; note: string }) => Promise<void>;
  recordIssue: (input: { startWeek: number; recipientCount: number; note: string }) => Promise<void>;
  updateSiteSetup: (input: Partial<SiteProgrammeSetup>) => Promise<void>;
  addPlotTemplate: (input: { name: string; bedrooms: number; floors: number; baseTemplateId?: string }) => Promise<PlotTemplate>;
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

async function clearInspectionDataForPlot(plotId: string) {
  const [storedResults, storedStory] = await Promise.all([
    AsyncStorage.getItem(INSPECTION_RESULTS_KEY),
    AsyncStorage.getItem(INSPECTION_STORY_KEY),
  ]);

  if (storedResults) {
    const results = JSON.parse(storedResults) as Record<string, unknown>;
    const nextResults = Object.fromEntries(Object.entries(results).filter(([key]) => !key.startsWith(`${plotId}:`)));
    await AsyncStorage.setItem(INSPECTION_RESULTS_KEY, JSON.stringify(nextResults));
  }

  if (storedStory) {
    const story = JSON.parse(storedStory) as { plotId?: string }[];
    const nextStory = story.filter((record) => record.plotId !== plotId);
    await AsyncStorage.setItem(INSPECTION_STORY_KEY, JSON.stringify(nextStory));
  }
}

function mergeDefaultTradeContacts(stored: TradeContact[]) {
  const storedByTrade = new Map(stored.map((contact) => [contact.trade, contact]));
  return DEFAULT_TRADE_CONTACTS.map((contact) => storedByTrade.get(contact.trade) ?? contact);
}

function normaliseHoldStage(plot: TemplateSitePlot) {
  return isProgrammeStageNumber(plot.holdStage) ? plot.holdStage : undefined;
}

function normalisePlots(stored: TemplateSitePlot[]) {
  return stored.map((plot, index) => {
    const holdStage = normaliseHoldStage(plot);
    const legacyTemplateId = plot.templateId || 'threeBed';
    const constructionMethod: ConstructionMethod = plot.constructionMethod
      ?? (legacyTemplateId === 'timberFrame' ? 'timberFrame' : 'traditional');
    const houseTypeId = plot.houseTypeId ?? (legacyTemplateId === 'timberFrame' ? 'threeBed' : legacyTemplateId);
    return {
      ...plot,
      buildOrder: plot.buildOrder || index + 1,
      templateId: houseTypeId,
      houseTypeId,
      constructionMethod,
      holdStage,
      holdReason: holdStage ? plot.holdReason ?? '' : undefined,
      holdUpdatedAt: holdStage ? plot.holdUpdatedAt : undefined,
    };
  });
}

const LEGACY_PROPERTY_TEMPLATE_IDS = new Set(['apartment', 'twoBed', 'fourBed', 'fiveBed']);

function normaliseTemplate(template: PlotTemplate) {
  const isSystemTemplate = template.isSystemTemplate ?? (template.id === 'threeBed' || template.id === 'fourBedStandard' || template.id === 'timberFrame');
  const isHouseType = template.isHouseType ?? (!isSystemTemplate && !LEGACY_PROPERTY_TEMPLATE_IDS.has(template.id));
  return {
    ...template,
    houseTypeCode: template.houseTypeCode || template.name,
    isSystemTemplate,
    isHouseType,
  };
}

function mergeDefaultTemplates(stored: PlotTemplate[]) {
  const savedById = new Map(stored.map((template) => [template.id, normaliseTemplate(template)]));
  const merged = DEFAULT_PLOT_TEMPLATES.map((template) => savedById.get(template.id) ?? normaliseTemplate(template));
  const defaultIds = new Set(DEFAULT_PLOT_TEMPLATES.map((template) => template.id));
  const fourBedStandard = DEFAULT_PLOT_TEMPLATES.find((template) => template.id === 'fourBedStandard');
  const custom = stored
    .filter((template) => !defaultIds.has(template.id) && !LEGACY_PROPERTY_TEMPLATE_IDS.has(template.id))
    .map(normaliseTemplate)
    .filter((template) => template.isHouseType)
    .map((template) => {
      if (!fourBedStandard || template.bedrooms !== 4 || (template.standardVersion ?? 0) >= (fourBedStandard.standardVersion ?? 1)) {
        return template;
      }
      const floors = template.floors ?? 2;
      return applyHouseTypeFloorConfiguration({
        ...fourBedStandard,
        id: template.id,
        name: template.name,
        houseTypeCode: template.houseTypeCode || template.name,
        bedrooms: 4,
        floors,
        isHouseType: true,
        isSystemTemplate: false,
        constructionMethod: undefined,
        description: template.description,
        standardVersion: fourBedStandard.standardVersion,
        activities: fourBedStandard.activities.map((activity) => ({ ...activity })),
      }, floors);
    });
  return [...merged, ...custom];
}

function cleanPlotInput(input: SitePlotInput, fallbackBuildOrder: number): SitePlotInput | null {
  const plotNo = input.plotNo.trim();
  const stage9CompleteWeek = Number(input.stage9CompleteWeek);
  if (!plotNo || !Number.isFinite(stage9CompleteWeek) || stage9CompleteWeek <= 0) return null;
  const houseTypeId = input.houseTypeId || input.templateId || 'threeBed';
  return {
    plotNo,
    buildOrder: Number.isFinite(input.buildOrder) && input.buildOrder && input.buildOrder > 0 ? input.buildOrder : fallbackBuildOrder,
    stage9CompleteWeek,
    plotStartDate: input.plotStartDate,
    plotCompletionDate: input.plotCompletionDate,
    templateId: houseTypeId,
    houseTypeId,
    constructionMethod: input.constructionMethod ?? 'traditional',
  };
}

function applyPlotInputs(currentPlots: TemplateSitePlot[], inputs: SitePlotInput[]) {
  let nextPlots: TemplateSitePlot[] = normalisePlots(currentPlots);
  inputs.forEach((input, inputIndex) => {
    const cleaned = cleanPlotInput(input, nextPlots.length + inputIndex + 1);
    if (!cleaned) return;
    const existing = nextPlots.find((plot) => plot.plotNo.toLowerCase() === cleaned.plotNo.toLowerCase());
    const nextPlot: TemplateSitePlot = existing
      ? {
          ...existing,
          plotNo: cleaned.plotNo,
          buildOrder: cleaned.buildOrder,
          stage9CompleteWeek: cleaned.stage9CompleteWeek,
          plotStartDate: cleaned.plotStartDate ?? existing.plotStartDate,
          plotCompletionDate: cleaned.plotCompletionDate ?? existing.plotCompletionDate,
          templateId: cleaned.templateId,
          houseTypeId: cleaned.houseTypeId,
          constructionMethod: cleaned.constructionMethod,
        }
      : {
          id: `site-plot-${Date.now()}-${inputIndex}`,
          plotNo: cleaned.plotNo,
          buildOrder: cleaned.buildOrder,
          stage9CompleteWeek: cleaned.stage9CompleteWeek,
          plotStartDate: cleaned.plotStartDate,
          plotCompletionDate: cleaned.plotCompletionDate,
          templateId: cleaned.templateId,
          houseTypeId: cleaned.houseTypeId,
          constructionMethod: cleaned.constructionMethod,
        };
    nextPlots = existing ? nextPlots.map((plot) => (plot.id === existing.id ? nextPlot : plot)) : [...nextPlots, nextPlot];
  });
  return getSortedSitePlots(nextPlots);
}

export function SitePlannerProvider({ children }: PropsWithChildren) {
  const [sitePlots, setSitePlots] = useState<TemplateSitePlot[]>([]);
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
          readArray<TemplateSitePlot>(SITE_PLOTS_KEY, []),
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
          const migratedSiteSetup = { ...DEFAULT_SITE_PROGRAMME_SETUP, ...storedSiteSetup, stageCount: 9, programmeStartDate: getProgrammeStartDateValue(storedSiteSetup.programmeStartDate) };
          const storedMetadata = await readPlotMetadata();
          const migratedPlots = normalisePlots(storedPlots).map((plot) => {
            const detail = storedMetadata[getPlotMetadataKey(plot.plotNo)];
            const plotCompletionDate = plot.plotCompletionDate ?? detail?.plotCompletionDate;
            const plotStartDate = plot.plotStartDate ?? detail?.plotStartDate;
            const stage9CompleteWeek = plotCompletionDate
              ? (getProgrammeWeekForDate(migratedSiteSetup.programmeStartDate, plotCompletionDate) ?? plot.stage9CompleteWeek)
              : plot.stage9CompleteWeek;
            return { ...plot, plotStartDate, plotCompletionDate, stage9CompleteWeek };
          });
          setSitePlots(getSortedSitePlots(migratedPlots));
          await AsyncStorage.setItem(SITE_PLOTS_KEY, JSON.stringify(getSortedSitePlots(migratedPlots)));
          setActivityDelays(storedDelays);
          setActivityMoves(storedMoves);
          setTradeContacts(mergeDefaultTradeContacts(storedContacts));
          setIssueSettingsState(storedIssueSettings);
          setIssueLogs(storedIssueLogs);
          setProgrammeNotes(storedNotes);
          const houseTypesReset = await AsyncStorage.getItem(HOUSE_TYPES_RESET_KEY);
          const mergedTemplates = houseTypesReset === 'done'
            ? mergeDefaultTemplates(storedTemplates)
            : DEFAULT_PLOT_TEMPLATES.map(normaliseTemplate);
          setPlotTemplates(mergedTemplates);
          await AsyncStorage.setItem(PLOT_TEMPLATES_KEY, JSON.stringify(mergedTemplates));
          if (houseTypesReset !== 'done') {
            await AsyncStorage.setItem(HOUSE_TYPES_RESET_KEY, 'done');
          }
          setSiteSetupState(migratedSiteSetup);
          await AsyncStorage.setItem(SITE_PROGRAMME_SETUP_KEY, JSON.stringify(migratedSiteSetup));
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
      clearInspectionDataForPlot(plotId),
    ]);
  };

  const clearSitePlotData = async () => {
    setSitePlots([]);
    setActivityDelays([]);
    setActivityMoves([]);
    setProgrammeNotes([]);
    setIssueLogs([]);
    await Promise.all([
      AsyncStorage.setItem(SITE_PLOTS_KEY, JSON.stringify([])),
      AsyncStorage.setItem(SITE_DELAYS_KEY, JSON.stringify([])),
      AsyncStorage.setItem(ACTIVITY_MOVES_KEY, JSON.stringify([])),
      AsyncStorage.setItem(PROGRAMME_NOTES_KEY, JSON.stringify([])),
      AsyncStorage.setItem(ISSUE_LOGS_KEY, JSON.stringify([])),
      AsyncStorage.removeItem(INSPECTION_RESULTS_KEY),
      AsyncStorage.removeItem(INSPECTION_STORY_KEY),
    ]);
  };

  const holdPlotAtStage = async (input: { plotId: string; holdStage?: ProgrammeStageNumber; holdReason?: string }) => {
    const nextPlots = sitePlots.map((plot) => {
      if (plot.id !== input.plotId) return plot;
      if (!input.holdStage) {
        const { holdStage, holdReason, holdUpdatedAt, ...releasedPlot } = plot;
        return releasedPlot;
      }
      return {
        ...plot,
        holdStage: input.holdStage,
        holdReason: input.holdReason?.trim() ?? '',
        holdUpdatedAt: new Date().toISOString(),
      };
    });
    const sorted = getSortedSitePlots(nextPlots);
    setSitePlots(sorted);
    await AsyncStorage.setItem(SITE_PLOTS_KEY, JSON.stringify(sorted));
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
    const nextSetup = { ...siteSetup, ...input, stageCount: 9 };
    setSiteSetupState(nextSetup);
    await AsyncStorage.setItem(SITE_PROGRAMME_SETUP_KEY, JSON.stringify(nextSetup));
  };

  const addPlotTemplate = async (input: { name: string; bedrooms: number; floors: number; baseTemplateId?: string }) => {
    const standardTemplateId = Math.round(Number(input.bedrooms)) === 4 ? 'fourBedStandard' : (input.baseTemplateId ?? 'threeBed');
    const baseTemplate = plotTemplates.find((template) => template.id === standardTemplateId)
      ?? plotTemplates.find((template) => template.id === 'threeBed')
      ?? plotTemplates[0];
    const nextTemplate = createHouseTypeTemplate({ ...input, baseTemplate });
    const nextTemplates = [...plotTemplates, nextTemplate];
    setPlotTemplates(nextTemplates);
    await AsyncStorage.setItem(PLOT_TEMPLATES_KEY, JSON.stringify(nextTemplates));
    return nextTemplate;
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
      removeSitePlot,
      clearSitePlotData,
      resetPlotData: clearSitePlotData,
      holdPlotAtStage,
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
    [sitePlots, activityDelays, activityMoves, tradeContacts, issueSettingsState, issueLogs, programmeNotes, plotTemplates, siteSetup, isSitePlannerLoaded], // eslint-disable-line react-hooks/exhaustive-deps
  );

  return <SitePlannerContext.Provider value={value}>{children}</SitePlannerContext.Provider>;
}

export function useSitePlanner() {
  const context = useContext(SitePlannerContext);
  if (!context) throw new Error('useSitePlanner must be used within SitePlannerProvider');
  return context;
}
