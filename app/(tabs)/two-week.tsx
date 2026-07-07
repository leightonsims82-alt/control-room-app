import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { useSitePlanner } from '../../data/sitePlannerStore';
import { getActivitiesForTemplateDay, getTemplateForPlot, isProgrammeWorkingDay, normaliseProgrammeWeek, orderedActivities, SiteProgrammeSetup, TemplateActivity, TemplateSitePlot } from '../../utils/templateProgramme';

const PROGRAMME_START_DATE = new Date(2026, 6, 6);
const PROGRAMME_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const DAY_WIDTH = 98;
const PLOT_WIDTH = 82;
const TYPE_WIDTH = 110;
const WEEK_WIDTH = DAY_WIDTH * 7;

type ProgrammeRow = { plot: TemplateSitePlot; dailyActivities: TemplateActivity[][] };

function formatWeekLabel(week: number) { return `WK${String(normaliseProgrammeWeek(week)).padStart(2, '0')}`; }
function getProgrammeDateFromIndex(dayIndexFromStart: number) { const date = new Date(PROGRAMME_START_DATE); date.setDate(PROGRAMME_START_DATE.getDate() + dayIndexFromStart); return date; }
function getCurrentProgrammeWeek() { const today = new Date(); const days = Math.floor((today.getTime() - PROGRAMME_START_DATE.getTime()) / (1000 * 60 * 60 * 24)); return normaliseProgrammeWeek(Math.floor(days / 7) + 1); }
function formatShortDate(date: Date) { return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }); }
function plotNoSortValue(plotNo: string) { const parsed = Number(plotNo.replace(/[^0-9.]/g, '')); return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER; }

function getProgrammeDayFromAbsoluteIndex(absoluteDayIndex: number) {
  const week = normaliseProgrammeWeek(Math.floor(absoluteDayIndex / 7) + 1);
  const dayIndex = ((absoluteDayIndex % 7) + 7) % 7;
  const day = dayIndex + 1;
  return { week, day };
}

function findAdjacentWorkingProgrammeDay(absoluteDayIndex: number, direction: -1 | 1, siteSetup: SiteProgrammeSetup) {
  for (let offset = 1; offset <= 21; offset += 1) {
    const candidate = getProgrammeDayFromAbsoluteIndex(absoluteDayIndex + offset * direction);
    if (isProgrammeWorkingDay(candidate.day, siteSetup)) return candidate;
  }
  return null;
}

function buildTwoWeekWindow(startWeek: number, dayOffset: number, siteSetup: SiteProgrammeSetup) {
  const baseIndex = (normaliseProgrammeWeek(startWeek) - 1) * 7 + dayOffset;
  return Array.from({ length: 14 }, (_, columnIndex) => {
    const absoluteDayIndex = baseIndex + columnIndex;
    const week = normaliseProgrammeWeek(Math.floor(absoluteDayIndex / 7) + 1);
    const dayIndex = ((absoluteDayIndex % 7) + 7) % 7;
    const day = dayIndex + 1;
    return { key: `${absoluteDayIndex}-${columnIndex}`, absoluteDayIndex, week, dayIndex, day, dayName: PROGRAMME_DAYS[dayIndex], date: getProgrammeDateFromIndex(absoluteDayIndex), nonWorking: !isProgrammeWorkingDay(day, siteSetup) };
  });
}

function formatDateRange(windowDays: ReturnType<typeof buildTwoWeekWindow>) {
  return `${formatShortDate(windowDays[0].date)} - ${formatShortDate(windowDays[windowDays.length - 1].date)}`;
}

function simplifyActivity(text: string) {
  const clean = text.trim();
  if (!clean) return '';
  const lower = clean.toLowerCase();
  if (lower.includes('bwk') || lower.includes('brick') || lower.includes('block')) return clean;
  if (lower.includes('foundation')) return 'FND';
  if (lower.includes('drain')) return 'DNG';
  if (lower.includes('slab')) return 'SLAB';
  if (lower.includes('scaffold')) return 'SCAFF';
  if (lower.includes('roof')) return 'ROOF';
  if (lower.includes('joist')) return 'JOIST';
  if (lower.includes('truss')) return 'TRUSS';
  if (lower.includes('window')) return 'WINDOWS';
  if (lower.includes('plaster')) return 'PLASTER';
  if (lower.includes('decor')) return 'DEC';
  if (lower.includes('floor')) return 'FLOOR';
  if (lower.includes('2nd fix') || lower.includes('second fix')) return '2ND FIX';
  if (lower.includes('1st fix') || lower.includes('first fix')) return '1ST FIX';
  if (lower.includes('completion')) return 'COMP';
  return clean.length > 14 ? clean.slice(0, 14).toUpperCase() : clean.toUpperCase();
}

