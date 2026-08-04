const DEFAULT_START_DATE = '2026-01-05';

function parseDate(value?: string) {
  const date = new Date(`${value || DEFAULT_START_DATE}T00:00:00`);
  return Number.isNaN(date.getTime()) ? new Date(`${DEFAULT_START_DATE}T00:00:00`) : date;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function getProgrammeDate(programmeStartDate: string | undefined, week: number, day: number) {
  return addDays(parseDate(programmeStartDate), (week - 1) * 7 + (day - 1));
}

export function formatProgrammeDate(programmeStartDate: string | undefined, week: number, day: number) {
  return getProgrammeDate(programmeStartDate, week, day).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

export function formatProgrammeDayHeader(programmeStartDate: string | undefined, week: number, dayName: string, day: number, compact = false) {
  const date = formatProgrammeDate(programmeStartDate, week, day);
  return compact ? `${dayName}\n${date}` : `WK${String(week).padStart(2, '0')} ${dayName}\n${date}`;
}

export function getProgrammeStartDateValue(value?: string) {
  return value || DEFAULT_START_DATE;
}
