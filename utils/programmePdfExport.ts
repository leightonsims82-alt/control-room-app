import { MasterPaperSize, printMasterProgramme } from './masterProgrammePrint';
import { ActivityDelay, PROGRAMME_STAGE_SEQUENCE } from './siteProgrammeEngine';
import { formatCalendarWeek, formatProgrammeDate, getCurrentProgrammeWeek } from './programmeDates';
import {
  getActivitiesForTemplateDay,
  getMasterProgrammeWeeks,
  getLiveStageNumbersForPlotWeek,
  getPlotBuildOrder,
  getSortedSitePlots,
  getPlotCompletionProgrammeWeek,
  getStage1StartWeekForPlot,
  getHouseTypeTemplates,
  getTemplateForPlot,
  normaliseProgrammeWeek,
  ActivityMove,
  PlotTemplate,
  TemplateSitePlot,
} from './templateProgramme';

const PROGRAMME_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

function escapeHtml(value: string | number | undefined | null) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildTwoWeekWindow(startWeek: number, programmeStartDate: string) {
  const baseIndex = (normaliseProgrammeWeek(startWeek) - 1) * 7;
  return Array.from({ length: 14 }, (_, columnIndex) => {
    const absoluteDayIndex = baseIndex + columnIndex;
    const week = normaliseProgrammeWeek(Math.floor(absoluteDayIndex / 7) + 1);
    const dayIndex = ((absoluteDayIndex % 7) + 7) % 7;
    return {
      key: `${absoluteDayIndex}-${columnIndex}`,
      week,
      day: dayIndex + 1,
      dayIndex,
      dayName: PROGRAMME_DAYS[dayIndex],
      date: formatProgrammeDate(programmeStartDate, week, dayIndex + 1),
      weekend: dayIndex >= 5,
    };
  });
}

