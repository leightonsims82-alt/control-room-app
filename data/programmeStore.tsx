import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { plotProgrammes, plotStages as demoPlotStages } from './demoData';
import { PlotStage, StageStatus } from '../types/models';

const STORAGE_KEY = 'siteprog:plot-stages:v1';

type ProgrammeStore = {
  plotProgrammes: typeof plotProgrammes;
  plotStages: PlotStage[];
  isLoaded: boolean;
  updateStageStatus: (stageId: string, status: StageStatus) => Promise<void>;
};

const ProgrammeContext = createContext<ProgrammeStore | undefined>(undefined);

export function ProgrammeDataProvider({ children }: PropsWithChildren) {
  const [plotStages, setPlotStages] = useState<PlotStage[]>(demoPlotStages);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadPlotStages() {
      try {
        const storedStages = await AsyncStorage.getItem(STORAGE_KEY);

        if (storedStages) {
          const parsedStages = JSON.parse(storedStages) as PlotStage[];
          if (isMounted) setPlotStages(parsedStages);
          return;
        }

        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(demoPlotStages));
        if (isMounted) setPlotStages(demoPlotStages);
      } catch (error) {
        console.warn('Unable to load stored plot stages', error);
        if (isMounted) setPlotStages(demoPlotStages);
      } finally {
        if (isMounted) setIsLoaded(true);
      }
    }

    loadPlotStages();

    return () => {
      isMounted = false;
    };
  }, []);

  const updateStageStatus = async (stageId: string, status: StageStatus) => {
    const nextStages = plotStages.map((stage) => (stage.id === stageId ? { ...stage, status } : stage));
    setPlotStages(nextStages);

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextStages));
    } catch (error) {
      console.warn('Unable to save plot stage status', error);
    }
  };

  const value = useMemo(
    () => ({ plotProgrammes, plotStages, isLoaded, updateStageStatus }),
    [plotStages, isLoaded],
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
