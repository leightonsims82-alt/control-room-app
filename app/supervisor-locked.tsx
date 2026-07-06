import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../components/AppScreen';
import { useSitePlanner } from '../data/sitePlannerStore';
import { getActivitiesForTemplateDay, normaliseProgrammeWeek } from '../utils/templateProgramme';

const PROGRAMME_START_DATE = new Date(2026, 6, 6);
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const SCREEN_DAY_WIDTH = 82;
const PRINT_DAY_WIDTH = 56;
const SCREEN_PLOT_WIDTH = 74;
const SCREEN_TRADE_WIDTH = 110;
const PRINT_PLOT_WIDTH = 46;
const PRINT_TRADE_WIDTH = 76;

function getCurrentProgrammeWeek() {
  const today = new Date();
  const days = Math.floor((today.getTime() - PROGRAMME_START_DATE.getTime()) / (1000 * 60 * 60 * 24));
  return normaliseProgrammeWeek(Math.floor(days / 7) + 1);
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
}

function getProgrammeDate(dayIndexFromStart: number) {
  const date = new Date(PROGRAMME_START_DATE);
  date.setDate(PROGRAMME_START_DATE.getDate() + dayIndexFromStart);
  return date;
}

function buildTwoWeekWindow(startWeek: number) {
  const baseIndex = (normaliseProgrammeWeek(startWeek) - 1) * 7;
  return Array.from({ length: 14 }, (_, index) => {
    const absoluteDayIndex = baseIndex + index;
    const dayIndex = ((absoluteDayIndex % 7) + 7) % 7;
    return {
      key: `${absoluteDayIndex}-${index}`,
      week: normaliseProgrammeWeek(Math.floor(absoluteDayIndex / 7) + 1),
      day: dayIndex + 1,
      dayIndex,
      dayName: DAYS[dayIndex],
      date: getProgrammeDate(absoluteDayIndex),
      weekend: dayIndex >= 5,
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

export default function SupervisorLockedView() {
  const params = useLocalSearchParams<{ trade?: string; print?: string }>();
  const { sitePlots, activityDelays, plotTemplates, tradeContacts, issueLogs } = useSitePlanner();
  const requestedTrade = Array.isArray(params.trade) ? params.trade[0] : params.trade;
  const printMode = String(Array.isArray(params.print) ? params.print[0] : params.print ?? '') === '1';
  const lockedTrade = tradeContacts.find((trade) => slug(trade.trade) === slug(String(requestedTrade ?? '')))?.trade ?? tradeContacts[0]?.trade ?? 'Trade';
  const startWeek = getCurrentProgrammeWeek();
  const days = useMemo(() => buildTwoWeekWindow(startWeek), [startWeek]);
  const weekGroups = [days[0]?.week ?? startWeek, days[7]?.week ?? normaliseProgrammeWeek(startWeek + 1)];
  const latestIssue = issueLogs[0];
  const dayWidth = printMode ? PRINT_DAY_WIDTH : SCREEN_DAY_WIDTH;
  const plotWidth = printMode ? PRINT_PLOT_WIDTH : SCREEN_PLOT_WIDTH;
  const tradeWidth = printMode ? PRINT_TRADE_WIDTH : SCREEN_TRADE_WIDTH;
  const weekWidth = dayWidth * 7;
  const tableWidth = plotWidth + tradeWidth + dayWidth * 14;

  useEffect(() => {
    if (printMode && Platform.OS === 'web' && typeof window !== 'undefined') {
      const style = window.document.createElement('style');
      style.id = 'programme-buddy-print-style';
      style.innerHTML = `
        @page { size: A4 landscape; margin: 7mm; }
        @media print {
          html, body { width: 297mm; min-height: 210mm; background: #fff !important; overflow: visible !important; }
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
    }
  }, [printMode]);

  const rows = useMemo(() => {
    return sitePlots.map((plot) => {
      const cells = days.map((day) => {
        if (day.weekend) return '';
        return getActivitiesForTemplateDay(plot, day.week, day.day, activityDelays, plotTemplates)
          .filter((activity) => activity.trade.toLowerCase() === lockedTrade.toLowerCase())
          .map((activity) => shortActivity(activity.displayText || activity.code))
          .join('\n');
      });
      return { key: plot.id, plotNo: plot.plotNo, cells };
    }).filter((row) => row.cells.some(Boolean));
  }, [sitePlots, days, activityDelays, plotTemplates, lockedTrade]);

  return (
    <AppScreen>
      <View style={[styles.header, printMode ? styles.printHeader : null]}>
        <Text style={[styles.kicker, printMode ? styles.printKicker : null]}>{printMode ? 'PDF record' : 'Live supervisor app'}</Text>
        <Text style={[styles.title, printMode ? styles.printTitle : null]}>{lockedTrade} Programme</Text>
        <Text style={[styles.subtitle, printMode ? styles.printSubtitle : null]}>{printMode ? `WK${String(weekGroups[0]).padStart(2, '0')} + WK${String(weekGroups[1]).padStart(2, '0')} formal PDF record.` : 'Read-only live view for your allocated trade only.'}</Text>
      </View>

      {!printMode ? (
        <View style={styles.issueCard}>
          <Text style={styles.issueTitle}>Live programme status</Text>
          <Text style={styles.issueText}>{latestIssue ? latestIssue.note : 'Live supervisor view available.'}</Text>
          {latestIssue ? <Text style={styles.issueMeta}>{new Date(latestIssue.issuedAt).toLocaleString('en-GB')}</Text> : null}
        </View>
      ) : null}

      {!printMode ? (
        <View style={styles.summaryRow}>
          <MiniStat label="Rows" value={rows.length} />
          <MiniStat label="Allocated trade" value={lockedTrade} />
          <MiniStat label="Mode" value="Read-only" />
        </View>
      ) : null}

      <View style={[styles.card, printMode ? styles.printCard : null]}>
        <Text style={[styles.cardTitle, printMode ? styles.printCardTitle : null]}>{lockedTrade} programme table</Text>
        {rows.length === 0 ? <Text style={styles.emptyText}>No planned {lockedTrade} activity in the current 2-week window.</Text> : null}
        <ScrollView horizontal={!printMode} showsHorizontalScrollIndicator={!printMode}>
          <View style={[styles.tableWrap, { width: tableWidth, minWidth: tableWidth }]}>
            <View style={styles.tableRow}>
              <Text style={[styles.tableHeader, { width: plotWidth }, printMode ? styles.printHeaderCell : null]} />
              <Text style={[styles.tableHeader, { width: tradeWidth }, printMode ? styles.printHeaderCell : null]} />
              {weekGroups.map((week, index) => <Text key={`${week}-${index}`} style={[styles.weekGroupHeader, { width: weekWidth }, printMode ? styles.printHeaderCell : null]}>WK{String(week).padStart(2, '0')}</Text>)}
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableHeader, { width: plotWidth }, printMode ? styles.printHeaderCell : null]}>Plot No</Text>
              <Text style={[styles.tableHeader, { width: tradeWidth }, printMode ? styles.printHeaderCell : null]}>Trade</Text>
              {days.map((item) => <Text key={item.key} style={[styles.dayHeaderCell, { width: dayWidth }, item.weekend ? styles.weekendHeader : null, printMode ? styles.printHeaderCell : null]}>{item.dayName}</Text>)}
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.dateBlankCell, { width: plotWidth }, printMode ? styles.printDateCell : null]} />
              <Text style={[styles.dateBlankCell, { width: tradeWidth }, printMode ? styles.printDateCell : null]} />
              {days.map((item) => <Text key={`date-${item.key}`} style={[styles.dateHeaderCell, { width: dayWidth }, item.weekend ? styles.weekendDateCell : null, printMode ? styles.printDateCell : null]}>{formatShortDate(item.date)}</Text>)}
            </View>
            {rows.map((row, rowIndex) => (
              <View key={row.key} style={[styles.tableRow, rowIndex % 2 ? styles.altRow : null]}>
                <Text style={[styles.bodyCell, { width: plotWidth }, printMode ? styles.printBodyCell : null]}>{row.plotNo}</Text>
                <Text style={[styles.bodyCell, { width: tradeWidth }, printMode ? styles.printBodyCell : null]}>{lockedTrade}</Text>
                {row.cells.map((cell, index) => (
                  <View key={`${row.key}-${days[index].key}`} style={[styles.dayBodyCell, { width: dayWidth }, days[index].weekend ? styles.weekendCell : null, cell ? styles.activeDayCell : null, printMode ? styles.printDayBodyCell : null]}>
                    <Text style={[styles.dayBodyText, printMode ? styles.printDayBodyText : null]}>{cell}</Text>
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

function MiniStat({ label, value }: { label: string | number; value: string | number }) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniStatValue}>{value}</Text>
      <Text style={styles.miniStatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: 4 },
  printHeader: { marginBottom: 8 },
  kicker: { color: '#2563eb', fontSize: 13, fontWeight: '900', textTransform: 'uppercase' },
  printKicker: { fontSize: 9 },
  title: { color: '#0f172a', fontSize: 32, fontWeight: '900', marginTop: 4 },
  printTitle: { fontSize: 18, marginTop: 2 },
  subtitle: { color: '#64748b', fontSize: 15, lineHeight: 22, marginTop: 6, maxWidth: 760 },
  printSubtitle: { fontSize: 10, lineHeight: 14, marginTop: 2 },
  issueCard: { backgroundColor: '#ffffff', borderRadius: 20, borderWidth: 1, borderColor: '#dbeafe', padding: 16, gap: 4 },
  issueTitle: { color: '#0f172a', fontSize: 18, fontWeight: '900' },
  issueText: { color: '#475569', fontWeight: '800', fontSize: 13, lineHeight: 20 },
  issueMeta: { color: '#64748b', fontWeight: '800', fontSize: 12 },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  miniStat: { flex: 1, minWidth: 120, backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', padding: 12 },
  miniStatValue: { color: '#0f172a', fontSize: 18, fontWeight: '900' },
  miniStatLabel: { color: '#64748b', fontSize: 12, fontWeight: '800', marginTop: 2 },
  card: { backgroundColor: '#ffffff', borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', padding: 16, gap: 10 },
  printCard: { borderRadius: 10, padding: 8, gap: 6 },
  cardTitle: { color: '#0f172a', fontWeight: '900', fontSize: 20 },
  printCardTitle: { fontSize: 12 },
  emptyText: { color: '#64748b', fontWeight: '800', lineHeight: 20 },
  tableWrap: {},
  tableRow: { flexDirection: 'row', alignItems: 'stretch' },
  altRow: { backgroundColor: '#eef6ff' },
  tableHeader: { backgroundColor: '#173b5f', color: '#ffffff', fontWeight: '900', fontSize: 11, padding: 7, borderWidth: 1, borderColor: '#9fb6ce', textAlign: 'center' },
  printHeaderCell: { fontSize: 7, padding: 3 },
  weekGroupHeader: { backgroundColor: '#173b5f', color: '#ffffff', borderWidth: 1, borderColor: '#9fb6ce', textAlign: 'center', paddingVertical: 5, fontSize: 11, fontWeight: '900' },
  dayHeaderCell: { backgroundColor: '#173b5f', color: '#ffffff', borderWidth: 1, borderColor: '#9fb6ce', textAlign: 'center', paddingVertical: 5, fontSize: 10, fontWeight: '900' },
  weekendHeader: { backgroundColor: '#214c75' },
  dateBlankCell: { backgroundColor: '#214c75', borderWidth: 1, borderColor: '#9fb6ce' },
  dateHeaderCell: { backgroundColor: '#214c75', color: '#dbeafe', borderWidth: 1, borderColor: '#9fb6ce', textAlign: 'center', paddingVertical: 4, fontSize: 9, fontWeight: '900' },
  printDateCell: { fontSize: 6.5, paddingVertical: 2 },
  weekendDateCell: { backgroundColor: '#2b587f' },
  bodyCell: { color: '#0f172a', padding: 7, borderWidth: 1, borderColor: '#c8d7e6', textAlign: 'center', fontWeight: '800', fontSize: 11 },
  printBodyCell: { fontSize: 7, padding: 3, minHeight: 30 },
  dayBodyCell: { minHeight: 48, borderWidth: 1, borderColor: '#c8d7e6', paddingHorizontal: 4, paddingVertical: 5, alignItems: 'center', justifyContent: 'center' },
  printDayBodyCell: { minHeight: 30, paddingHorizontal: 2, paddingVertical: 2 },
  dayBodyText: { color: '#0f172a', textAlign: 'center', fontWeight: '900', fontSize: 10, lineHeight: 12 },
  printDayBodyText: { fontSize: 6.5, lineHeight: 8 },
  weekendCell: { backgroundColor: '#f8fafc' },
  activeDayCell: { backgroundColor: '#fff4cc' },
});