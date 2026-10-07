import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { getInspectionTemplateForStage } from '../utils/inspectionTemplateResolver';
import { DabsBriefingItem, UpdateDabsBriefingItemInput } from '../types/dabs';
import {
  BedroomSize,
  BuildType,
  ChecklistAnswer,
  DefectAction,
  DefectStatus,
  InspectionChecklistItem,
  InspectionRecord,
  InspectionStatus,
  PlotProgramme,
  PlotStage,
  RegulationsJurisdiction,
  StageStatus,
} from '../types/models';
import { FoundationType } from '../types/regulations';
import { getProgrammeDateForWorkingDayIndex, getProgrammeWeekForDate, normaliseBritishDate, parseProgrammeDate, shiftProgrammeWorkingDays } from '../utils/programmeDates';
import { ConstructionMethod, getActivityProgrammeRange, getTemplateById, getTemplateForPlot, getTemplateProgrammeWorkingDays, orderedActivities, TemplateSitePlot } from '../utils/templateProgramme';
import { useSitePlanner } from './sitePlannerStore';

const PLOTS_KEY = 'siteprog:plot-programmes:v1';
const STAGES_KEY = 'siteprog:plot-stages:v1';
const INSPECTIONS_KEY = 'siteprog:inspections:v1';
const DEFECTS_KEY = 'siteprog:defects:v1';
const DABS_KEY = 'siteprog:dabs-briefings:v1';

export type CreatePlotInput = {
  plotName: string;
  phase: string;
  houseTypeId: string;
  bedroomSize?: BedroomSize;
  startDate: string;
  endDate: string;
  mode: 'forward' | 'reverse';
  jurisdiction?: RegulationsJurisdiction;
  foundationType?: FoundationType;
  constructionMethod?: ConstructionMethod;
};

export type UpdateInspectionItemInput = {
  compliant?: ChecklistAnswer;
  description?: string;
  imageUri?: string;
  fixed?: ChecklistAnswer;
  fixedImageUri?: string;
  trade?: string;
  measuredValue?: string;
};

export type UpdateDefectInput = {
  status?: DefectStatus;
  sentToTrade?: boolean;
  fixed?: ChecklistAnswer;
  fixedImageUri?: string;
};

type ProgrammeStore = {
  plotProgrammes: PlotProgramme[];
  plotStages: PlotStage[];
  inspections: InspectionRecord[];
  defects: DefectAction[];
  dabsBriefings: DabsBriefingItem[];
  isLoaded: boolean;
  createPlot: (input: CreatePlotInput) => Promise<PlotProgramme>;
  updateStageStatus: (stageId: string, status: StageStatus) => Promise<void>;
  startInspectionForStage: (stageId: string) => Promise<InspectionRecord | undefined>;
  updateInspectionItem: (inspectionId: string, itemId: string, input: UpdateInspectionItemInput) => Promise<void>;
  completeInspection: (inspectionId: string) => Promise<void>;
  updateDefect: (defectId: string, input: UpdateDefectInput) => Promise<void>;
  upsertDabsBriefing: (plotProgrammeId: string, briefingDate: string, input: UpdateDabsBriefingItemInput) => Promise<void>;
};

const ProgrammeContext = createContext<ProgrammeStore | undefined>(undefined);

async function readArray<T>(key: string, fallback: T[]) {
  const stored = await AsyncStorage.getItem(key);
  if (!stored) {
    await AsyncStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
  }
  return JSON.parse(stored) as T[];
}

