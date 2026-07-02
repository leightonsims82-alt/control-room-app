export const INSPECTION_RESULTS_KEY = 'programme-buddy:inspection-results:v1';
export const INSPECTION_STORY_KEY = 'programme-buddy:plot-inspection-story:v1';
export const CUSTOM_INSPECTION_ITEMS_KEY = 'programme-buddy:inspection-custom-items:v1';

export type PlotInspectionStoryStatus = 'Passed' | 'Failed' | 'Incomplete';

export type PlotInspectionStoryRecord = {
  id: string;
  plotId: string;
  checklistId: string;
  checklistTitle: string;
  activityCode?: string;
  trade?: string;
  status: PlotInspectionStoryStatus;
  completedCount: number;
  itemCount: number;
  failCount: number;
  completedAt: string;
};

export function getLatestInspectionForActivity(records: PlotInspectionStoryRecord[], plotId: string, activityCode: string) {
  return records
    .filter((record) => record.plotId === plotId && record.activityCode === activityCode)
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())[0];
}

export function getInspectionStatusLabel(record?: PlotInspectionStoryRecord) {
  if (!record) return 'Inspect';
  if (record.status === 'Passed') return 'Passed';
  if (record.status === 'Failed') return 'Failed';
  return 'Incomplete';
}

export function getInspectionStats(records: PlotInspectionStoryRecord[]) {
  const passed = records.filter((record) => record.status === 'Passed').length;
  const failed = records.filter((record) => record.status === 'Failed').length;
  const incomplete = records.filter((record) => record.status === 'Incomplete').length;
  const reinspectionDue = failed + incomplete;
  const plotsWithQa = new Set(records.map((record) => record.plotId)).size;
  return {
    total: records.length,
    passed,
    failed,
    incomplete,
    reinspectionDue,
    plotsWithQa,
  };
}

export function createPlotQaStoryExport(input: {
  plotNo: string;
  houseType: string;
  records: PlotInspectionStoryRecord[];
}) {
  const rows = input.records
    .slice()
    .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime())
    .map((record) => {
      const date = new Date(record.completedAt).toLocaleDateString('en-GB');
      return `${date} | ${record.checklistTitle} | ${record.activityCode || 'Manual QA'} | ${record.trade || 'Trade TBC'} | ${record.status} | ${record.completedCount}/${record.itemCount} checked | ${record.failCount} failed`;
    });

  return [
    `Plot QA Story`,
    `Plot: ${input.plotNo}`,
    `House type: ${input.houseType}`,
    '',
    ...(rows.length ? rows : ['No QA records saved for this plot yet.']),
  ].join('\n');
}
