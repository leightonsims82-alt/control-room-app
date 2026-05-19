import { getDefaultStageTemplates } from '../data/defaultStageTemplates';
import { BedroomSize, PlotStage } from '../types/models';
import { addWorkingDays, subtractWorkingDays } from './workingDayLogic';
import { resolveStageTrade } from './stageTradeMapping';

type GenerationOptions = {
  bedroomSize?: BedroomSize | number;
  houseTypeId?: string;
  mode?: 'forward' | 'reverse';
};

function getInspectionWindow(stageEnd: string) {
  return {
    inspectionWindowStart: stageEnd,
    inspectionWindowEnd: addWorkingDays(stageEnd, 2),
  };
}

function buildStage(plotId: string, template: ReturnType<typeof getDefaultStageTemplates>[number], stageStart: string, stageEnd: string): PlotStage {
  const isKeyStage = Boolean(template.isKeyStage);
  return {
    id: `${plotId}-stage-${template.order}`,
    plotProgrammeId: plotId,
    stageName: template.name,
    trade: resolveStageTrade(template.name, template.trade),
    order: template.order,
    startDate: stageStart,
    endDate: stageEnd,
    durationDays: template.durationDays,
    delayDays: 0,
    status: 'Not started',
    holdStatus: 'Active',
    isKeyStage,
    inspectionStatus: isKeyStage ? 'Ready for inspection' : 'Not applicable',
    ...(isKeyStage ? getInspectionWindow(stageEnd) : {}),
  };
}

export function generateStagesForPlot(plotId: string, dateValue: string, options: GenerationOptions | 'forward' | 'reverse' = {}): PlotStage[] {
  const resolvedOptions: GenerationOptions = typeof options === 'string' ? { mode: options } : options;
  const mode = resolvedOptions.mode ?? 'forward';
  const templates = getDefaultStageTemplates(resolvedOptions.bedroomSize, resolvedOptions.houseTypeId);

  if (mode === 'reverse') {
    let cursor = dateValue;
    return templates
      .slice()
      .reverse()
      .map((template) => {
        const stageEnd = cursor;
        const stageStart = subtractWorkingDays(stageEnd, Math.max(template.durationDays - 1, 0));
        cursor = subtractWorkingDays(stageStart, 1);
        return buildStage(plotId, template, stageStart, stageEnd);
      })
      .sort((a, b) => a.order - b.order);
  }

  let cursor = dateValue;
  return templates.map((template) => {
    const stageStart = cursor;
    const stageEnd = addWorkingDays(stageStart, Math.max(template.durationDays - 1, 0));
    cursor = addWorkingDays(stageEnd, 1);
    return buildStage(plotId, template, stageStart, stageEnd);
  });
}
