import { DefectAction, PlotProgramme, PlotStage } from '../types/models';
import { getInspectionTemplateForStage } from './inspectionTemplateResolver';

function escapeCsv(value: string | number | undefined) {
  const text = String(value ?? '');
  if (text.includes(',') || text.includes('\n') || text.includes('"')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function createTradeLookaheadCsv({
  trade,
  plotProgrammes,
  plotStages,
  defects,
}: {
  trade: string;
  plotProgrammes: PlotProgramme[];
  plotStages: PlotStage[];
  defects: DefectAction[];
}) {
  const header = ['Date', 'Plot', 'Phase', 'Stage / activity', 'Trade', 'Inspection / hold point', 'Open actions', 'Notes'];

  const rows = plotStages
    .filter((stage) => stage.trade === trade)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .slice(0, 20)
    .map((stage) => {
      const plot = plotProgrammes.find((item) => item.id === stage.plotProgrammeId);
      const inspection = getInspectionTemplateForStage(stage.stageName);
      const openActions = defects.filter((item) => item.plotStageId === stage.id && item.status !== 'Verified fixed');
      const notes = openActions.map((item) => item.description).join('; ') || 'Confirm labour, materials and access';

      return [
        stage.startDate,
        plot?.plotName ?? 'Plot',
        plot?.phase ?? '',
        stage.stageName,
        stage.trade,
        inspection ? inspection.keyStageName : 'None',
        openActions.length,
        notes,
      ];
    });

  return [header, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n');
}
