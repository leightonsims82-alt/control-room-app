import { Ionicons } from '@expo/vector-icons';
import { Link, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../components/AppScreen';
import { useSitePlanner } from '../data/sitePlannerStore';
import { getActivitiesForTemplateDay, normaliseProgrammeWeek } from '../utils/templateProgramme';

const PROGRAMME_START_DATE = new Date(2026, 6, 6);
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const DAY_WIDTH = 82;
const WEEK_WIDTH = DAY_WIDTH * 7;

type SupervisorRow = {
  key: string;
  plotNo: string;
  plotType: string;
  trade: string;
  fix: string;
  cells: string[];
};

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

function normaliseSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function guessTrade(text: string, fallbackTrade?: string) {
  if (fallbackTrade) return fallbackTrade;
  const lower = text.toLowerCase();
  if (lower.includes('brick') || lower.includes('block') || lower.includes('dpc')) return 'Brickwork';
  if (lower.includes('drain') || lower.includes('foundation') || lower.includes('slab')) return 'Groundworks';
  if (lower.includes('roof') || lower.includes('truss') || lower.includes('joist')) return 'Carpentry/Roofing';
  if (lower.includes('window')) return 'Windows';
  if (lower.includes('plaster')) return 'Plastering';
  if (lower.includes('decor')) return 'Decorating';
  if (lower.includes('electric')) return 'Electrical';
  if (lower.includes('plumb') || lower.includes('heating')) return 'Plumbing';
  return 'General';
}

function shortFix(text: string) {
  const clean = text.trim();
  const lower = clean.toLowerCase();
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
  return clean.length > 12 ? clean.slice(0, 12).toUpperCase() : clean.toUpperCase();
}

export default function SupervisorProgrammeView() {
  const params = useLocalSearchParams<{ trade?: string }>();
  const { sitePlots, activityDelays, plotTemplates, tradeContacts, issueLogs } = useSitePlanner();
  const tradeOptions = useMemo(() => ['All trades', ...Array.from(new Set(tradeContacts.map((contact) => contact.trade).filter(Boolean))), 'General'], [tradeContacts]);
  const linkedTrade = useMemo(() => {
    const requested = Array.isArray(params.trade) ? params.trade[0] : params.trade;
    if (!requested) return 'All trades';
    return tradeOptions.find((trade) => normaliseSlug(trade) === normaliseSlug(String(requested))) ?? 'All trades';
  }, [params.trade, tradeOptions]);
  const [selectedTrade, setSelectedTrade] = useState(linkedTrade);
  const startWeek = getCurrentProgrammeWeek();
  const days = useMemo(() => buildTwoWeekWindow(startWeek), [startWeek]);
  const weekGroups = [days[0]?.week ?? startWeek, days[7]?.week ?? normaliseProgrammeWeek(startWeek + 1)];
  const latestIssue = issueLogs[0];

  useEffect(() => {
    setSelectedTrade(linkedTrade);
  }, [linkedTrade]);

  const rows = useMemo<SupervisorRow[]>(() => {
    return sitePlots.flatMap((plot) => {
      const byDay = days.map((day) => {
        if (day.weekend) return [];
        return getActivitiesForTemplateDay(plot, day.week, day.day, activityDelays, plotTemplates).filter((activity) => {
          const trade = guessTrade(activity.displayText || activity.code, activity.trade);
          return selectedTrade === 'All trades' || trade.toLowerCase() === selectedTrade.toLowerCase();
        });
      });
      const first = byDay.flat()[0];
      if (!first) return [];
      const trade = guessTrade(first.displayText || first.code, first.trade);
      return [{
        key: plot.id,
        plotNo: plot.plotNo,
        plotType: plotTemplates.find((template) => template.id === plot.templateId)?.name ?? '3 Bedroom',
        trade,
        fix: shortFix(first.displayText || first.code),
        cells: byDay.map((activities) => activities.map((activity) => shortFix(activity.displayText || activity.code)).join('\n')),
      }];
    });
  }, [sitePlots, days, activityDelays, plotTemplates, selectedTrade]);

  return (
    <AppScreen>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>Live supervisor app</Text>
          <Text style={styles.title}>{selectedTrade === 'All trades' ? 'Live Trade Programme' : `${selectedTrade} Programme`}</Text>
          <Text style={styles.subtitle}>Read-only live table view. This matches the trade programme layout and updates from the current programme data.</Text>
        </View>
        <Link href="/(tabs)/trades" asChild>
          <Pressable style={styles.backButton}>
            <Ionicons name="arrow-back" size={16} color="#ffffff" />
            <Text style={styles.backButtonText}>Back to trades</Text>
          </Pressable>
        </Link>
      </View>

      <View style={styles.issueCard}>
        <Text style={styles.issueTitle}>Live programme status</Text>
        <Text style={styles.issueText}>{latestIssue ? latestIssue.note : 'Live supervisor view available. PDF record can be generated separately.'}</Text>
        {latestIssue ? <Text style={styles.issueMeta}>{new Date(latestIssue.issuedAt).toLocaleString('en-GB')}</Text> : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {tradeOptions.map((trade) => {
          const active = selectedTrade === trade;
          return (
            <Pressable key={trade} style={[styles.filterPill, active ? styles.filterPillActive : null]} onPress={() => setSelectedTrade(trade)}>
              <Text style={[styles.filterText, active ? styles.filterTextActive : null]}>{trade}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.summaryRow}>
        <MiniStat label="Rows" value={rows.length} />
        <MiniStat label="View" value={selectedTrade} />
        <MiniStat label="Mode" value="Live read-only" />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Programme table</Text>
        {rows.length === 0 ? <Text style={styles.emptyText}>No activities found for this trade in the current 2-week window.</Text> : null}
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={styles.tableWrap}>
            <View style={styles.tableRow}>
              <Text style={[styles.tableHeader, styles.plotNoCell]} />
              <Text style={[styles.tableHeader, styles.tradeCell]} />
              <Text style={[styles.tableHeader, styles.fixCell]} />
              {weekGroups.map((week, index) => <Text key={`${week}-${index}`} style={styles.weekGroupHeader}>WK{String(week).padStart(2, '0')}</Text>)}
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableHeader, styles.plotNoCell]}>Plot No</Text>
              <Text style={[styles.tableHeader, styles.tradeCell]}>Trade</Text>
              <Text style={[styles.tableHeader, styles.fixCell]}>Fix / Stage</Text>
              {days.map((item) => <Text key={item.key} style={[styles.dayHeaderCell, item.weekend ? styles.weekendHeader : null]}>{item.dayName}</Text>)}
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.dateBlankCell, styles.plotNoCell]} />
              <Text style={[styles.dateBlankCell, styles.tradeCell]} />
              <Text style={[styles.dateBlankCell, styles.fixCell]} />
              {days.map((item) => <Text key={`date-${item.key}`} style={[styles.dateHeaderCell, item.weekend ? styles.weekendDateCell : null]}>{formatShortDate(item.date)}</Text>)}
            </View>
            {rows.map((row, rowIndex) => (
              <View key={row.key} style={[styles.tableRow, rowIndex % 2 ? styles.altRow : null]}>
                <Text style={[styles.bodyCell, styles.plotNoCell]}>{row.plotNo}</Text>
                <Text style={[styles.bodyCell, styles.tradeCell]}>{row.trade}</Text>
                <Text style={[styles.bodyCell, styles.fixCell]}>{row.fix}</Text>
                {row.cells.map((cell, index) => (
                  <View key={`${row.key}-${days[index].key}`} style={[styles.dayBodyCell, days[index].weekend ? styles.weekendCell : null, cell ? styles.activeDayCell : null]}>
                    <Text style={styles.dayBodyText}>{cell}</Text>
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
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' },
  kicker: { color: '#2563eb', fontSize: 13, fontWeight: '900', textTransform: 'uppercase' },
  title: { color: '#0f172a', fontSize: 32, fontWeight: '900', marginTop: 4 },
  subtitle: { color: '#64748b', fontSize: 15, lineHeight: 22, marginTop: 6, maxWidth: 760 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0f172a', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  backButtonText: { color: '#ffffff', fontWeight: '900', fontSize: 12 },
  issueCard: { backgroundColor: '#ffffff', borderRadius: 20, borderWidth: 1, borderColor: '#dbeafe', padding: 16, gap: 4 },
  issueTitle: { color: '#0f172a', fontSize: 18, fontWeight: '900' },
  issueText: { color: '#475569', fontWeight: '800', fontSize: 13, lineHeight: 20 },
  issueMeta: { color: '#64748b', fontWeight: '800', fontSize: 12 },
  filterRow: { gap: 8, paddingVertical: 4 },
  filterPill: { borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#ffffff', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9 },
  filterPillActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  filterText: { color: '#475569', fontWeight: '900', fontSize: 12 },
  filterTextActive: { color: '#ffffff' },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  miniStat: { flex: 1, minWidth: 120, backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', padding: 12 },
  miniStatValue: { color: '#0f172a', fontSize: 18, fontWeight: '900' },
  miniStatLabel: { color: '#64748b', fontSize: 12, fontWeight: '800', marginTop: 2 },
  card: { backgroundColor: '#ffffff', borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', padding: 16, gap: 10 },
  cardTitle: { color: '#0f172a', fontWeight: '900', fontSize: 20 },
  emptyText: { color: '#64748b', fontWeight: '800', lineHeight: 20 },
  tableWrap: { minWidth: 74 + 110 + 118 + DAY_WIDTH * 14 },
  tableRow: { flexDirection: 'row', alignItems: 'stretch' },
  altRow: { backgroundColor: '#eef6ff' },
  tableHeader: { backgroundColor: '#173b5f', color: '#ffffff', fontWeight: '900', fontSize: 11, padding: 7, borderWidth: 1, borderColor: '#9fb6ce', textAlign: 'center' },
  plotNoCell: { width: 74 },
  tradeCell: { width: 110 },
  fixCell: { width: 118 },
  weekGroupHeader: { width: WEEK_WIDTH, backgroundColor: '#173b5f', color: '#ffffff', borderWidth: 1, borderColor: '#9fb6ce', textAlign: 'center', paddingVertical: 5, fontSize: 11, fontWeight: '900' },
  dayHeaderCell: { width: DAY_WIDTH, backgroundColor: '#173b5f', color: '#ffffff', borderWidth: 1, borderColor: '#9fb6ce', textAlign: 'center', paddingVertical: 5, fontSize: 10, fontWeight: '900' },
  weekendHeader: { backgroundColor: '#214c75' },
  dateBlankCell: { backgroundColor: '#214c75', borderWidth: 1, borderColor: '#9fb6ce' },
  dateHeaderCell: { width: DAY_WIDTH, backgroundColor: '#214c75', color: '#dbeafe', borderWidth: 1, borderColor: '#9fb6ce', textAlign: 'center', paddingVertical: 4, fontSize: 9, fontWeight: '900' },
  weekendDateCell: { backgroundColor: '#2b587f' },
  bodyCell: { color: '#0f172a', padding: 7, borderWidth: 1, borderColor: '#c8d7e6', textAlign: 'center', fontWeight: '800', fontSize: 11 },
  dayBodyCell: { width: DAY_WIDTH, minHeight: 48, borderWidth: 1, borderColor: '#c8d7e6', paddingHorizontal: 4, paddingVertical: 5, alignItems: 'center', justifyContent: 'center', gap: 4 },
  dayBodyText: { color: '#0f172a', textAlign: 'center', fontWeight: '900', fontSize: 10, lineHeight: 12 },
  weekendCell: { backgroundColor: '#f8fafc' },
  activeDayCell: { backgroundColor: '#fff4cc' },
});