import { ActivityDelay, DAY_NAMES, getTradeCellText, SitePlot, TRADE_ORDER } from './siteProgrammeEngine';

type TradeContactLike = {
  trade: string;
  contractor: string;
  supervisorName: string;
  supervisorEmail: string;
  supervisorPhone: string;
};

function rowText(cells: string[]) {
  return cells.map((cell) => cell || '-').join(' | ');
}

export function createTradeProgrammeText(input: {
  trade: string;
  plots: SitePlot[];
  activityDelays: ActivityDelay[];
  startWeek: number;
}) {
  const { trade, plots, activityDelays, startWeek } = input;
  const header = rowText(['Plot', ...DAY_NAMES, ...DAY_NAMES]);
  const divider = rowText(['---', '---', '---', '---', '---', '---', '---', '---', '---', '---', '---']);
  const rows = plots
    .map((plot) => {
      const cells = [startWeek, startWeek + 1].flatMap((week) =>
        DAY_NAMES.map((_, dayIndex) => getTradeCellText(plot, trade, week, dayIndex + 1, activityDelays).replace(/\n/g, ' / ')),
      );
      const hasWork = cells.some(Boolean);
      return hasWork ? rowText([plot.plotNo, ...cells]) : '';
    })
    .filter(Boolean);

  return [`${trade} 2-Week Programme`, `WK${String(startWeek).padStart(2, '0')} + WK${String(startWeek + 1).padStart(2, '0')}`, '', header, divider, ...(rows.length ? rows : ['No planned activity for this trade in this 2-week window.'])].join('\n');
}

export function createManagerProgrammeText(input: {
  plots: SitePlot[];
  activityDelays: ActivityDelay[];
  startWeek: number;
  tradeContacts: TradeContactLike[];
}) {
  const { plots, activityDelays, startWeek, tradeContacts } = input;
  const sections = TRADE_ORDER.map((trade) => createTradeProgrammeText({ trade, plots, activityDelays, startWeek }));
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
