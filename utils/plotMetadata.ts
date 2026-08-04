import AsyncStorage from '@react-native-async-storage/async-storage';

const PLOT_METADATA_KEY = 'programme-buddy:plot-metadata:v1';

export type PlotBuildRoute = 'Traditional' | 'Timber Frame';

export type PlotMetadata = {
  plotNo: string;
  houseTypeName: string;
  bedroomTemplateId: string;
  buildRoute: PlotBuildRoute;
};

export type PlotMetadataMap = Record<string, PlotMetadata>;

export function getPlotMetadataKey(plotNo: string) {
  return plotNo.trim().toLowerCase();
}

export async function readPlotMetadata(): Promise<PlotMetadataMap> {
  const stored = await AsyncStorage.getItem(PLOT_METADATA_KEY);
  if (!stored) return {};
  try {
    return JSON.parse(stored) as PlotMetadataMap;
  } catch {
    return {};
  }
}

export async function savePlotMetadata(input: PlotMetadata): Promise<PlotMetadataMap> {
  const current = await readPlotMetadata();
  const key = getPlotMetadataKey(input.plotNo);
  const next = {
    ...current,
    [key]: {
      ...input,
      plotNo: input.plotNo.trim(),
      houseTypeName: input.houseTypeName.trim(),
    },
  };
  await AsyncStorage.setItem(PLOT_METADATA_KEY, JSON.stringify(next));
  return next;
}

export async function removePlotMetadata(plotNo: string): Promise<PlotMetadataMap> {
  const current = await readPlotMetadata();
  const key = getPlotMetadataKey(plotNo);
  const next = Object.fromEntries(Object.entries(current).filter(([storedKey]) => storedKey !== key));
  await AsyncStorage.setItem(PLOT_METADATA_KEY, JSON.stringify(next));
  return next;
}

export async function clearPlotMetadata() {
  await AsyncStorage.removeItem(PLOT_METADATA_KEY);
}
