import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { useSitePlanner } from '../../data/sitePlannerStore';
import { getActivitiesForTemplateDay, normaliseProgrammeWeek } from '../../utils/templateProgramme';

const PROGRAMME_START_DATE = new Date(2026, 6, 6);
const PROGRAMME_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const WORKING_DAY_COUNT = 5;
const DAY_WIDTH = 88;
const PLOT_WIDTH = 82;
const TYPE_WIDTH = 110;
const WEEK_WIDTH = DAY_WIDTH * 7;

function formatWeekLabel(week: number) {
  return `WK${String(normaliseProgrammeWeek(week)).padStart(2, '0')}`;
}

function getProgrammeDate(week: number, dayIndex: number) {
  const date = new Date(PROGRAMME_START_DATE);
  date.setDate(PROGRAMME_START_DATE.getDate() + (normaliseProgrammeWeek(week) - 1) * 7 + dayIndex);
  return date;
}

function getCurrentProgrammeWeek() {
  const today = new Date();
  const days = Math.floor((today.getTime() - PROGRAMME_START_DATE.getTime()) / (1000 * 60 * 60 * 24));
  return normaliseProgrammeWeek(Math.floor(days / 7) + 1);
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function formatDateRange(startWeek: number) {
  return `${formatShortDate(getProgrammeDate(startWeek, 0))} - ${formatShortDate(getProgrammeDate(startWeek + 1, 6))}`;
}

function simplifyActivity(text: string) {
  const clean = text.trim();
  if (!clean) return '';
  const lower = clean.toLowerCase();
  if (lower.includes('foundation')) return 'FND';
  if (lower.includes('drain')) return 'DNG';
  if (lower.includes('slab')) return 'SLAB';
  if (lower.includes('scaffold')) return 'SCAFF';
  if (lower.includes('brick') || lower.includes('block')) return 'BWK';
  if (lower.includes('roof')) return 'ROOF';
  if (lower.includes('joist')) return 'JOIST';
  if (lower.includes('truss')) return 'TRUSS';
  if (lower.includes('window')) return 'WINDOWS';
  if (lower.includes('plaster')) return 'PLASTER';
  if (lower.includes('decor')) return 'DEC';
  if (lower.includes('floor')) return 'FLOOR';
  if (lower.includes('second') || lower.includes('2nd')) return '2ND FIX';
  if (lower.includes('first') || lower.includes('1st')) return '1ST FIX';
  if (lower.includes('completion')) return 'COMP';
  return clean.length > 14 ? clean.slice(0, 14).toUpperCase() : clean.toUpperCase();
}

function buildCellText(activities: ReturnType<typeof getActivitiesForTemplateDay>) {
  return activities
    .map((activity) => simplifyActivity(activity.displayText || activity.code))
    .filter(Boolean)
    .join('\n');
}

function isWeekend(dayIndex: number) {
  return dayIndex >= WORKING_DAY_COUNT;
}

export default function TwoWeekProgrammeScreen() {
  const { sitePlots, activityDelays, plotTemplates } = useSitePlanner();
  const [startWeek, setStartWeek] = useState(getCurrentProgrammeWeek());
  const twoWeekDates = formatDateRange(startWeek);
  const visibleWeeks = [startWeek, normaliseProgrammeWeek(startWeek + 1)];

  const programmeRows = useMemo(() => {
    return sitePlots.map((plot) => {
      const dailyActivities = visibleWeeks.flatMap((week) =>
        PROGRAMME_DAYS.map((_, dayIndex) => {
          if (isWeekend(dayIndex)) return [];
          return getActivitiesForTemplateDay(plot, week, dayIndex + 1, activityDelays, plotTemplates);
        }),
      );
      return {
        plot,
        cells: dailyActivities.map(buildCellText),
      };
    });
  }, [sitePlots, visibleWeeks, activityDelays, plotTemplates]);

  return (
    <AppScreen>
      <View style={styles.header}>
        <View style={styles.headerMain}>
          <Text style={styles.kicker}>Live lookahead</Text>
          <Text style={styles.title}>2-Week Programme</Text>
          <Text style={styles.subtitle}>One combined site programme showing all planned work across every plot.</Text>
        </View>
        <View style={styles.headerBadge}>
          <Ionicons name="calendar-outline" size={16} color="#2563eb" />
          <Text style={styles.headerBadgeText}>{twoWeekDates}</Text>
        </View>
      </View>

      <View style={styles.controlPanel}>
        <View style={styles.weekControls}>
          <Pressable style={styles.weekButton} onPress={() => setStartWeek((week) => normaliseProgrammeWeek(week - 1))}>
            <Ionicons name="chevron-back" size={16} color="#ffffff" />
            <Text style={styles.weekButtonText}>Previous</Text>
          </Pressable>
          <View style={styles.weekCentre}>
            <Text style={styles.weekLabel}>{formatWeekLabel(startWeek)} + {formatWeekLabel(startWeek + 1)}</Text>
            <Text style={styles.weekDateLabel}>{twoWeekDates}</Text>
          </View>
          <Pressable style={styles.weekButton} onPress={() => setStartWeek((week) => normaliseProgrammeWeek(week + 1))}>
            <Text style={styles.weekButtonText}>Next</Text>
            <Ionicons name="chevron-forward" size={16} color="#ffffff" />
          </Pressable>
        </View>

        <View style={styles.quickActionRow}>
          <Pressable style={styles.currentWeekButton} onPress={() => setStartWeek(getCurrentProgrammeWeek())}>
            <Ionicons name="locate-outline" size={16} color="#1d4ed8" />
            <Text style={styles.currentWeekButtonText}>Jump to current week</Text>
          </Pressable>
        </View>

        <View style={styles.summaryStrip}>
          <MiniStat label="Active plots" value={sitePlots.length} />
          <MiniStat label="View" value="All trades" />
          <MiniStat label="Window" value="14 days" />
        </View>
      </View>

      {sitePlots.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="add-circle-outline" size={34} color="#2563eb" />
          <Text style={styles.emptyTitle}>No plots added yet</Text>
          <Text style={styles.emptyText}>Add plot numbers, plot types and handover weeks, then return here to view the full 2-week programme.</Text>
          <Link href="/plots" asChild>
            <Pressable style={styles.emptyButton}><Text style={styles.emptyButtonText}>Go to Plot Breakdown</Text></Pressable>
          </Link>
        </View>
      ) : (
        <>
          <View style={styles.legendRow}>
            <View style={styles.legendPill}><View style={styles.legendDot} /><Text style={styles.legendText}>Blue cells = planned work</Text></View>
            <View style={styles.legendPill}><Text style={styles.legendCode}>Sat/Sun</Text><Text style={styles.legendText}>Shown but blank unless weekend work is specifically added</Text></View>
          </View>

          <View style={styles.programmeCard}>
            <View style={styles.programmeHeader}>
              <Text style={styles.programmeTitle}>Main 2-week programme</Text>
              <Text style={styles.programmeSubtitle}>{sitePlots.length} plot{sitePlots.length === 1 ? '' : 's'} shown between {twoWeekDates}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View style={styles.tableWrap}>
                <View style={styles.weekHeaderRow}>
                  <Text style={[styles.weekHeaderBlank, styles.plotCell]} />
                  <Text style={[styles.weekHeaderBlank, styles.typeCell]} />
                  {visibleWeeks.map((week) => <Text key={week} style={styles.weekGroup}>{formatWeekLabel(week)}</Text>)}
                </View>
                <View style={styles.dateHeaderRow}>
                  <Text style={[styles.headerCell, styles.plotCell]}>Plot</Text>
                  <Text style={[styles.headerCell, styles.typeCell]}>Type</Text>
                  {visibleWeeks.flatMap((week) => PROGRAMME_DAYS.map((day, dayIndex) => (
                    <View key={`${week}-${day}`} style={[styles.dayHeader, isWeekend(dayIndex) ? styles.weekendHeader : null]}>
                      <Text style={styles.dayHeaderName}>{day}</Text>
                      <Text style={styles.dayHeaderDate}>{formatShortDate(getProgrammeDate(week, dayIndex))}</Text>
                    </View>
                  )))}
                </View>
                {programmeRows.map((row, rowIndex) => (
                  <View key={row.plot.id} style={[styles.tableRow, rowIndex % 2 ? styles.altRow : null]}>
                    <Text style={[styles.bodyCell, styles.plotCell]}>{row.plot.plotNo}</Text>
                    <Text style={[styles.bodyCell, styles.typeCell]}>{plotTemplates.find((template) => template.id === row.plot.templateId)?.name ?? '3 Bedroom'}</Text>
                    {row.cells.map((text, index) => {
                      const dayIndex = index % PROGRAMME_DAYS.length;
                      return <Text key={`${row.plot.id}-${index}`} style={[styles.dayCell, isWeekend(dayIndex) ? styles.weekendCell : null, text ? styles.activeDayCell : null]}>{text}</Text>;
                    })}
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </>
      )}
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' },
  headerMain: { flex: 1, minWidth: 260 },
  kicker: { color: '#2563eb', fontSize: 13, fontWeight: '900', letterSpacing: 0.3, textTransform: 'uppercase' },
  title: { color: '#0f172a', fontSize: 32, fontWeight: '900', letterSpacing: -0.6, marginTop: 4 },
  subtitle: { color: '#64748b', fontSize: 15, lineHeight: 22, marginTop: 6 },
  headerBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#eff6ff', borderColor: '#bfdbfe', borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  headerBadgeText: { color: '#1d4ed8', fontWeight: '900', fontSize: 12 },
  controlPanel: { backgroundColor: '#ffffff', borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', padding: 16, gap: 14 },
  weekControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  weekButton: { backgroundColor: '#0f172a', borderRadius: 13, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  weekButtonText: { color: '#ffffff', fontWeight: '900' },
  weekCentre: { alignItems: 'center', flex: 1, minWidth: 180 },
  weekLabel: { color: '#0f172a', fontWeight: '900', fontSize: 18 },
  weekDateLabel: { color: '#64748b', fontWeight: '800', fontSize: 12, marginTop: 2 },
  quickActionRow: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 10 },
  currentWeekButton: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#eff6ff', borderRadius: 999, borderWidth: 1, borderColor: '#bfdbfe', paddingHorizontal: 12, paddingVertical: 8 },
  currentWeekButtonText: { color: '#1d4ed8', fontSize: 12, fontWeight: '900' },
  summaryStrip: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  miniStat: { flex: 1, minWidth: 120, backgroundColor: '#f8fafc', borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', padding: 12 },
  miniStatValue: { color: '#0f172a', fontSize: 18, fontWeight: '900' },
  miniStatLabel: { color: '#64748b', fontSize: 12, fontWeight: '800', marginTop: 2 },
  emptyCard: { backgroundColor: '#ffffff', borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', padding: 22, gap: 10, alignItems: 'flex-start' },
  emptyTitle: { color: '#0f172a', fontWeight: '900', fontSize: 18 },
  emptyText: { color: '#64748b', fontSize: 14, lineHeight: 20 },
  emptyButton: { backgroundColor: '#0f172a', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginTop: 6 },
  emptyButtonText: { color: '#ffffff', fontWeight: '900' },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  legendPill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#dbeafe', borderWidth: 1, borderColor: '#93c5fd' },
  legendCode: { backgroundColor: '#173b5f', color: '#ffffff', fontWeight: '900', fontSize: 11, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  legendText: { color: '#475569', fontSize: 12, fontWeight: '800' },
  programmeCard: { backgroundColor: '#ffffff', borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', padding: 16, gap: 12 },
  programmeHeader: { gap: 3 },
  programmeTitle: { color: '#0f172a', fontWeight: '900', fontSize: 20 },
  programmeSubtitle: { color: '#64748b', fontSize: 13 },
  tableWrap: { minWidth: PLOT_WIDTH + TYPE_WIDTH + DAY_WIDTH * 14 },
  weekHeaderRow: { flexDirection: 'row', alignItems: 'stretch' },
  weekHeaderBlank: { backgroundColor: '#173b5f', borderWidth: 1, borderColor: '#9fb6ce' },
  weekGroup: { width: WEEK_WIDTH, backgroundColor: '#173b5f', color: '#ffffff', borderWidth: 1, borderColor: '#9fb6ce', textAlign: 'center', paddingVertical: 8, fontWeight: '900' },
  dateHeaderRow: { flexDirection: 'row', alignItems: 'stretch' },
  headerCell: { backgroundColor: '#173b5f', color: '#ffffff', borderWidth: 1, borderColor: '#9fb6ce', textAlign: 'center', paddingVertical: 9, fontWeight: '900' },
  plotCell: { width: PLOT_WIDTH },
  typeCell: { width: TYPE_WIDTH },
  dayHeader: { width: DAY_WIDTH, backgroundColor: '#173b5f', borderWidth: 1, borderColor: '#9fb6ce', alignItems: 'center', justifyContent: 'center', paddingVertical: 6 },
  weekendHeader: { backgroundColor: '#214c75' },
  dayHeaderName: { color: '#ffffff', fontWeight: '900', fontSize: 12 },
  dayHeaderDate: { color: '#dbeafe', fontWeight: '900', fontSize: 11, marginTop: 1 },
  tableRow: { flexDirection: 'row', alignItems: 'stretch', minHeight: 42 },
  altRow: { backgroundColor: '#eef6ff' },
  bodyCell: { color: '#0f172a', borderWidth: 1, borderColor: '#c8d7e6', paddingHorizontal: 7, paddingVertical: 8, textAlign: 'center', fontWeight: '900', fontSize: 11 },
  dayCell: { width: DAY_WIDTH, color: '#0f172a', borderWidth: 1, borderColor: '#c8d7e6', paddingHorizontal: 4, paddingVertical: 6, textAlign: 'center', fontWeight: '900', fontSize: 10, lineHeight: 12 },
  weekendCell: { backgroundColor: '#f8fafc', color: '#94a3b8' },
  activeDayCell: { backgroundColor: '#dbeafe' },
});