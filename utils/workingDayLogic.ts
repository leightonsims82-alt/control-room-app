export function addWorkingDays(dateValue: string, days: number) {
  const date = new Date(dateValue + 'T00:00:00');
  let remaining = Math.max(days, 0);
  while (remaining > 0) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    if (day !== 0 && day !== 6) remaining -= 1;
  }
  return date.toISOString().slice(0, 10);
}

export function subtractWorkingDays(dateValue: string, days: number) {
  const date = new Date(dateValue + 'T00:00:00');
  let remaining = Math.max(days, 0);
  while (remaining > 0) {
    date.setDate(date.getDate() - 1);
    const day = date.getDay();
    if (day !== 0 && day !== 6) remaining -= 1;
  }
  return date.toISOString().slice(0, 10);
}

export function isDateRangeValid(startDate: string, endDate: string) {
  return new Date(startDate + 'T00:00:00') <= new Date(endDate + 'T00:00:00');
}
