import { ActivityDelay, DAY_NAMES, TRADE_ORDER } from './siteProgrammeEngine';
import { DEFAULT_PLOT_TEMPLATES, getTradeTemplateText, PlotTemplate, TemplateSitePlot } from './templateProgramme';

type TradeContactLike = {
  trade: string;
  contractor: string;
  supervisorName: string;
  supervisorEmail: string;
  supervisorPhone: string;
};

type ProgrammeNoteLike = {
  plotId: string;
  trade: string;
  startWeek: number;
  note: string;
};

function rowText(cells: string[]) {
  return cells.map((cell) => cell || '-').join(' | ');
}

function cleanCell(value: string) {
  return value.split('\n').join(' / ');
}

function getNote(plotId: string, trade: string, startWeek: number, notes: ProgrammeNoteLike[] = []) {
  return notes.find((note) => note.plotId === plotId && note.trade === trade && note.startWeek === startWeek)?.note ?? '';
}

export function createTradeProgrammeText(input: {
  trade: string;
  plots: TemplateSitePlot[];
  activityDelays: ActivityDelay[];
  startWeek: number;
  plotTemplates?: PlotTemplate[];
  programmeNotes?: ProgrammeNoteLike[];
}) {
  const { trade, plots, activityDelays, startWeek } = input;
  const plotTemplates = input.plotTemplates ?? DEFAULT_PLOT_TEMPLATES;
  const programmeNotes = input.programmeNotes ?? [];
  const header = rowText(['Plot', ...DAY_NAMES, ...DAY_NAMES, 'Output / Recovery Notes']);
  const divider = rowText(['---', '---', '---', '---', '---', '---', '---', '---', '---', '---', '---', '---']);
  const rows = plots
    .map((plot) => {
      const cells = [startWeek, startWeek + 1].flatMap((week) =>
        DAY_NAMES.map((_, dayIndex) => cleanCell(getTradeTemplateText(plot, trade, week, dayIndex + 1, activityDelays, plotTemplates))),
      );
      const note = getNote(plot.id, trade, startWeek, programmeNotes);
      const hasWork = cells.some(Boolean);
      return hasWork ? rowText([plot.plotNo, ...cells, note]) : '';
    })
    .filter(Boolean);

  return [`${trade} 2-Week Programme`, `WK${String(startWeek).padStart(2, '0')} + WK${String(startWeek + 1).padStart(2, '0')}`, '', header, divider, ...(rows.length ? rows : ['No planned activity for this trade in this 2-week window.'])].join('\n');
}

export function createManagerProgrammeText(input: {
  plots: TemplateSitePlot[];
  activityDelays: ActivityDelay[];
  startWeek: number;
  tradeContacts: TradeContactLike[];
  plotTemplates?: PlotTemplate[];
  programmeNotes?: ProgrammeNoteLike[];
}) {
  const { plots, activityDelays, startWeek, tradeContacts } = input;
  const plotTemplates = input.plotTemplates ?? DEFAULT_PLOT_TEMPLATES;
  const programmeNotes = input.programmeNotes ?? [];
  const sections = TRADE_ORDER.map((trade) => createTradeProgrammeText({ trade, plots, activityDelays, startWeek, plotTemplates, programmeNotes }));
  const contactLines = tradeContacts
    .filter((contact) => contact.supervisorName || contact.contractor || contact.supervisorEmail || contact.supervisorPhone)
    .map((contact) => `${contact.trade}: ${contact.contractor || 'Contractor TBC'} - ${contact.supervisorName || 'Supervisor TBC'} - ${contact.supervisorEmail || 'Email TBC'} - ${contact.supervisorPhone || 'Phone TBC'}`);

  return [
    `Full 2-Week Trade Programme`,
    `WK${String(startWeek).padStart(2, '0')} + WK${String(startWeek + 1).padStart(2, '0')}`,
    '',
    'Issued contacts',
    ...(contactLines.length ? contactLines : ['No trade contacts saved yet.']),
    '',
    sections.join('\n\n'),
  ].join('\n');
}

export function getSavedSupervisorEmails(tradeContacts: TradeContactLike[]) {
  return Array.from(new Set(tradeContacts.map((contact) => contact.supervisorEmail.trim()).filter(Boolean)));
}
