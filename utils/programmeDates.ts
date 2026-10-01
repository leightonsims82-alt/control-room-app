import { isUnscheduledProgrammeWeek } from './programmeDateReset';

const DEFAULT_START_DATE = '05/01/2026';
const DAY_MS = 24 * 60 * 60 * 1000;

function makeUtcDate(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date : null;
}

export function parseProgrammeDate(value?: string) {
  const clean = value?.trim() ?? '';
  const british = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(clean);
  if (british) return makeUtcDate(Number(british[3]), Number(british[2]), Number(british[1]));
  const legacyIso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(clean);
  if (legacyIso) return makeUtcDate(Number(legacyIso[1]), Number(legacyIso[2]), Number(legacyIso[3]));
  return null;
}

export function formatBritishDate(date: Date) {
  return `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${date.getUTCFullYear()}`;
}

export function normaliseBritishDate(value?: string) {
  const date = parseProgrammeDate(value);
  return date ? formatBritishDate(date) : '';
}

export function isMondayProgrammeDate(value?: string) {
  return parseProgrammeDate(value)?.getUTCDay() === 1;
}

export function validateWeekOneDate(value?: string) {
  if (!parseProgrammeDate(value)) return 'Enter a valid Week 1 commencement date in DD/MM/YYYY format.';
  if (!isMondayProgrammeDate(value)) return 'Week 1 commencement date must be a Monday.';
  return '';
}

export function getProgrammeDate(programmeStartDate: string | undefined, week: number, day = 1) {
  const start = parseProgrammeDate(programmeStartDate) ?? parseProgrammeDate(DEFAULT_START_DATE)!;
  return new Date(start.getTime() + ((week - 1) * 7 + (day - 1)) * DAY_MS);
}

export function formatProgrammeDate(programmeStartDate: string | undefined, week: number, day = 1) {
  if (isUnscheduledProgrammeWeek(week)) return '';
  return formatBritishDate(getProgrammeDate(programmeStartDate, week, day));
}

export function getProgrammeWeekForDate(programmeStartDate: string | undefined, completionDate: string) {
  const start = parseProgrammeDate(programmeStartDate);
  const completion = parseProgrammeDate(completionDate);
  if (!start || !completion || completion.getTime() < start.getTime()) return null;
  return Math.floor((completion.getTime() - start.getTime()) / (7 * DAY_MS)) + 1;
}

export function validatePlotCompletionDate(programmeStartDate: string | undefined, completionDate: string) {
  if (!parseProgrammeDate(completionDate)) return 'Enter a valid Plot Completion Date in DD/MM/YYYY format.';
  if (!parseProgrammeDate(programmeStartDate)) return 'Set a valid Week 1 commencement date in Site Setup first.';
  if (getProgrammeWeekForDate(programmeStartDate, completionDate) === null) return 'Plot Completion Date cannot be before Week 1 commencement date.';
  return '';
}

export function formatProgrammeDayHeader(programmeStartDate: string | undefined, week: number, dayName: string, day: number, compact = false) {
  const date = formatProgrammeDate(programmeStartDate, week, day);
  return compact ? `${dayName}\n${date}` : `WK${String(week).padStart(2, '0')} ${dayName}\n${date}`;
}

export function getCurrentProgrammeWeek(programmeStartDate: string | undefined) {
  const start = parseProgrammeDate(programmeStartDate);
  if (!start) return 1;
  const today = makeUtcDate(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate())!;
  return Math.max(1, Math.floor((today.getTime() - start.getTime()) / (7 * DAY_MS)) + 1);
}

export function getProgrammeStartDateValue(value?: string) {
  return normaliseBritishDate(value) || DEFAULT_START_DATE;
}
