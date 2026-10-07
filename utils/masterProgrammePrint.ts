export type MasterPaperSize = 'A3' | 'A4';
export type MasterPrintRow = {
  sequence: number; plot: string; route: string; houseType: string;
  start: string; completion: string; stages: (string | number)[];
};
export type MasterPrintInput = {
  paperSize: MasterPaperSize; siteName: string;
  weeks: { label: string; date: string }[];
  rows: MasterPrintRow[];
  stageKey: { stage: number; label: string }[];
};

function escape(value: string | number) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]!);
}

/** Print the full live matrix, independent of scrolling or screen pagination. */
export function buildMasterPrintDocument(input: MasterPrintInput) {
  const paper = input.paperSize === 'A4' ? 'A4' : 'A3';
  const weekCount = Math.ceil(input.weeks.length / 23);
  const rowPageCount = Math.ceil(input.rows.length / 30);
  const pageCount = rowPageCount * weekCount;
  const generated = new Date().toLocaleDateString('en-GB');
  const makeHeading = (weeks: MasterPrintInput['weeks']) => '<th>Seq</th><th>Plot</th><th>Route</th><th>House type</th><th>Start</th><th>Completion</th>'
    + weeks.map((week) => `<th>${escape(week.label)}<br><span>${escape(week.date)}</span></th>`).join('');
  const key = input.stageKey.map((stage) => `<span><b>${escape(stage.stage)}</b> ${escape(stage.label)}</span>`).join('');
  const pages = Array.from({ length: pageCount }, (_, index) => {
    const rowPage = Math.floor(index / weekCount);
    const weekPage = index % weekCount;
    const firstWeek = weekPage * 23;
    const weeks = input.weeks.slice(firstWeek, firstWeek + 23);
    const rows = input.rows.slice(rowPage * 30, (rowPage + 1) * 30);
    const body = rows.map((row) => '<tr>'
      + [row.sequence, row.plot, row.route, row.houseType, row.start, row.completion]
        .map((value) => `<td>${escape(value)}</td>`).join('')
      + row.stages.slice(firstWeek, firstWeek + 23).map((stage) => `<td class="${String(stage).includes('H') ? 'held' : stage ? 'active' : ''}">${escape(stage)}</td>`).join('')
      + '</tr>').join('');
    return `<section class="sheet"><header><h1>${escape(input.siteName || 'Site')} — Master Programme</h1>
      <div>${paper} landscape · ${input.rows.length} plots · Printed ${generated} · Page ${index + 1} of ${pageCount}<br>${escape(weeks[0]?.date ?? "")} – ${escape(weeks.at(-1)?.date ?? "")}</div></header>
      <table><colgroup><col style="width:3%"><col style="width:4%"><col style="width:6%"><col style="width:8%"><col style="width:5%"><col style="width:7%">${weeks.map(() => '<col>').join('')}</colgroup>
      <thead><tr>${makeHeading(weeks)}</tr></thead><tbody>${body}</tbody></table>
      <footer><div class="key">${key}<span><b>H</b> Held at stage</span></div>
      <div>Plots ${rowPage * 30 + 1}–${rowPage * 30 + rows.length} · Date section ${weekPage + 1} of ${weekCount} · Programme Buddy · Page ${index + 1} of ${pageCount}</div></footer></section>`;
  }).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>Master Programme — ${escape(input.siteName)}</title>
  <style>
    @page { size: ${paper} landscape; margin: 8mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, sans-serif; color: #172b40; }
    .sheet { break-after: page; page-break-after: always; }
    .sheet:last-child { break-after: auto; page-break-after: auto; }
    header { margin-bottom: 3mm; font-size: 8pt; }
    h1 { font-size: 15pt; margin: 0 0 1.5mm; }
    table { width: 100%; table-layout: fixed; border-collapse: collapse; }
    th, td { border: 0.2mm solid #9baabd; text-align: center; overflow-wrap: anywhere; }
    th { padding: 1mm 0.3mm; font-size: ${paper === 'A4' ? '5.5' : '7'}pt; background: #173b5f; color: white; }
    th span { font-weight: normal; }
    td { height: ${paper === 'A4' ? '4.3' : '6'}mm; padding: 0.3mm; font-size: ${paper === 'A4' ? '6' : '8'}pt; }
    tr { break-inside: avoid; page-break-inside: avoid; }
    .active { background: #dff0ff; } .held { background: #fee2e2; color: #991b1b; font-weight: bold; }
    footer { font-size: 6.5pt; margin-top: 2mm; }
    .key { display: flex; flex-wrap: wrap; gap: 1mm 3mm; margin-bottom: 2mm; }
    .toolbar { padding: 12px; background: #eef3f8; font-size: 14px; }
    button { padding: 8px 16px; cursor: pointer; }
    @media screen { .sheet { width: ${paper === 'A4' ? '281' : '404'}mm; margin: 8mm auto; } }
    @media print { .toolbar { display: none; } body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
  </style></head><body><div class="toolbar"><button onclick="window.print()">Print / Save as PDF</button>
  Select ${paper}, landscape, all pages, and turn off browser headers and footers.</div>${pages}</body></html>`;
}

export function printMasterProgramme(input: MasterPrintInput): string | null {
  if (!input.rows.length) return 'There are no plots to print.';
  if (typeof window === 'undefined' || typeof window.open !== 'function') return 'Open Programme Buddy in a web browser to print.';
  const preview = window.open('', '_blank');
  if (!preview) return 'Allow pop-ups for Programme Buddy, then try printing again.';
  preview.document.open();
  preview.document.write(buildMasterPrintDocument(input));
  preview.document.close();
  preview.focus();
  // Keep the preview open so users can retry or save the same pages as a PDF.
  preview.setTimeout(() => { preview.print(); }, 300);
  return null;
}
