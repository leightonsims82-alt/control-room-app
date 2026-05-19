import { defaultStageTemplates } from '../data/defaultStageTemplates';
import { PlotStage } from '../types/models';

function addDays(dateValue: string, days: number) {
  const date = new Date(`${dateValue}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function generateStagesForPlot(plotId: string, startDate: string): PlotStage[] {
  let cursor = startDate;

  return defaultStageTemplates.map((template) => {
    const stageStart = cursor;
    const stageEnd = addDays(stageStart, Math.max(template.durationDays - 1, 0));
    cursor = addDays(stageEnd, 1);

    return {
      id: `${plotId}-stage-${template.order}`,
      plotProgrammeId: plotId,
      stageName: template.name,
      trade: template.trade,
      order: template.order,
      startDate: stageStart,
      endDate: stageEnd,
      durationDays: template.durationDays,
      delayDays: 0,
      status: 'Not started',
      holdStatus: 'Active',
      isKeyStage: Boolean(template.isKeyStage),
      inspectionStatus: template.isKeyStage ? 'Pending' : 'Not applicable',
    };
  });
}