export default function TwoWeekProgrammeScreen() {
  const { sitePlots, activityDelays, plotTemplates, siteSetup, setActivityDelay, updatePlotTemplate } = useSitePlanner();
  const [startWeek, setStartWeek] = useState(getCurrentProgrammeWeek());
  const [viewDayOffset, setViewDayOffset] = useState(0);
  const [moveMessage, setMoveMessage] = useState('');
  const windowDays = useMemo(() => buildTwoWeekWindow(startWeek, viewDayOffset, siteSetup), [startWeek, viewDayOffset, siteSetup]);
  const twoWeekDates = formatDateRange(windowDays);
  const weekGroups = [windowDays[0].week, windowDays[7].week];
  const orderedSitePlots = useMemo(() => sitePlots.slice().sort((a, b) => a.stage9CompleteWeek - b.stage9CompleteWeek || plotNoSortValue(a.plotNo) - plotNoSortValue(b.plotNo)), [sitePlots]);

  const programmeRows = useMemo<ProgrammeRow[]>(() => orderedSitePlots.map((plot) => {
    const dailyActivities = windowDays.map((item) => getActivitiesForTemplateDay(plot, item.week, item.day, activityDelays, plotTemplates, siteSetup));
    return { plot, dailyActivities };
  }), [orderedSitePlots, windowDays, activityDelays, plotTemplates, siteSetup]);

  const activityExistsOnAdjacentWorkingDay = (plot: TemplateSitePlot, activityCode: string, absoluteDayIndex: number, direction: -1 | 1) => {
    const adjacent = findAdjacentWorkingProgrammeDay(absoluteDayIndex, direction, siteSetup);
    if (!adjacent) return false;
    return getActivitiesForTemplateDay(plot, adjacent.week, adjacent.day, activityDelays, plotTemplates, siteSetup).some((activity) => activity.code === activityCode);
  };

  const getDelayDays = (plotId: string, activityCode: string) => activityDelays.find((delay) => delay.plotId === plotId && delay.activityCode === activityCode)?.delayDays ?? 0;

  const moveFixDuration = async (plot: TemplateSitePlot, activity: TemplateActivity, change: number) => {
    const currentDelay = getDelayDays(plot.id, activity.code);
    const nextDelay = currentDelay + change;
    if (activity.durationDays + nextDelay < 1) {
      setMoveMessage(`${activity.displayText} cannot be shorter than 1 working day`);
      return;
    }
    await setActivityDelay({ plotId: plot.id, activityCode: activity.code, delayDays: nextDelay });
    const direction = change > 0 ? 'extended' : 'shortened';
    setMoveMessage(`Plot ${plot.plotNo} ${activity.displayText} ${direction} by 1 working day`);
  };

  const pullFixBack = (plot: TemplateSitePlot, activity: TemplateActivity) => {
    const template = getTemplateForPlot(plot, plotTemplates);
    const activities = orderedActivities(template);
    const currentIndex = activities.findIndex((item) => item.code === activity.code);
    if (currentIndex <= 0) {
      setMoveMessage(`${activity.displayText} cannot be pulled back any further`);
      return;
    }
    const previous = activities[currentIndex - 1];
    const current = activities[currentIndex];
    const previousDuration = Math.max(1, previous.durationDays);
    const alreadyLinkedToPrevious = current.overlapAllowed && current.overlapLinkCode === previous.code && current.overlapStartFrom === 'start';
    const currentLag = alreadyLinkedToPrevious ? current.overlapLagDays ?? previousDuration : previousDuration;
    const nextLag = Math.max(0, currentLag - 1);
    const nextActivities = template.activities.map((item) => item.code === current.code ? { ...item, overlapAllowed: true, overlapLinkCode: previous.code, overlapStartFrom: 'start' as const, overlapLagDays: nextLag } : item);
    updatePlotTemplate({ ...template, activities: nextActivities });
    setMoveMessage(`${current.displayText} pulled back 1 working day to overlap with ${previous.displayText}`);
  };

  const resetWindow = () => { setStartWeek(getCurrentProgrammeWeek()); setViewDayOffset(0); setMoveMessage(''); };

  return (
    <AppScreen>
      <View style={styles.header}>
        <View style={styles.headerMain}>
          <Text style={styles.kicker}>Live lookahead</Text>
          <Text style={styles.title}>2 Week Programme</Text>
          <Text style={styles.subtitle}>Use the first-day arrow to pull a fix back into overlap. Use last-day +/- to shorten or extend the fix.</Text>
        </View>
        <View style={styles.headerBadge}><Ionicons name="calendar-outline" size={16} color="#2563eb" /><Text style={styles.headerBadgeText}>{twoWeekDates}</Text></View>
      </View>

      <View style={styles.controlPanel}>
        <View style={styles.weekControls}>
          <Pressable style={styles.weekButton} onPress={() => { setMoveMessage(''); setStartWeek((week) => normaliseProgrammeWeek(week - 1)); }}><Ionicons name="chevron-back" size={16} color="#ffffff" /><Text style={styles.weekButtonText}>Previous week</Text></Pressable>
          <View style={styles.weekCentre}><Text style={styles.weekLabel}>{formatWeekLabel(weekGroups[0])} + {formatWeekLabel(weekGroups[1])}</Text><Text style={styles.weekDateLabel}>{twoWeekDates}</Text></View>
          <Pressable style={styles.weekButton} onPress={() => { setMoveMessage(''); setStartWeek((week) => normaliseProgrammeWeek(week + 1)); }}><Text style={styles.weekButtonText}>Next week</Text><Ionicons name="chevron-forward" size={16} color="#ffffff" /></Pressable>
        </View>
        {moveMessage ? <Text style={styles.moveNotice}>{moveMessage}</Text> : null}
        <View style={styles.viewPanel}>
          <Text style={styles.viewPanelTitle}>View only</Text>
          <View style={styles.quickActionRow}>
            <Pressable style={styles.viewButton} onPress={() => { setMoveMessage(''); setViewDayOffset((value) => value - 1); }}><Text style={styles.viewButtonText}>View -1 Day</Text></Pressable>
            <Pressable style={styles.currentWeekButton} onPress={resetWindow}><Ionicons name="locate-outline" size={16} color="#1d4ed8" /><Text style={styles.currentWeekButtonText}>Reset View</Text></Pressable>
            <Pressable style={styles.viewButton} onPress={() => { setMoveMessage(''); setViewDayOffset((value) => value + 1); }}><Text style={styles.viewButtonText}>View +1 Day</Text></Pressable>
          </View>
          <Text style={styles.viewNote}>View offset: {viewDayOffset > 0 ? '+' : ''}{viewDayOffset} day{Math.abs(viewDayOffset) === 1 ? '' : 's'}. This does not move programme data.</Text>
        </View>
        <View style={styles.summaryStrip}><MiniStat label="Active plots" value={sitePlots.length} /><MiniStat label="View" value="All trades" /><MiniStat label="Window" value="14 days" /></View>
      </View>

      {sitePlots.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="add-circle-outline" size={34} color="#2563eb" />
          <Text style={styles.emptyTitle}>No plots added yet</Text>
          <Text style={styles.emptyText}>Add plot numbers, plot types and handover weeks, then return here to view the full 2 Week Programme.</Text>
          <Link href="/master" asChild><Pressable style={styles.emptyButton}><Text style={styles.emptyButtonText}>Go to Master</Text></Pressable></Link>
        </View>
      ) : (
        <>
          <View style={styles.legendRow}>
            <View style={styles.legendPill}><View style={styles.legendDot} /><Text style={styles.legendText}>Blue cells = planned work</Text></View>
            <View style={styles.legendPill}><Text style={styles.legendCode}>←</Text><Text style={styles.legendText}>True first day only: pull fix back / overlap</Text></View>
            <View style={styles.legendPill}><Text style={styles.legendCode}>- / +</Text><Text style={styles.legendText}>True last day only: shorten / extend</Text></View>
          </View>
          <View style={styles.programmeCard}>
            <View style={styles.programmeHeader}><Text style={styles.programmeTitle}>Main 2 Week Programme</Text><Text style={styles.programmeSubtitle}>{programmeRows.length} plot{programmeRows.length === 1 ? '' : 's'} shown between {twoWeekDates}</Text></View>
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View style={styles.tableWrap}>
                <View style={styles.weekHeaderRow}><Text style={[styles.weekHeaderBlank, styles.plotCell]} /><Text style={[styles.weekHeaderBlank, styles.typeCell]} />{weekGroups.map((week, index) => <Text key={`${week}-${index}`} style={styles.weekGroup}>{formatWeekLabel(week)}</Text>)}</View>
                <View style={styles.dateHeaderRow}><Text style={[styles.headerCell, styles.plotCell]}>Plot</Text><Text style={[styles.headerCell, styles.typeCell]}>Type</Text>{windowDays.map((item) => <View key={item.key} style={[styles.dayHeader, item.nonWorking ? styles.weekendHeader : null]}><Text style={styles.dayHeaderName}>{item.dayName}</Text><Text style={styles.dayHeaderDate}>{formatShortDate(item.date)}</Text></View>)}</View>
                {programmeRows.map((row, rowIndex) => {
                  const template = getTemplateForPlot(row.plot, plotTemplates);
                  return <View key={row.plot.id} style={[styles.tableRow, rowIndex % 2 ? styles.altRow : null]}><Text style={[styles.bodyCell, styles.plotCell]}>{row.plot.plotNo}</Text><Text style={[styles.bodyCell, styles.typeCell]}>{template.name}</Text>{row.dailyActivities.map((activities, index) => { const item = windowDays[index]; return <View key={`${row.plot.id}-${item.key}`} style={[styles.dayCell, item.nonWorking ? styles.weekendCell : null, activities.length ? styles.activeDayCell : null]}>{activities.map((activity) => { const isFirstDay = !activityExistsOnAdjacentWorkingDay(row.plot, activity.code, item.absoluteDayIndex, -1); const isLastDay = !activityExistsOnAdjacentWorkingDay(row.plot, activity.code, item.absoluteDayIndex, 1); const showPullBack = isFirstDay && !isLastDay; return <View key={`${activity.code}-${index}`} style={styles.activityBlock}><Text style={styles.dayCellText}>{simplifyActivity(activity.displayText || activity.code)}</Text><View style={styles.activityControls}>{showPullBack ? <Pressable style={styles.pullBackButton} onPress={() => pullFixBack(row.plot, activity)}><Text style={styles.controlText}>←</Text></Pressable> : null}{isLastDay ? <><Pressable style={styles.fixBackButton} onPress={() => moveFixDuration(row.plot, activity, -1)}><Text style={styles.controlText}>-</Text></Pressable><Pressable style={styles.fixForwardButton} onPress={() => moveFixDuration(row.plot, activity, 1)}><Text style={styles.controlText}>+</Text></Pressable></> : null}</View></View>; })}</View>; })}</View>;
                })}
              </View>
            </ScrollView>
          </View>
        </>
      )}
    </AppScreen>
  );
}

