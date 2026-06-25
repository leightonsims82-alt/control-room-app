import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { plotProgrammes as demoPlots, plotStages as demoStages } from './demoData';
import { getInspectionTemplateForStage } from './keyStageInspectionTemplates';
import {
  BedroomSize,
  ChecklistAnswer,
  DefectAction,
  DefectStatus,
  InspectionChecklistItem,
  InspectionRecord,
  InspectionStatus,
  PlotProgramme,
  PlotStage,
  StageStatus,
} from '../types/models';
import { generateStagesForPlot } from '../utils/stageGeneration';

const PLOTS_KEY = 'siteprog:plot-programmes:v1';
const STAGES_KEY = 'siteprog:plot-stages:v1';
const INSPECTIONS_KEY = 'siteprog:inspections:v1';
const DEFECTS_KEY = 'siteprog:defects:v1';

export type CreatePlotInput = {
  plotName: string;
  phase: string;
  houseTypeId: string;
  bedroomSize?: BedroomSize;
  startDate: string;
  endDate: string;
  mode: 'forward' | 'reverse';
};

export type UpdateInspectionItemInput = {
  compliant?: ChecklistAnswer;
  description?: string;
  imageUri?: string;
  fixed?: ChecklistAnswer;
  fixedImageUri?: string;
  trade?: string;
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
  isLoaded: boolean;
  createPlot: (input: CreatePlotInput) => Promise<PlotProgramme>;
  updateStageStatus: (stageId: string, status: StageStatus) => Promise<void>;
  startInspectionForStage: (stageId: string) => Promise<InspectionRecord | undefined>;
  updateInspectionItem: (inspectionId: string, itemId: string, input: UpdateInspectionItemInput) => Promise<void>;
  completeInspection: (inspectionId: string) => Promise<void>;
  updateDefect: (defectId: string, input: UpdateDefectInput) => Promise<void>;
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

function createChecklistItems(stage: PlotStage): InspectionChecklistItem[] {
  const template = getInspectionTemplateForStage(stage.stageName);
  if (!template) return [];

  return template.items.map((item) => ({
    id: `${stage.id}-${item.id}`,
    templateItemId: item.id,
    trade: item.trade || stage.trade,
    check: item.check,
    compliant: 'Not checked',
    fixed: 'Not checked',
  }));
}

function createDefectFromItem(stage: PlotStage, inspection: InspectionRecord, item: InspectionChecklistItem): DefectAction {
  const now = new Date().toISOString();
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
    description: item.description || item.check,
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

export function ProgrammeDataProvider({ children }: PropsWithChildren) {
  const [plotProgrammes, setPlotProgrammes] = useState<PlotProgramme[]>(demoPlots);
  const [plotStages, setPlotStages] = useState<PlotStage[]>(demoStages);
  const [inspections, setInspections] = useState<InspectionRecord[]>([]);
  const [defects, setDefects] = useState<DefectAction[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const [plots, stages, storedInspections, storedDefects] = await Promise.all([
          readArray<PlotProgramme>(PLOTS_KEY, demoPlots),
          readArray<PlotStage>(STAGES_KEY, demoStages),
          readArray<InspectionRecord>(INSPECTIONS_KEY, []),
          readArray<DefectAction>(DEFECTS_KEY, []),
        ]);
        if (mounted) {
          setPlotProgrammes(plots);
          setPlotStages(stages);
          setInspections(storedInspections);
          setDefects(storedDefects);
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

  const createPlot = async (input: CreatePlotInput) => {
    const plotId = `plot-${Date.now()}`;
    const anchorDate = input.mode === 'reverse' ? input.endDate : input.startDate;
    const generatedStages = generateStagesForPlot(plotId, anchorDate, {
      mode: input.mode,
      bedroomSize: input.bedroomSize,
      houseTypeId: input.houseTypeId,
    });
    const firstStage = generatedStages[0];
    const lastStage = generatedStages[generatedStages.length - 1];
    const newPlot: PlotProgramme = {
      id: plotId,
      plotName: input.plotName.trim(),
      phase: input.phase.trim().toUpperCase(),
      houseTypeId: input.houseTypeId,
      startDate: firstStage?.startDate || input.startDate || anchorDate,
      endDate: lastStage?.endDate || input.endDate || anchorDate,
      mode: input.mode,
      isLocked: true,
      sharedWithUserIds: [],
      holdStatus: 'Active',
    };
    const nextPlots = [...plotProgrammes, newPlot];
    const nextStages = [...plotStages, ...generatedStages];
    setPlotProgrammes(nextPlots);
    setPlotStages(nextStages);
    await Promise.all([
      AsyncStorage.setItem(PLOTS_KEY, JSON.stringify(nextPlots)),
      AsyncStorage.setItem(STAGES_KEY, JSON.stringify(nextStages)),
    ]);
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
    const template = getInspectionTemplateForStage(stage.stageName);
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
      items: createChecklistItems(stage),
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

  const value = useMemo(
    () => ({
      plotProgrammes,
      plotStages,
      inspections,
      defects,
      isLoaded,
      createPlot,
      updateStageStatus,
      startInspectionForStage,
      updateInspectionItem,
      completeInspection,
      updateDefect,
    }),
    [plotProgrammes, plotStages, inspections, defects, isLoaded],
  );

  return <ProgrammeContext.Provider value={value}>{children}</ProgrammeContext.Provider>;
}

export function useProgrammeData() {
  const context = useContext(ProgrammeContext);
  if (!context) throw new Error('useProgrammeData must be used within ProgrammeDataProvider');
  return context;
}