function baseDocument(title: string, body: string) {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  @page { size: A3 landscape; margin: 10mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 0; }
  h1 { margin: 0 0 4px; font-size: 22px; }
  h2 { margin: 18px 0 8px; font-size: 16px; }
  .meta { color: #64748b; font-size: 11px; margin-bottom: 12px; }
  .section { page-break-inside: avoid; margin-bottom: 18px; }
  .page-break { page-break-before: always; }
  table { border-collapse: collapse; width: 100%; table-layout: fixed; }
  th { background: #173b5f; color: white; font-size: 8px; padding: 5px 3px; border: 1px solid #9fb6ce; text-align: center; }
  td { font-size: 8px; font-weight: 700; padding: 5px 3px; border: 1px solid #c8d7e6; text-align: center; vertical-align: middle; min-height: 22px; }
  .left { text-align: left; }
  .week { background: #173b5f; color: white; font-weight: 900; }
  .planned { background: #dbeafe; }
  .trade-planned { background: #fff4cc; }
  .weekend { background: #f8fafc; color: #94a3b8; }
  .small { font-size: 7px; }
  .footer { margin-top: 10px; color: #64748b; font-size: 9px; }
</style>
</head>
<body>${body}<script>setTimeout(function(){ window.print(); }, 300);</script></body>
</html>`;
}

function openPrintablePdf(title: string, htmlBody: string) {
  if (typeof window === 'undefined') return false;
  const printWindow = window.open('', '_blank');
  if (!printWindow) return false;
  printWindow.document.open();
  printWindow.document.write(baseDocument(title, htmlBody));
  printWindow.document.close();
  return true;
}

function cellActivities(plot: TemplateSitePlot, week: number, day: number, delays: ActivityDelay[], moves: ActivityMove[], templates: PlotTemplate[], programmeStartDate: string, trade?: string) {
  return getActivitiesForTemplateDay(plot, week, day, delays, templates, { programmeStartDate }, moves)
    .filter((activity) => !trade || activity.trade === trade)
    .map((activity) => activity.displayText || activity.code)
    .join('<br/>');
}

export function exportMainTwoWeekPdf(input: { siteName: string; programmeStartDate: string; calendarWeekOne?: number; startWeek: number; plots: TemplateSitePlot[]; delays: ActivityDelay[]; moves?: ActivityMove[]; templates: PlotTemplate[] }) {
  const windowDays = buildTwoWeekWindow(input.startWeek, input.programmeStartDate);
  const weekOne = windowDays[0].week;
  const weekTwo = windowDays[7].week;
  const dateRange = `${windowDays[0].date} - ${windowDays[13].date}`;
  const calendarWeekOne = formatCalendarWeek(input.programmeStartDate, weekOne, input.calendarWeekOne);
  const calendarWeekTwo = formatCalendarWeek(input.programmeStartDate, weekTwo, input.calendarWeekOne);
  const headerWeeks = `<tr><th style="width:70px"></th><th style="width:90px"></th><th colspan="7">${calendarWeekOne}</th><th colspan="7">${calendarWeekTwo}</th></tr>`;
  const headerDays = `<tr><th>Plot</th><th>House Type</th>${windowDays.map((item) => `<th>${item.dayName}<br/><span class="small">${item.date}</span></th>`).join('')}</tr>`;
  const rows = input.plots.map((plot) => {
    const template = getTemplateForPlot(plot, input.templates);
    const houseType = getHouseTypeTemplates(input.templates).find((item) => item.id === (plot.houseTypeId ?? plot.templateId));
    const cells = windowDays.map((item) => {
      const text = item.weekend ? '' : cellActivities(plot, item.week, item.day, input.delays, input.moves ?? [], input.templates, input.programmeStartDate);
      const cls = item.weekend ? 'weekend' : text ? 'planned' : '';
      return `<td class="${cls}">${text}</td>`;
    }).join('');
    return `<tr><td>${escapeHtml(plot.plotNo)}</td><td>${escapeHtml(houseType?.name ?? template.name)}</td>${cells}</tr>`;
  }).join('');

  return openPrintablePdf(
    `${input.siteName} Main 2-Week Programme ${calendarWeekOne}`,
    `<h1>${escapeHtml(input.siteName)} - Main 2-Week Programme</h1><div class="meta">${calendarWeekOne} + ${calendarWeekTwo} | ${escapeHtml(dateRange)}</div><table>${headerWeeks}${headerDays}${rows}</table><div class="footer">Generated by Programme Buddy</div>`,
  );
}

export function exportTradeProgrammesPdf(input: { siteName: string; programmeStartDate: string; calendarWeekOne?: number; startWeek: number; plots: TemplateSitePlot[]; delays: ActivityDelay[]; moves?: ActivityMove[]; templates: PlotTemplate[]; trades: string[] }) {
  const windowDays = buildTwoWeekWindow(input.startWeek, input.programmeStartDate);
  const weekOne = windowDays[0].week;
  const weekTwo = windowDays[7].week;
  const dateRange = `${windowDays[0].date} - ${windowDays[13].date}`;
  const calendarWeekOne = formatCalendarWeek(input.programmeStartDate, weekOne, input.calendarWeekOne);
  const calendarWeekTwo = formatCalendarWeek(input.programmeStartDate, weekTwo, input.calendarWeekOne);
  const headerWeeks = `<tr><th style="width:70px"></th><th style="width:90px"></th><th colspan="7">${calendarWeekOne}</th><th colspan="7">${calendarWeekTwo}</th></tr>`;
  const headerDays = `<tr><th>Plot</th><th>Fix / Stage</th>${windowDays.map((item) => `<th>${item.dayName}<br/><span class="small">${item.date}</span></th>`).join('')}</tr>`;

  const sections = input.trades.map((trade, index) => {
    const rows = input.plots.map((plot) => {
      const cellTexts = windowDays.map((item) => (item.weekend ? '' : cellActivities(plot, item.week, item.day, input.delays, input.moves ?? [], input.templates, input.programmeStartDate, trade)));
      if (!cellTexts.some(Boolean)) return '';
      const firstFix = cellTexts.find(Boolean) ?? '-';
      const cells = cellTexts.map((text, cellIndex) => {
        const item = windowDays[cellIndex];
        const cls = item.weekend ? 'weekend' : text ? 'trade-planned' : '';
        return `<td class="${cls}">${text}</td>`;
      }).join('');
      return `<tr><td>${escapeHtml(plot.plotNo)}</td><td>${firstFix}</td>${cells}</tr>`;
    }).filter(Boolean).join('');
    if (!rows) return '';
    return `<div class="section ${index > 0 ? 'page-break' : ''}"><h1>${escapeHtml(input.siteName)} - ${escapeHtml(trade)} 2-Week Programme</h1><div class="meta">${calendarWeekOne} + ${calendarWeekTwo} | ${escapeHtml(dateRange)}</div><table>${headerWeeks}${headerDays}${rows}</table><div class="footer">Generated by Programme Buddy</div></div>`;
  }).filter(Boolean).join('');

  return openPrintablePdf(`${input.siteName} Trade Programmes ${calendarWeekOne}`, sections || `<h1>${escapeHtml(input.siteName)} - Trade Programmes</h1><p>No trade activity found for this 2-week window.</p>`);
}

export function exportMasterProgrammePdf(input: { siteName: string; programmeStartDate: string; calendarWeekOne?: number; plots: TemplateSitePlot[]; delays?: ActivityDelay[]; moves?: ActivityMove[]; templates: PlotTemplate[]; paperSize?: MasterPaperSize }) {
  const dateSetup = { programmeStartDate: input.programmeStartDate };
  const currentProgrammeWeek = getCurrentProgrammeWeek(input.programmeStartDate);
  const masterWeeks = getMasterProgrammeWeeks(
    input.plots,
    currentProgrammeWeek,
    input.delays ?? [],
    input.moves ?? [],
    input.templates,
    dateSetup,
  );
  return printMasterProgramme({
    paperSize: input.paperSize ?? 'A3',
    siteName: input.siteName,
    weeks: masterWeeks.map((week) => ({
      label: formatCalendarWeek(input.programmeStartDate, week, input.calendarWeekOne),
      date: formatProgrammeDate(input.programmeStartDate, week),
    })),
    stageKey: PROGRAMME_STAGE_SEQUENCE,
    rows: getSortedSitePlots(input.plots).map((plot, index) => {
      const template = getTemplateForPlot(plot, input.templates);
      const houseType = getHouseTypeTemplates(input.templates).find((item) => item.id === (plot.houseTypeId ?? plot.templateId));
      return {
        sequence: getPlotBuildOrder(plot, index), plot: plot.plotNo,
        route: plot.constructionMethod === 'timberFrame' ? 'Timber Frame' : 'Traditional',
        houseType: houseType?.name ?? template.name,
        start: formatCalendarWeek(input.programmeStartDate, getStage1StartWeekForPlot(plot, input.templates, dateSetup), input.calendarWeekOne),
        completion: plot.plotCompletionDate || formatProgrammeDate(input.programmeStartDate, getPlotCompletionProgrammeWeek(plot, dateSetup)),
        stages: masterWeeks.map((week) => getLiveStageNumbersForPlotWeek(plot, week, input.delays ?? [], input.moves ?? [], input.templates, dateSetup)),
      };
    }),
  }) === null;
}