function toIsoDate(value?: string) {
  const date = parseProgrammeDate(value);
  if (!date) return value ?? '';
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function stableActivityStageId(plotId: string, activityCode: string) {
  const slug = activityCode.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `canonical-stage-${plotId}-${slug || 'activity'}`;
}

function getPlotForStage(stage: PlotStage, plots: PlotProgramme[]) {
  return plots.find((item) => item.id === stage.plotProgrammeId);
}

function getBuildTypeForStage(stage: PlotStage, sitePlots: TemplateSitePlot[]): BuildType | undefined {
  const sitePlot = sitePlots.find((item) => item.id === stage.plotProgrammeId);
  if (sitePlot?.constructionMethod === 'timberFrame') return 'Timber Frame';
  if (sitePlot?.constructionMethod === 'traditional') return 'Traditional';
  return undefined;
}

function getFoundationTypeForStage(stage: PlotStage, plots: PlotProgramme[]) {
  const plot = getPlotForStage(stage, plots);
  return plot?.foundationType;
}

function createChecklistItems(stage: PlotStage, buildType?: BuildType, foundationType?: string): InspectionChecklistItem[] {
  const template = getInspectionTemplateForStage(stage.stageName, buildType, foundationType);
  if (!template) return [];

  return template.items.map((item) => ({
    id: `${stage.id}-${item.id}`,
    templateItemId: item.id,
    trade: item.trade || stage.trade,
    check: item.check,
    compliant: 'Not checked',
    fixed: 'Not checked',
    references: item.references,
    tolerance: item.tolerance,
  }));
}

function createDefectFromItem(stage: PlotStage, inspection: InspectionRecord, item: InspectionChecklistItem): DefectAction {
  const now = new Date().toISOString();
  const toleranceNote = item.tolerance ? ` Tolerance/check: ${item.tolerance.prompt}` : '';
  const measuredNote = item.measuredValue ? ` Measured: ${item.measuredValue}.` : '';
  return {
    id: `defect-${inspection.id}-${item.id}`,
    plotProgrammeId: inspection.plotProgrammeId,
    plotStageId: inspection.plotStageId,
    inspectionRecordId: inspection.id,
    checklistItemId: item.id,
    source: 'Key stage inspection',
    stage: stage.stageName,
    trade: item.trade,
    type: 'Quality',
    description: `${item.description || item.check}${measuredNote}${toleranceNote}`,
    requiredAction: item.description ? `Rectify: ${item.description}` : `Rectify failed check: ${item.check}`,
    imageUri: item.imageUri,
    priority: 'Medium',
    status: 'Open',
    sentToTrade: false,
    fixed: 'No',
    createdAt: now,
  };
}

function getInspectionStatusFromItems(items: InspectionChecklistItem[]): InspectionStatus {
  const failedItems = items.filter((item) => item.compliant === 'No');
  const uncheckedItems = items.filter((item) => item.compliant === 'Not checked');

  if (failedItems.length > 0) return 'Issues noted';
  if (uncheckedItems.length > 0) return 'Inspection in progress';
  return 'Passed';
}

function createBlankDabsItem(plot: PlotProgramme, briefingDate: string, stage?: PlotStage, buildType?: BuildType): DabsBriefingItem {
  return {
    id: `dabs-${briefingDate}-${plot.id}`,
    briefingDate,
    plotProgrammeId: plot.id,
    plotStageId: stage?.id,
    liveTomorrow: true,
    plannedActivity: stage?.stageName ?? '',
    expectedTrade: stage?.trade ?? '',
    inspectionDue: Boolean(stage && getInspectionTemplateForStage(stage.stageName, buildType, plot.foundationType)),
    accessReady: 'Not checked',
    materialsReady: 'Not checked',
    programmeRisk: false,
    notesFor8am: '',
    briefingComplete: false,
    updatedAt: new Date().toISOString(),
  };
}

export function ProgrammeDataProvider({ children }: PropsWithChildren) {
  const { sitePlots, activityDelays, activityMoves, plotTemplates, siteSetup, isSitePlannerLoaded, upsertSitePlot } = useSitePlanner();
  const [plotProgrammes, setPlotProgrammes] = useState<PlotProgramme[]>([]);
  const [plotStages, setPlotStages] = useState<PlotStage[]>([]);
  const [inspections, setInspections] = useState<InspectionRecord[]>([]);
  const [defects, setDefects] = useState<DefectAction[]>([]);
  const [dabsBriefings, setDabsBriefings] = useState<DabsBriefingItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const [plots, stages, storedInspections, storedDefects, storedDabs] = await Promise.all([
          readArray<PlotProgramme>(PLOTS_KEY, []),
          readArray<PlotStage>(STAGES_KEY, []),
          readArray<InspectionRecord>(INSPECTIONS_KEY, []),
          readArray<DefectAction>(DEFECTS_KEY, []),
          readArray<DabsBriefingItem>(DABS_KEY, []),
        ]);
        if (mounted) {
          setPlotProgrammes(plots);
          setPlotStages(stages);
          setInspections(storedInspections);
          setDefects(storedDefects);
          setDabsBriefings(storedDabs);
        }
      } catch (error) {
        console.warn('Unable to load programme data', error);
      } finally {
        if (mounted) setIsLoaded(true);
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded || !isSitePlannerLoaded) return;

    const existingPlots = plotProgrammes;
    const existingStages = plotStages;
    const canonicalPlots: PlotProgramme[] = sitePlots.map((plot) => {
      const existing = existingPlots.find((item) => item.id === plot.id || item.plotName === plot.plotNo);
      const template = getTemplateForPlot(plot, plotTemplates);
      const ranges = orderedActivities(template).map((activity) => ({
        activity,
        range: getActivityProgrammeRange(plot, template, activity, activityDelays, activityMoves, siteSetup),
      }));
      const firstRange = ranges[0]?.range;
      const lastRange = ranges.at(-1)?.range;
      const calculatedStart = firstRange
        ? getProgrammeDateForWorkingDayIndex(siteSetup.programmeStartDate, firstRange.start, siteSetup.includeSaturday, siteSetup.includeSunday)
        : '';
      const calculatedEnd = lastRange
        ? getProgrammeDateForWorkingDayIndex(siteSetup.programmeStartDate, lastRange.finish, siteSetup.includeSaturday, siteSetup.includeSunday)
        : '';
      return {
        id: plot.id,
        plotName: plot.plotNo,
        phase: existing?.phase ?? '',
        houseTypeId: plot.houseTypeId ?? plot.templateId ?? existing?.houseTypeId ?? 'threeBed',
        startDate: toIsoDate(plot.plotStartDate || calculatedStart || existing?.startDate || ''),
        endDate: toIsoDate(plot.plotCompletionDate || calculatedEnd || existing?.endDate || ''),
        mode: 'reverse',
        isLocked: true,
        sharedWithUserIds: existing?.sharedWithUserIds ?? [],
        holdStatus: plot.holdStage ? 'On hold' : 'Active',
        holdReason: plot.holdReason,
        jurisdiction: existing?.jurisdiction ?? 'England',
        foundationType: existing?.foundationType ?? 'Unknown',
      };
    });

    const canonicalStages: PlotStage[] = sitePlots.flatMap((plot) => {
      const template = getTemplateForPlot(plot, plotTemplates);
      const projectedPlot = existingPlots.find((item) => item.id === plot.id || item.plotName === plot.plotNo);
      const buildType: BuildType | undefined = plot.constructionMethod === 'timberFrame'
        ? 'Timber Frame'
        : plot.constructionMethod === 'traditional'
          ? 'Traditional'
          : undefined;

      return orderedActivities(template).map((activity) => {
        const existing = existingStages.find((item) => item.plotProgrammeId === plot.id && item.stageName === activity.code);
        const range = getActivityProgrammeRange(plot, template, activity, activityDelays, activityMoves, siteSetup);
        const startDate = toIsoDate(getProgrammeDateForWorkingDayIndex(siteSetup.programmeStartDate, range.start, siteSetup.includeSaturday, siteSetup.includeSunday));
        const endDate = toIsoDate(getProgrammeDateForWorkingDayIndex(siteSetup.programmeStartDate, range.finish, siteSetup.includeSaturday, siteSetup.includeSunday));
        const delayDays = activityDelays.find((item) => item.plotId === plot.id && item.activityCode === activity.code)?.delayDays ?? 0;
        const held = Boolean(plot.holdStage && activity.stage >= plot.holdStage);
        const inspectionTemplate = getInspectionTemplateForStage(activity.code, buildType, projectedPlot?.foundationType);
        const inspectionWindowEnd = inspectionTemplate
          ? toIsoDate(shiftProgrammeWorkingDays(endDate, 2, siteSetup.includeSaturday, siteSetup.includeSunday))
          : undefined;

        return {
          id: existing?.id ?? stableActivityStageId(plot.id, activity.code),
          plotProgrammeId: plot.id,
          stageName: activity.code,
          trade: activity.trade,
          order: activity.order,
          startDate,
          endDate,
          durationDays: Math.max(1, activity.durationDays + delayDays),
          delayDays,
          status: existing?.status ?? 'Not started',
          holdStatus: held ? 'On hold' : existing?.holdStatus ?? 'Active',
          holdReason: held ? plot.holdReason : existing?.holdReason,
          isKeyStage: Boolean(inspectionTemplate),
          inspectionStatus: existing?.inspectionStatus ?? (inspectionTemplate ? 'Ready for inspection' : 'Not applicable'),
          inspectionWindowStart: existing?.inspectionWindowStart ?? (inspectionTemplate ? endDate : undefined),
          inspectionWindowEnd: existing?.inspectionWindowEnd ?? inspectionWindowEnd,
          inspectionNotes: existing?.inspectionNotes,
        };
      });
    });

    const canonicalPlotIds = new Set(canonicalPlots.map((plot) => plot.id));
    const nextInspections = inspections.filter((inspection) => canonicalPlotIds.has(inspection.plotProgrammeId));
    const nextDefects = defects.filter((defect) => canonicalPlotIds.has(defect.plotProgrammeId));
    const nextDabs = dabsBriefings.filter((briefing) => canonicalPlotIds.has(briefing.plotProgrammeId));

    setPlotProgrammes(canonicalPlots);
    setPlotStages(canonicalStages);
    setInspections(nextInspections);
    setDefects(nextDefects);
    setDabsBriefings(nextDabs);
    Promise.all([
      AsyncStorage.setItem(PLOTS_KEY, JSON.stringify(canonicalPlots)),
      AsyncStorage.setItem(STAGES_KEY, JSON.stringify(canonicalStages)),
      AsyncStorage.setItem(INSPECTIONS_KEY, JSON.stringify(nextInspections)),
      AsyncStorage.setItem(DEFECTS_KEY, JSON.stringify(nextDefects)),
      AsyncStorage.setItem(DABS_KEY, JSON.stringify(nextDabs)),
    ]).catch((error) => console.warn('Unable to persist canonical programme projection', error));
  }, [isLoaded, isSitePlannerLoaded, sitePlots, activityDelays, activityMoves, plotTemplates, siteSetup]); // eslint-disable-line react-hooks/exhaustive-deps

  const createPlot = async (input: CreatePlotInput) => {
    const template = getTemplateById(input.houseTypeId, plotTemplates);
    if (!template) throw new Error('Select a valid house type before creating the plot.');

    const workingDays = getTemplateProgrammeWorkingDays(template);
    const suppliedStart = normaliseBritishDate(input.startDate);
    const suppliedEnd = normaliseBritishDate(input.endDate);
    const exactStart = input.mode === 'forward'
      ? suppliedStart
      : shiftProgrammeWorkingDays(suppliedEnd, -(workingDays - 1), siteSetup.includeSaturday, siteSetup.includeSunday);
    const exactEnd = input.mode === 'reverse'
      ? suppliedEnd
      : shiftProgrammeWorkingDays(suppliedStart, workingDays - 1, siteSetup.includeSaturday, siteSetup.includeSunday);
    const completionWeek = getProgrammeWeekForDate(siteSetup.programmeStartDate, exactEnd);
    if (!exactStart || !exactEnd || !completionWeek) throw new Error('Unable to calculate the plot programme dates.');

    const saved = await upsertSitePlot({
      plotNo: input.plotName.trim(),
      stage9CompleteWeek: completionWeek,
      plotStartDate: exactStart,
      plotCompletionDate: exactEnd,
      templateId: input.houseTypeId,
      houseTypeId: input.houseTypeId,
      constructionMethod: input.constructionMethod ?? 'traditional',
    });

    const newPlot: PlotProgramme = {
      id: saved.id,
      plotName: saved.plotNo,
      phase: input.phase.trim().toUpperCase(),
      houseTypeId: input.houseTypeId,
      startDate: toIsoDate(exactStart),
      endDate: toIsoDate(exactEnd),
      mode: input.mode,
      isLocked: true,
      sharedWithUserIds: [],
      holdStatus: 'Active',
      jurisdiction: input.jurisdiction ?? 'England',
      foundationType: input.foundationType ?? 'Unknown',
    };
    const nextPlots = [...plotProgrammes.filter((plot) => plot.id !== saved.id && plot.plotName !== saved.plotNo), newPlot];
    setPlotProgrammes(nextPlots);
    await AsyncStorage.setItem(PLOTS_KEY, JSON.stringify(nextPlots));
    return newPlot;
  };

  const updateStageStatus = async (stageId: string, status: StageStatus) => {
    const nextStages = plotStages.map((stage) => (stage.id === stageId ? { ...stage, status } : stage));
    setPlotStages(nextStages);
    await AsyncStorage.setItem(STAGES_KEY, JSON.stringify(nextStages));
  };

  const startInspectionForStage = async (stageId: string) => {
    const stage = plotStages.find((item) => item.id === stageId);
    if (!stage) return undefined;
    const buildType = getBuildTypeForStage(stage, sitePlots);
    const foundationType = getFoundationTypeForStage(stage, plotProgrammes);
    const template = getInspectionTemplateForStage(stage.stageName, buildType, foundationType);
    if (!template) return undefined;

    const existing = inspections.find((inspection) => inspection.plotStageId === stageId);
    if (existing) return existing;

    const inspection: InspectionRecord = {
      id: `inspection-${stageId}-${Date.now()}`,
      plotProgrammeId: stage.plotProgrammeId,
      plotStageId: stageId,
      templateId: template.id,
      templateName: template.keyStageName,
      startedAt: new Date().toISOString(),
      status: 'Inspection in progress',
      items: createChecklistItems(stage, buildType, foundationType),
    };

    const nextInspections = [...inspections, inspection];
    const nextStages = plotStages.map((item) => (item.id === stageId ? { ...item, inspectionStatus: 'Inspection in progress' as InspectionStatus } : item));
    setInspections(nextInspections);
    setPlotStages(nextStages);
    await Promise.all([
      AsyncStorage.setItem(INSPECTIONS_KEY, JSON.stringify(nextInspections)),
      AsyncStorage.setItem(STAGES_KEY, JSON.stringify(nextStages)),
    ]);
    return inspection;
  };

  const updateInspectionItem = async (inspectionId: string, itemId: string, input: UpdateInspectionItemInput) => {
    const nextInspections = inspections.map((inspection) => {
      if (inspection.id !== inspectionId) return inspection;
      const nextItems = inspection.items.map((item) => (item.id === itemId ? { ...item, ...input } : item));
      return { ...inspection, status: getInspectionStatusFromItems(nextItems), items: nextItems };
    });
    setInspections(nextInspections);
    await AsyncStorage.setItem(INSPECTIONS_KEY, JSON.stringify(nextInspections));
  };

  const completeInspection = async (inspectionId: string) => {
    const inspection = inspections.find((item) => item.id === inspectionId);
    if (!inspection) return;
    const stage = plotStages.find((item) => item.id === inspection.plotStageId);
    if (!stage) return;

    const completedStatus = getInspectionStatusFromItems(inspection.items);
    const failedItems = inspection.items.filter((item) => item.compliant === 'No');
    const nextDefects = [...defects];

    failedItems.forEach((item) => {
      const existingDefect = nextDefects.find((defect) => defect.checklistItemId === item.id);
      if (!existingDefect) nextDefects.push(createDefectFromItem(stage, inspection, item));
    });

    const nextInspections = inspections.map((item) =>
      item.id === inspectionId
        ? { ...item, status: completedStatus, completedAt: new Date().toISOString() }
        : item,
    );
    const nextStages = plotStages.map((item) =>
      item.id === inspection.plotStageId ? { ...item, inspectionStatus: completedStatus } : item,
    );

    setInspections(nextInspections);
    setDefects(nextDefects);
    setPlotStages(nextStages);
    await Promise.all([
      AsyncStorage.setItem(INSPECTIONS_KEY, JSON.stringify(nextInspections)),
      AsyncStorage.setItem(DEFECTS_KEY, JSON.stringify(nextDefects)),
      AsyncStorage.setItem(STAGES_KEY, JSON.stringify(nextStages)),
    ]);
  };

  const updateDefect = async (defectId: string, input: UpdateDefectInput) => {
    const nextDefects = defects.map((defect) => {
      if (defect.id !== defectId) return defect;
      const closedAt = input.status === 'Verified fixed' ? new Date().toISOString() : defect.closedAt;
      return { ...defect, ...input, closedAt };
    });
    setDefects(nextDefects);
    await AsyncStorage.setItem(DEFECTS_KEY, JSON.stringify(nextDefects));
  };

  const upsertDabsBriefing = async (plotProgrammeId: string, briefingDate: string, input: UpdateDabsBriefingItemInput) => {
    const plot = plotProgrammes.find((item) => item.id === plotProgrammeId);
    if (!plot) return;
    const stage = input.plotStageId ? plotStages.find((item) => item.id === input.plotStageId) : plotStages.find((item) => item.plotProgrammeId === plotProgrammeId && item.status !== 'Complete');
    const existing = dabsBriefings.find((item) => item.plotProgrammeId === plotProgrammeId && item.briefingDate === briefingDate);
    const buildType = stage ? getBuildTypeForStage(stage, sitePlots) : undefined;
    const updated: DabsBriefingItem = {
      ...(existing ?? createBlankDabsItem(plot, briefingDate, stage, buildType)),
      ...input,
      updatedAt: new Date().toISOString(),
    };
    const nextDabs = existing
      ? dabsBriefings.map((item) => (item.id === existing.id ? updated : item))
      : [...dabsBriefings, updated];
    setDabsBriefings(nextDabs);
    await AsyncStorage.setItem(DABS_KEY, JSON.stringify(nextDabs));
  };

  const value = useMemo(
    () => ({
      plotProgrammes,
      plotStages,
      inspections,
      defects,
      dabsBriefings,
      isLoaded,
      createPlot,
      updateStageStatus,
      startInspectionForStage,
      updateInspectionItem,
      completeInspection,
      updateDefect,
      upsertDabsBriefing,
    }),
    [plotProgrammes, plotStages, inspections, defects, dabsBriefings, isLoaded], // eslint-disable-line react-hooks/exhaustive-deps
  );

  return <ProgrammeContext.Provider value={value}>{children}</ProgrammeContext.Provider>;
}

export function useProgrammeData() {
  const context = useContext(ProgrammeContext);
  if (!context) throw new Error('useProgrammeData must be used within ProgrammeDataProvider');
  return context;
}
