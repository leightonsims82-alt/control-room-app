import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../components/AppScreen';
import { useSitePlanner } from '../data/sitePlannerStore';
import { formatCalendarWeek, formatProgrammeDate, getCurrentProgrammeWeek } from '../utils/programmeDates';
import { getActivitiesForTemplateDay, isProgrammeWorkingDay } from '../utils/templateProgramme';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SCREEN_DAY_WIDTH = 82;
const PRINT_DAY_WIDTH = 56;

function normaliseWeek(week: number) {
  return Number.isFinite(week) ? Math.max(1, Math.round(week)) : 1;
}

function buildDays(startWeek: number, programmeStartDate: string, includeSaturday = false, includeSunday = false) {
  return Array.from({ length: 14 }, (_, index) => {
    const programmeWeek = normaliseWeek(startWeek + Math.floor(index / 7));
    const day = (index % 7) + 1;
    return {
      key: `${programmeWeek}-${day}-${index}`,
      programmeWeek,
      day,
      name: DAYS[index % 7],
      date: formatProgrammeDate(programmeStartDate, programmeWeek, day),
      nonWorking: !isProgrammeWorkingDay(day, { includeSaturday, includeSunday }),
    };
  });
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function shortActivity(text: string) {
  const lower = text.toLowerCase();
  if (lower.includes('foundation')) return 'FND';
  if (lower.includes('drain')) return 'DNG';
  if (lower.includes('slab')) return 'SLAB';
  if (lower.includes('scaffold')) return 'SCAFF';
  if (lower.includes('brick') || lower.includes('block')) return 'BWK';
  if (lower.includes('roof')) return 'ROOF';
  if (lower.includes('window')) return 'WINDOWS';
  if (lower.includes('plaster')) return 'PLASTER';
  if (lower.includes('decor')) return 'DEC';
  if (lower.includes('first') || lower.includes('1st')) return '1ST FIX';
  if (lower.includes('second') || lower.includes('2nd')) return '2ND FIX';
  return text.length > 12 ? text.slice(0, 12).toUpperCase() : text.toUpperCase();
}

export default function SupervisorView() {
  const params = useLocalSearchParams<{ trade?: string; print?: string }>();
  const { sitePlots, activityDelays, activityMoves, plotTemplates, tradeContacts, siteSetup } = useSitePlanner();
  const requestedTrade = Array.isArray(params.trade) ? params.trade[0] : params.trade;
  const printMode = String(Array.isArray(params.print) ? params.print[0] : params.print ?? '') === '1';
  const selectedTrade = tradeContacts.find((item) => slug(item.trade) === slug(String(requestedTrade ?? '')))?.trade
    ?? tradeContacts[0]?.trade
    ?? 'Trade';

  const firstProgrammeWeek = normaliseWeek(getCurrentProgrammeWeek(siteSetup.programmeStartDate));
  const days = useMemo(
    () => buildDays(firstProgrammeWeek, siteSetup.programmeStartDate, siteSetup.includeSaturday, siteSetup.includeSunday),
    [firstProgrammeWeek, siteSetup.programmeStartDate, siteSetup.includeSaturday, siteSetup.includeSunday],
  );
  const dateRange = `${days[0]?.date ?? ''} - ${days[13]?.date ?? ''}`;
  const firstCalendarWeek = formatCalendarWeek(siteSetup.programmeStartDate, days[0]?.programmeWeek ?? firstProgrammeWeek, siteSetup.calendarWeekOne);
  const secondCalendarWeek = formatCalendarWeek(siteSetup.programmeStartDate, days[7]?.programmeWeek ?? normaliseWeek(firstProgrammeWeek + 1), siteSetup.calendarWeekOne);
  const dayWidth = printMode ? PRINT_DAY_WIDTH : SCREEN_DAY_WIDTH;
  const plotWidth = printMode ? 46 : 74;
  const tradeWidth = printMode ? 76 : 110;
  const weekWidth = dayWidth * 7;
  const tableWidth = plotWidth + tradeWidth + dayWidth * 14;

  useEffect(() => {
    if (!printMode || Platform.OS !== 'web' || typeof window === 'undefined') return;
    const style = window.document.createElement('style');
    style.id = 'programme-buddy-print-style';
    style.innerHTML = `
      @page { size: A4 landscape; margin: 7mm; }
      @media print {
        html, body { width: 297mm; height: auto; background: #fff !important; overflow: visible !important; }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        [data-testid="scroll-view"], div { overflow: visible !important; }
      }
    `;
    window.document.head.appendChild(style);
    const timer = window.setTimeout(() => window.print(), 850);
    return () => {
      window.clearTimeout(timer);
      window.document.getElementById('programme-buddy-print-style')?.remove();
    };
  }, [printMode]);

  const rows = useMemo(() => sitePlots.map((plot) => {
    const cells = days.map((day) => getActivitiesForTemplateDay(
      plot,
      day.programmeWeek,
      day.day,
      activityDelays,
      plotTemplates,
      siteSetup,
      activityMoves,
    ).filter((activity) => activity.trade.toLowerCase() === selectedTrade.toLowerCase())
      .map((activity) => shortActivity(activity.displayText || activity.code))
      .join('\n'));
    return { id: plot.id, plotNo: plot.plotNo, cells };
  }).filter((row) => row.cells.some(Boolean)), [
    sitePlots,
    days,
    activityDelays,
    activityMoves,
    plotTemplates,
    siteSetup,
    selectedTrade,
  ]);

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.kicker}>{printMode ? 'PDF record' : 'Live supervisor programme'}</Text>
        <Text style={styles.title}>{selectedTrade} Programme</Text>
        <Text style={styles.subtitle}>{firstCalendarWeek} and {secondCalendarWeek} match the Main 2 Week Programme, {dateRange}.</Text>
      </View>

      <View style={[styles.card, printMode ? styles.printCard : null]}>
        {rows.length === 0 ? <Text style={styles.empty}>No planned {selectedTrade} activity in this Week 1 and Week 2 window.</Text> : null}
        <ScrollView horizontal={!printMode} showsHorizontalScrollIndicator={!printMode}>
          <View style={{ width: tableWidth, minWidth: tableWidth }}>
            <View style={styles.row}>
              <Text style={[styles.headerCell, { width: plotWidth }]} />
              <Text style={[styles.headerCell, { width: tradeWidth }]} />
              <Text style={[styles.weekHeader, { width: weekWidth }]}>{firstCalendarWeek}</Text>
              <Text style={[styles.weekHeader, { width: weekWidth }]}>{secondCalendarWeek}</Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.headerCell, { width: plotWidth }]}>Plot No</Text>
              <Text style={[styles.headerCell, { width: tradeWidth }]}>Trade</Text>
              {days.map((day) => <Text key={day.key} style={[styles.dayHeader, { width: dayWidth }, day.nonWorking ? styles.weekendHeader : null]}>{day.name}</Text>)}
            </View>
            <View style={styles.row}>
              <Text style={[styles.dateBlank, { width: plotWidth }]} />
              <Text style={[styles.dateBlank, { width: tradeWidth }]} />
              {days.map((day) => <Text key={`date-${day.key}`} style={[styles.dateHeader, { width: dayWidth }, day.nonWorking ? styles.weekendDate : null]}>{day.date}</Text>)}
            </View>
            {rows.map((row, rowIndex) => (
              <View key={row.id} style={[styles.row, rowIndex % 2 ? styles.altRow : null]}>
                <Text style={[styles.bodyCell, { width: plotWidth }]}>{row.plotNo}</Text>
                <Text style={[styles.bodyCell, { width: tradeWidth }]}>{selectedTrade}</Text>
                {row.cells.map((cell, index) => (
                  <View key={`${row.id}-${days[index].key}`} style={[styles.dayCell, { width: dayWidth }, days[index].nonWorking ? styles.weekendCell : null, cell ? styles.activeCell : null]}>
                    <Text style={styles.dayText}>{cell}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 4 },
  kicker: { color: '#2563eb', fontSize: 13, fontWeight: '900', textTransform: 'uppercase' },
  title: { color: '#0f172a', fontSize: 30, fontWeight: '900' },
  subtitle: { color: '#64748b', fontSize: 14, lineHeight: 20 },
  card: { backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderWidth: 1, borderRadius: 20, padding: 16 },
  printCard: { padding: 8, borderRadius: 10 },
  row: { flexDirection: 'row', alignItems: 'stretch' },
  altRow: { backgroundColor: '#eef6ff' },
  headerCell: { backgroundColor: '#173b5f', color: '#ffffff', borderWidth: 1, borderColor: '#9fb6ce', padding: 7, textAlign: 'center', fontSize: 10, fontWeight: '900' },
  weekHeader: { backgroundColor: '#173b5f', color: '#ffffff', borderWidth: 1, borderColor: '#9fb6ce', paddingVertical: 5, textAlign: 'center', fontSize: 11, fontWeight: '900' },
  dayHeader: { backgroundColor: '#173b5f', color: '#ffffff', borderWidth: 1, borderColor: '#9fb6ce', paddingVertical: 5, textAlign: 'center', fontSize: 9, fontWeight: '900' },
  weekendHeader: { backgroundColor: '#214c75' },
  dateBlank: { backgroundColor: '#214c75', borderWidth: 1, borderColor: '#9fb6ce' },
  dateHeader: { backgroundColor: '#214c75', color: '#dbeafe', borderWidth: 1, borderColor: '#9fb6ce', paddingVertical: 4, textAlign: 'center', fontSize: 8, fontWeight: '900' },
  weekendDate: { backgroundColor: '#2b587f' },
  bodyCell: { color: '#0f172a', borderWidth: 1, borderColor: '#c8d7e6', padding: 7, textAlign: 'center', fontSize: 10, fontWeight: '800' },
  dayCell: { minHeight: 46, borderWidth: 1, borderColor: '#c8d7e6', padding: 4, alignItems: 'center', justifyContent: 'center' },
  weekendCell: { backgroundColor: '#f8fafc' },
  activeCell: { backgroundColor: '#fff4cc' },
  dayText: { color: '#0f172a', textAlign: 'center', fontSize: 9, fontWeight: '900' },
  empty: { color: '#64748b', fontWeight: '800', marginBottom: 10 },
});
