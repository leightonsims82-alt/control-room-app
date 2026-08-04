import AsyncStorage from '@react-native-async-storage/async-storage';
import { PROGRAMME_STAGE_SEQUENCE } from './siteProgrammeEngine';

const STAGE_CONFIGURATION_KEY = 'programme-buddy:stage-configuration:v1';
export const MAX_PROGRAMME_STAGES = 40;

export type ConfiguredProgrammeStage = {
  stage: number;
  label: string;
  startWeek: number;
  finishWeek: number;
};

function clampStageCount(value: number) {
  if (!Number.isFinite(value)) return PROGRAMME_STAGE_SEQUENCE.length;
  return Math.min(MAX_PROGRAMME_STAGES, Math.max(1, Math.round(value)));
}

function hasValidRequestedCount(value?: number) {
  return Number.isFinite(value) && Number(value) > 0;
}

function defaultStage(stage: number, previous?: ConfiguredProgrammeStage): ConfiguredProgrammeStage {
  const standard = PROGRAMME_STAGE_SEQUENCE.find((item) => item.stage === stage);
  if (standard) return { ...standard };
  const startWeek = Math.max(1, (previous?.finishWeek ?? PROGRAMME_STAGE_SEQUENCE.at(-1)?.finishWeek ?? 0) + 1);
  return { stage, label: `Stage ${stage}`, startWeek, finishWeek: startWeek };
}

export function normaliseStageConfiguration(input: ConfiguredProgrammeStage[], requestedCount?: number) {
  const source = Array.isArray(input) ? input : [];
  const count = clampStageCount(hasValidRequestedCount(requestedCount) ? Number(requestedCount) : source.length || PROGRAMME_STAGE_SEQUENCE.length);
  const normalised: ConfiguredProgrammeStage[] = [];

  for (let index = 0; index < count; index += 1) {
    const stage = index + 1;
    const existing = source.find((item) => Number(item.stage) === stage);
    const fallback = defaultStage(stage, normalised[index - 1]);
    const startWeek = Math.max(1, Math.round(Number(existing?.startWeek) || fallback.startWeek));
    const finishWeek = Math.max(startWeek, Math.round(Number(existing?.finishWeek) || fallback.finishWeek));
    normalised.push({
      stage,
      label: existing?.label?.trim() || fallback.label,
      startWeek,
      finishWeek,
    });
  }

  return normalised;
}

export async function readStageConfiguration(configuredCount?: number) {
  const stored = await AsyncStorage.getItem(STAGE_CONFIGURATION_KEY);
  const requestedCount = hasValidRequestedCount(configuredCount) ? Number(configuredCount) : undefined;

  if (!stored) {
    const initial = normaliseStageConfiguration(PROGRAMME_STAGE_SEQUENCE, requestedCount ?? PROGRAMME_STAGE_SEQUENCE.length);
    await AsyncStorage.setItem(STAGE_CONFIGURATION_KEY, JSON.stringify(initial));
    return initial;
  }

  const parsed = JSON.parse(stored) as ConfiguredProgrammeStage[];
  const normalised = normaliseStageConfiguration(parsed, requestedCount ?? parsed.length);
  await AsyncStorage.setItem(STAGE_CONFIGURATION_KEY, JSON.stringify(normalised));
  return normalised;
}

export async function saveStageConfiguration(stages: ConfiguredProgrammeStage[]) {
  const normalised = normaliseStageConfiguration(stages, stages.length);
  await AsyncStorage.setItem(STAGE_CONFIGURATION_KEY, JSON.stringify(normalised));
  return normalised;
}

export function resizeStageConfiguration(stages: ConfiguredProgrammeStage[], count: number) {
  return normaliseStageConfiguration(stages, count);
}

export function getConfiguredStageForRelativeWeek(stages: ConfiguredProgrammeStage[], relativeWeek: number) {
  if (!Number.isFinite(relativeWeek) || relativeWeek < 1) return undefined;
  return stages
    .filter((stage) => relativeWeek >= stage.startWeek && relativeWeek <= stage.finishWeek)
    .sort((first, second) => second.stage - first.stage)[0];
}