function MiniStat({ label, value }: { label: string | number; value: string | number }) {
  return <View style={styles.miniStat}><Text style={styles.miniStatValue}>{value}</Text><Text style={styles.miniStatLabel}>{label}</Text></View>;
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
  moveNotice: { backgroundColor: '#dcfce7', borderColor: '#86efac', borderWidth: 1, color: '#166534', fontWeight: '900', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  viewPanel: { backgroundColor: '#f8fafc', borderColor: '#e2e8f0', borderWidth: 1, borderRadius: 14, padding: 12, gap: 8 },
  viewPanelTitle: { color: '#475569', fontWeight: '900', textAlign: 'center' },
  quickActionRow: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 10 },
  viewButton: { backgroundColor: '#e2e8f0', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
  viewButtonText: { color: '#334155', fontWeight: '900' },
  currentWeekButton: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#eff6ff', borderRadius: 999, borderWidth: 1, borderColor: '#bfdbfe', paddingHorizontal: 12, paddingVertical: 8 },
  currentWeekButtonText: { color: '#1d4ed8', fontSize: 12, fontWeight: '900' },
  viewNote: { color: '#64748b', fontSize: 12, fontWeight: '800', textAlign: 'center' },
  summaryStrip: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  miniStat: { flex: 1, minWidth: 120, backgroundColor: '#f8fafc', borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', padding: 12 },
  miniStatValue: { color: '#0f172a', fontSize: 18, fontWeight: '900' },
  miniStatLabel: { color: '#64748b', fontSize: 12, fontWeight: '800', marginTop: 2 },
  emptyCard: { backgroundColor: '#ffffff', borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', padding: 22, gap: 8, alignItems: 'flex-start' },
  emptyTitle: { color: '#0f172a', fontSize: 20, fontWeight: '900' },
  emptyText: { color: '#64748b', fontSize: 14, lineHeight: 20 },
  emptyButton: { marginTop: 8, backgroundColor: '#0f172a', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  emptyButtonText: { color: '#ffffff', fontWeight: '900' },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  legendPill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 999, backgroundColor: '#dbeafe', borderWidth: 1, borderColor: '#93c5fd' },
  legendCode: { backgroundColor: '#173b5f', color: '#ffffff', fontWeight: '900', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  legendText: { color: '#334155', fontSize: 12, fontWeight: '900' },
  programmeCard: { backgroundColor: '#ffffff', borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', padding: 16, gap: 12 },
  programmeHeader: { gap: 4 },
  programmeTitle: { color: '#0f172a', fontSize: 24, fontWeight: '900' },
  programmeSubtitle: { color: '#64748b', fontSize: 13, fontWeight: '800' },
  tableWrap: { borderWidth: 1, borderColor: '#9fb6ce', borderRadius: 12, overflow: 'hidden' },
  weekHeaderRow: { flexDirection: 'row' },
  weekHeaderBlank: { backgroundColor: '#173b5f', borderRightWidth: 1, borderRightColor: '#9fb6ce', minHeight: 34 },
  weekGroup: { width: WEEK_WIDTH, backgroundColor: '#173b5f', color: '#ffffff', fontWeight: '900', fontSize: 13, textAlign: 'center', padding: 9, borderRightWidth: 1, borderRightColor: '#9fb6ce' },
  dateHeaderRow: { flexDirection: 'row' },
  tableRow: { flexDirection: 'row', alignItems: 'stretch' },
  altRow: { backgroundColor: '#f8fbff' },
  headerCell: { backgroundColor: '#173b5f', color: '#ffffff', fontWeight: '900', fontSize: 12, padding: 8, borderTopWidth: 1, borderTopColor: '#9fb6ce', borderRightWidth: 1, borderRightColor: '#9fb6ce', textAlign: 'center' },
  plotCell: { width: PLOT_WIDTH },
  typeCell: { width: TYPE_WIDTH },
  dayHeader: { width: DAY_WIDTH, backgroundColor: '#173b5f', borderTopWidth: 1, borderTopColor: '#9fb6ce', borderRightWidth: 1, borderRightColor: '#9fb6ce', alignItems: 'center', paddingVertical: 7 },
  weekendHeader: { backgroundColor: '#24496e' },
  dayHeaderName: { color: '#ffffff', fontWeight: '900', fontSize: 12 },
  dayHeaderDate: { color: '#dbeafe', fontWeight: '800', fontSize: 10, marginTop: 2 },
  bodyCell: { color: '#0f172a', padding: 8, borderTopWidth: 1, borderTopColor: '#c8d7e6', borderRightWidth: 1, borderRightColor: '#c8d7e6', fontWeight: '900', textAlign: 'center', backgroundColor: '#ffffff' },
  dayCell: { width: DAY_WIDTH, minHeight: 70, borderTopWidth: 1, borderTopColor: '#c8d7e6', borderRightWidth: 1, borderRightColor: '#c8d7e6', alignItems: 'center', justifyContent: 'center', padding: 4, gap: 4 },
  weekendCell: { backgroundColor: '#f1f5f9' },
  activeDayCell: { backgroundColor: '#dbeafe' },
  activityBlock: { alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 3 },
  dayCellText: { color: '#0f172a', fontSize: 10, lineHeight: 12, fontWeight: '900', textAlign: 'center' },
  activityControls: { flexDirection: 'row', gap: 4, flexWrap: 'wrap', justifyContent: 'center' },
  pullBackButton: { backgroundColor: '#173b5f', borderRadius: 8, width: 25, height: 25, alignItems: 'center', justifyContent: 'center' },
  fixBackButton: { backgroundColor: '#991b1b', borderRadius: 8, width: 25, height: 25, alignItems: 'center', justifyContent: 'center' },
  fixForwardButton: { backgroundColor: '#166534', borderRadius: 8, width: 25, height: 25, alignItems: 'center', justifyContent: 'center' },
  controlText: { color: '#ffffff', fontWeight: '900' },
});