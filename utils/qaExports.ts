import { Platform } from 'react-native';
import { DefectAction, InspectionRecord, PlotProgramme } from '../types/models';

function csvCell(value: unknown) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, rows: unknown[][]) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return false;
  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
  return true;
}

export function exportActionLogCsv(actions: DefectAction[], plots: PlotProgramme[]) {
  const plotFor = (plotId: string) => plots.find((plot) => plot.id === plotId);
  const plotName = (plotId: string) => plotFor(plotId)?.plotName ?? plotId;
  const rows: unknown[][] = [
    ['Plot', 'Plot completion', 'Stage', 'Trade', 'Type', 'Priority', 'Status', 'Description', 'Required action', 'Sent to trade', 'Fixed', 'Created', 'Closed'],
    ...actions.map((action) => [
      plotName(action.plotProgrammeId),
      plotFor(action.plotProgrammeId)?.endDate ?? '',
      action.stage,
      action.trade,
      action.type,
      action.priority,
      action.status,
      action.description,
      action.requiredAction,
      action.sentToTrade ? 'Yes' : 'No',
      action.fixed,
      new Date(action.createdAt).toLocaleString('en-GB'),
      action.closedAt ? new Date(action.closedAt).toLocaleString('en-GB') : '',
    ]),
  ];
  return downloadCsv(`siteprog-action-log-${new Date().toISOString().slice(0, 10)}.csv`, rows);
}

export function exportInspectionLogCsv(inspections: InspectionRecord[], plots: PlotProgramme[]) {
  const plotFor = (plotId: string) => plots.find((plot) => plot.id === plotId);
  const plotName = (plotId: string) => plotFor(plotId)?.plotName ?? plotId;
  const rows: unknown[][] = [
    ['Plot', 'Plot completion', 'Inspection', 'Status', 'Started', 'Completed', 'Checks', 'Failed checks', 'Photos'],
    ...inspections.map((inspection) => {
      const failed = inspection.items.filter((item) => item.compliant === 'No').length;
      const photos = inspection.items.filter((item) => item.imageUri || item.fixedImageUri).length;
      return [
        plotName(inspection.plotProgrammeId),
        plotFor(inspection.plotProgrammeId)?.endDate ?? '',
        inspection.templateName,
        inspection.status,
        new Date(inspection.startedAt).toLocaleString('en-GB'),
        inspection.completedAt ? new Date(inspection.completedAt).toLocaleString('en-GB') : '',
        inspection.items.length,
        failed,
        photos,
      ];
    }),
  ];
  return downloadCsv(`siteprog-inspection-log-${new Date().toISOString().slice(0, 10)}.csv`, rows);
}