import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { plotProgrammes as demoPlotProgrammes, plotStages as demoPlotStages, stageTemplates } from './demoData';
import { PlotProgramme, PlotStage, StageStatus } from '../types/models';

const PLOTS_STORAGE_KEY = 'siteprog:plot-programmes:v1';
const STAGES_STORAGE_KEY = 'siteprog:plot-stages:v1';

export type CreatePlotInput = {
  plotName: string;
  phase: string;
  houseTypeId: string;
  startDate: string;
  endDate: string;
  mode: PlotProgramme['mode'];
};

type ProgrammeStore = {
  plotProgrammes: PlotProgramme[];
  plotStages: PlotStage[];
  isLoaded: boolean;
  createPlot: (input: CreatePlotInput) => Promise<PlotProgramme>;
  updateStageStatus: (stageId: string, status: StageStatus) => Promise<void>;
};

const ProgrammeContext = createContext<ProgrammeStore | undefined>(undefined);

export function ProgrammeDataProvider({ children }: PropsWithChildren) {
  const [plotProgrammes, setPlotProgrammes] = useState<PlotProgramme[]>(demoPlotProgrammes);
  const [plotStages, setPlotStages] = useState<PlotStage[]>(demoPlotStages);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadProgrammeData() {
      try {
        const [storedPlots, storedStages] = await Promise.all([
          AsyncStorage.getItem(PLOTS_STORAGE_KEY),
          AsyncStorage.getItem(STAGES_STORAGE_KEY),
        ]);

        if (storedPlots) {
          const parsedPlots = JSON.parse(storedPlots) as PlotProgramme[];
          if (isMounted) setPlotProgrammes(parsedPlots);
        } else {
          await AsyncStorage.setItem(PLOTS_STORAGE_KEY, JSON.stringify(demoPlotProgrammes));
          if (isMounted) setPlotProgrammes(demoPlotProgrammes);
        }

        if (storedStages) {
          const parsedStages = JSON.parse(storedStages) as PlotStage[];
          if (isMounted) setPlotStages(parsedStages);
        } else {
          await AsyncStorage.setItem(STAGES_STORAGE_KEY, JSON.stringify(demoPlotStages));
          if (isMounted) setPlotStages(demoPlotStages);
        }
      } catch (error) {
        console.warn('Unable to load stored programme data', error);
        if (isMounted) {
          setPlotProgrammes(demoPlotProgrammes);
          setPlotStages(demoPlotStages);
        }
      } finally {
        if (isMounted) setIsLoaded(true);
      }
    }

    loadProgrammeData();

    return () => {
      isMounted = false;
    };
  }, []);

  const createPlot = useCallback(async (input: CreatePlotInput) => {
    const plotId = `plot-${Date.now()}`;
    const newPlot: PlotProgramme = {
      id: plotId,
      plotName: input.plotName,
      phase: input.phase,
      houseTypeId: input.houseTypeId,
      startDate: input.startDate,
      endDate: input.endDate,
      mode: input.mode,
      isLocked: false,
      holdStatus: 'Active',
    };

    const generatedStages = buildStagesFromTemplate(plotId, input.startDate);
    const nextPlots = [...plotProgrammes, newPlot];
    const nextStages = [...plotStages, ...generatedStages];

    setPlotProgrammes(nextPlots);
    setPlotStages(nextStages);

    try {
      await AsyncStorage.multiSet([
        [PLOTS_STORAGE_KEY, JSON.stringify(nextPlots)],
        [STAGES_STORAGE_KEY, JSON.stringify(nextStages)],
      ]);
    } catch (error) {
      console.warn('Unable to save new plot', error);
    }

    return newPlot;
  }, [plotProgrammes, plotStages]);

  const updateStageStatus = useCallback(async (stageId: string, status: StageStatus) => {
    const nextStages = plotStages.map((stage) => (stage.id === stageId ? { ...stage, status } : stage));
    setPlotStages(nextStages);

    try {
      await AsyncStorage.setItem(STAGES_STORAGE_KEY, JSON.stringify(nextStages));
    } catch (error) {
      console.warn('Unable to save plot stage status', error);
    }
  }, [plotStages]);

  const value = useMemo(
    () => ({ plotProgrammes, plotStages, isLoaded, createPlot, updateStageStatus }),
    [plotProgrammes, plotStages, isLoaded, createPlot, updateStageStatus],
  );

  return <ProgrammeContext.Provider value={value}>{children}</ProgrammeContext.Provider>;
}

export function useProgrammeData() {
  const context = useContext(ProgrammeContext);

  if (!context) {
    throw new Error('useProgrammeData must be used within ProgrammeDataProvider');
  }

  return context;
}

function buildStagesFromTemplate(plotProgrammeId: string, startDate: string): PlotStage[] {
  let nextStartDate = startDate;

  return stageTemplates.map((template) => {
    const stageStartDate = nextStartDate;
    const stageEndDate = addDays(stageStartDate, template.durationDays - 1);
    nextStartDate = addDays(stageEndDate, 3);

    return {
      id: `${plotProgrammeId}-stage-${template.order}`,
      plotProgrammeId,
      stageName: template.name,
      trade: template.trade,
      order: template.order,
      startDate: stageStartDate,
      endDate: stageEndDate,
      durationDays: template.durationDays,
      delayDays: 0,
      status: template.order === 1 ? 'In progress' : 'Not started',
      holdStatus: 'Active',
      isKeyStage: Boolean(template.isKeyStage),
      inspectionStatus: template.isKeyStage ? 'Pending' : 'Not applicable',
    };
  });
}

function addDays(dateValue: string, days: number) {
  const date = new Date(`${dateValue}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
