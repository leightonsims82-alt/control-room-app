import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { plotProgrammes as demoPlots, plotStages as demoStages } from './demoData';
import { BedroomSize, PlotProgramme, PlotStage, StageStatus } from '../types/models';
import { generateStagesForPlot } from '../utils/stageGeneration';

const PLOTS_KEY = 'siteprog:plot-programmes:v1';
const STAGES_KEY = 'siteprog:plot-stages:v1';

export type CreatePlotInput = {
  plotName: string;
  phase: string;
  houseTypeId: string;
  bedroomSize?: BedroomSize;
  startDate: string;
  endDate: string;
  mode: 'forward' | 'reverse';
};

type ProgrammeStore = {
  plotProgrammes: PlotProgramme[];
  plotStages: PlotStage[];
  isLoaded: boolean;
  createPlot: (input: CreatePlotInput) => Promise<PlotProgramme>;
  updateStageStatus: (stageId: string, status: StageStatus) => Promise<void>;
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

export function ProgrammeDataProvider({ children }: PropsWithChildren) {
  const [plotProgrammes, setPlotProgrammes] = useState<PlotProgramme[]>(demoPlots);
  const [plotStages, setPlotStages] = useState<PlotStage[]>(demoStages);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const [plots, stages] = await Promise.all([
          readArray<PlotProgramme>(PLOTS_KEY, demoPlots),
          readArray<PlotStage>(STAGES_KEY, demoStages),
        ]);
        if (mounted) {
          setPlotProgrammes(plots);
          setPlotStages(stages);
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

  const value = useMemo(
    () => ({ plotProgrammes, plotStages, isLoaded, createPlot, updateStageStatus }),
    [plotProgrammes, plotStages, isLoaded],
  );

  return <ProgrammeContext.Provider value={value}>{children}</ProgrammeContext.Provider>;
}

export function useProgrammeData() {
  const context = useContext(ProgrammeContext);
  if (!context) throw new Error('useProgrammeData must be used within ProgrammeDataProvider');
  return context;
}
