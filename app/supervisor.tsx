import { Ionicons } from '@expo/vector-icons';
import { Link, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../components/AppScreen';
import { useSitePlanner } from '../data/sitePlannerStore';
import { getActivitiesForTemplateDay, normaliseProgrammeWeek } from '../utils/templateProgramme';

const PROGRAMME_START_DATE = new Date(2026, 6, 6);
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

function getCurrentProgrammeWeek() {
  const today = new Date();
  const days = Math.floor((today.getTime() - PROGRAMME_START_DATE.getTime()) / (1000 * 60 * 60 * 24));
  return normaliseProgrammeWeek(Math.floor(days / 7) + 1);
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
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
  const latestIssue = issueLogs[0];

  useEffect(() => {
    setSelectedTrade(linkedTrade);
  }, [linkedTrade]);

  const rows = useMemo(() => {
    return sitePlots.flatMap((plot) => {
      return days.flatMap((day) => {
        if (day.weekend) return [];
        const activities = getActivitiesForTemplateDay(plot, day.week, day.day, activityDelays, plotTemplates);
        return activities.map((activity) => {
          const displayText = activity.displayText || activity.code;
          const trade = guessTrade(displayText, activity.trade);
          return {
            key: `${plot.id}-${day.key}-${activity.code}`,
            plotNo: plot.plotNo,
            plotType: plotTemplates.find((template) => template.id === plot.templateId)?.name ?? '3 Bedroom',
            date: `${day.dayName} ${formatShortDate(day.date)}`,
            activity: displayText,
            trade,
            status: 'Planned',
          };
        });
      });
    }).filter((row) => selectedTrade === 'All trades' || row.trade.toLowerCase() === selectedTrade.toLowerCase());
  }, [sitePlots, days, activityDelays, plotTemplates, selectedTrade]);

  return (
    <AppScreen>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>Live supervisor app</Text>
          <Text style={styles.title}>{selectedTrade === 'All trades' ? 'Live Trade Programme' : `${selectedTrade} Programme`}</Text>
          <Text style={styles.subtitle}>Read-only live view. This updates from the programme data, so supervisors can check their current trade programme at any time.</Text>
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
        <Text style={styles.issueText}>{latestIssue ? latestIssue.note : 'Live view available. No formal PDF record has been generated yet.'}</Text>
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
        <MiniStat label="Activities" value={rows.length} />
        <MiniStat label="View" value={selectedTrade} />
        <MiniStat label="Mode" value="Live read-only" />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Programme activities</Text>
        {rows.length === 0 ? (
          <Text style={styles.emptyText}>No activities found for this trade in the current 2-week window.</Text>
        ) : rows.map((row) => (
          <View key={row.key} style={styles.row}>
            <View style={styles.plotBadge}><Text style={styles.plotBadgeText}>{row.plotNo}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.activityText}>{row.activity}</Text>
              <Text style={styles.metaText}>{row.trade} • {row.date} • {row.plotType}</Text>
            </View>
            <View style={styles.statusPill}><Text style={styles.statusText}>{row.status}</Text></View>
          </View>
        ))}
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
  filterPillActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  filterText: { color: '#475569', fontWeight: '900', fontSize: 12 },
  filterTextActive: { color: '#ffffff' },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  miniStat: { flex: 1, minWidth: 120, backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', padding: 12 },
  miniStatValue: { color: '#0f172a', fontSize: 18, fontWeight: '900' },
  miniStatLabel: { color: '#64748b', fontSize: 12, fontWeight: '800', marginTop: 2 },
  card: { backgroundColor: '#ffffff', borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', padding: 16, gap: 10 },
  cardTitle: { color: '#0f172a', fontWeight: '900', fontSize: 20 },
  emptyText: { color: '#64748b', fontWeight: '800', lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 10 },
  plotBadge: { width: 46, height: 38, borderRadius: 12, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', alignItems: 'center', justifyContent: 'center' },
  plotBadgeText: { color: '#1d4ed8', fontWeight: '900' },
  activityText: { color: '#0f172a', fontSize: 14, fontWeight: '900' },
  metaText: { color: '#64748b', fontSize: 12, fontWeight: '800', marginTop: 2 },
  statusPill: { backgroundColor: '#dcfce7', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  statusText: { color: '#166534', fontSize: 11, fontWeight: '900' },
});