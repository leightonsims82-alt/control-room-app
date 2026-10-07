import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { useSitePlanner } from '../../data/sitePlannerStore';
import { formatBritishDate, formatCalendarWeek, formatProgrammeDate, getCurrentProgrammeWeek, getProgrammeWeekForDate } from '../../utils/programmeDates';
import { getActivitiesForTemplateDay, getActivityProgrammeRange, getHouseTypeTemplates, getPlotCompletionProgrammeWeek, getTemplateForPlot, getWorkingDayNumbers, isProgrammeWorkingDay, normaliseProgrammeWeek, SiteProgrammeSetup, TemplateActivity, TemplateSitePlot } from '../../utils/templateProgramme';

const PROGRAMME_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const DAY_WIDTH = 98;
const PLOT_WIDTH = 82;
const TYPE_WIDTH = 110;
const WEEK_WIDTH = DAY_WIDTH * 7;

type ProgrammeRow = { plot: TemplateSitePlot; dailyActivities: TemplateActivity[][] };

function formatWeekLabel(week: number, siteSetup: SiteProgrammeSetup) { return formatCalendarWeek(siteSetup.programmeStartDate, week, siteSetup.calendarWeekOne); }
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
    return { key: `${absoluteDayIndex}-${columnIndex}`, absoluteDayIndex, week, dayIndex, day, dayName: PROGRAMME_DAYS[dayIndex], date: formatProgrammeDate(siteSetup.programmeStartDate, week, day), nonWorking: !isProgrammeWorkingDay(day, siteSetup) };
  });
}

function formatDateRange(windowDays: ReturnType<typeof buildTwoWeekWindow>) {
  return `${windowDays[0].date} - ${windowDays[windowDays.length - 1].date}`;
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
  const { sitePlots, activityDelays, activityMoves, plotTemplates, siteSetup, setActivityDelay, setActivityMove, adjustActivityMove, resetActivityMovesForPlot } = useSitePlanner();
  const [startWeek, setStartWeek] = useState(() => normaliseProgrammeWeek(getCurrentProgrammeWeek(siteSetup.programmeStartDate)));
  const [viewDayOffset, setViewDayOffset] = useState(0);
  const [moveMessage, setMoveMessage] = useState('');
  const [actualProgressPlotId, setActualProgressPlotId] = useState('');
  const [actualProgressActivityCode, setActualProgressActivityCode] = useState('');
  const windowDays = useMemo(() => buildTwoWeekWindow(startWeek, viewDayOffset, siteSetup), [startWeek, viewDayOffset, siteSetup]);
  const twoWeekDates = formatDateRange(windowDays);
  const weekGroups = [windowDays[0].week, windowDays[7].week];
  const orderedSitePlots = useMemo(() => sitePlots.slice().sort((a, b) => getPlotCompletionProgrammeWeek(a, siteSetup) - getPlotCompletionProgrammeWeek(b, siteSetup) || plotNoSortValue(a.plotNo) - plotNoSortValue(b.plotNo)), [sitePlots, siteSetup]);
  const houseTypes = useMemo(() => getHouseTypeTemplates(plotTemplates), [plotTemplates]);
  const actualProgressPlot = orderedSitePlots.find((plot) => plot.id === actualProgressPlotId) ?? orderedSitePlots[0];
  const actualProgressTemplate = actualProgressPlot ? getTemplateForPlot(actualProgressPlot, plotTemplates) : undefined;
  const actualProgressActivities = useMemo(
    () => actualProgressTemplate ? actualProgressTemplate.activities.slice().sort((a, b) => a.order - b.order) : [],
    [actualProgressTemplate],
  );
  const actualProgressActivity = actualProgressActivities.find((activity) => activity.code === actualProgressActivityCode) ?? actualProgressActivities[0];

  useEffect(() => {
    if (!actualProgressPlotId && orderedSitePlots[0]?.id) setActualProgressPlotId(orderedSitePlots[0].id);
    if (actualProgressPlotId && !orderedSitePlots.some((plot) => plot.id === actualProgressPlotId)) setActualProgressPlotId(orderedSitePlots[0]?.id ?? '');
  }, [actualProgressPlotId, orderedSitePlots]);

  useEffect(() => {
    if (!actualProgressActivityCode && actualProgressActivities[0]?.code) setActualProgressActivityCode(actualProgressActivities[0].code);
    if (actualProgressActivityCode && !actualProgressActivities.some((activity) => activity.code === actualProgressActivityCode)) {
      setActualProgressActivityCode(actualProgressActivities[0]?.code ?? '');
    }
  }, [actualProgressActivityCode, actualProgressActivities]);

  const programmeRows = useMemo<ProgrammeRow[]>(() => orderedSitePlots.map((plot) => {
    const dailyActivities = windowDays.map((item) => getActivitiesForTemplateDay(plot, item.week, item.day, activityDelays, plotTemplates, siteSetup, activityMoves));
    return { plot, dailyActivities };
  }), [orderedSitePlots, windowDays, activityDelays, activityMoves, plotTemplates, siteSetup]);

  const activityExistsOnAdjacentWorkingDay = (plot: TemplateSitePlot, activityCode: string, absoluteDayIndex: number, direction: -1 | 1) => {
    const adjacent = findAdjacentWorkingProgrammeDay(absoluteDayIndex, direction, siteSetup);
    if (!adjacent) return false;
    return getActivitiesForTemplateDay(plot, adjacent.week, adjacent.day, activityDelays, plotTemplates, siteSetup, activityMoves).some((activity) => activity.code === activityCode);
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

  const getMoveDays = (plotId: string, activityCode: string) =>
    activityMoves.find((move) => move.plotId === plotId && move.activityCode === activityCode)?.deltaDays ?? 0;

  const moveActivityAndFollowing = async (plot: TemplateSitePlot, activity: TemplateActivity, change: number) => {
    await adjustActivityMove({ plotId: plot.id, activityCode: activity.code, deltaDays: change });
    const direction = change > 0 ? 'later' : 'earlier';
    setMoveMessage(`Plot ${plot.plotNo}: ${activity.displayText || activity.code} and all following work moved ${Math.abs(change)} working day${Math.abs(change) === 1 ? '' : 's'} ${direction}.`);
  };

  const setActivityToToday = async (plot: TemplateSitePlot, activity: TemplateActivity) => {
    const now = new Date();
    const today = formatBritishDate(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
    const week = getProgrammeWeekForDate(siteSetup.programmeStartDate, today);
    const day = now.getDay() === 0 ? 7 : now.getDay();
    const workingDays = getWorkingDayNumbers(siteSetup);
    const dayPosition = workingDays.indexOf(day);
    if (!week || dayPosition < 0) {
      setMoveMessage('Today is not a configured working day. Use the arrows to position the fix instead.');
      return;
    }
    const targetWorkingDay = (week - 1) * workingDays.length + dayPosition + 1;
    const template = getTemplateForPlot(plot, plotTemplates);
    const range = getActivityProgrammeRange(plot, template, activity, activityDelays, activityMoves, siteSetup);
    const requiredShift = targetWorkingDay - range.start;
    if (!requiredShift) {
      setMoveMessage(`Plot ${plot.plotNo}: ${activity.displayText || activity.code} is already positioned on today.`);
      return;
    }
    await setActivityMove({
      plotId: plot.id,
      activityCode: activity.code,
      deltaDays: getMoveDays(plot.id, activity.code) + requiredShift,
    });
    setMoveMessage(`Plot ${plot.plotNo}: ${activity.displayText || activity.code} anchored to today; all following work moved with it.`);
  };

  const resetWindow = () => { setStartWeek(normaliseProgrammeWeek(getCurrentProgrammeWeek(siteSetup.programmeStartDate))); setViewDayOffset(0); setMoveMessage(''); };

  return (
    <AppScreen>
      <View style={styles.header}>
        <View style={styles.headerMain}>
          <Text style={styles.kicker}>Live lookahead</Text>
          <Text style={styles.title}>2 Week Programme</Text>
          <Text style={styles.subtitle}>Use the arrows on the first day of a fix to move that fix and every following activity earlier or later. Use Today when the plot’s real site position has reached that fix now.</Text>
        </View>
        <View style={styles.headerBadge}><Ionicons name="calendar-outline" size={16} color="#2563eb" /><Text style={styles.headerBadgeText}>{twoWeekDates}</Text></View>
      </View>

      <View style={styles.controlPanel}>
        <View style={styles.weekControls}>
          <Pressable style={styles.weekButton} onPress={() => { setMoveMessage(''); setStartWeek((week) => normaliseProgrammeWeek(week - 1)); }}><Ionicons name="chevron-back" size={16} color="#ffffff" /><Text style={styles.weekButtonText}>Previous week</Text></Pressable>
          <View style={styles.weekCentre}><Text style={styles.weekLabel}>{formatWeekLabel(weekGroups[0], siteSetup)} + {formatWeekLabel(weekGroups[1], siteSetup)}</Text><Text style={styles.weekDateLabel}>{twoWeekDates}</Text></View>
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
        <View style={styles.actualProgressPanel}>
          <View style={styles.actualProgressHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.actualProgressTitle}>Update actual site progress</Text>
              <Text style={styles.actualProgressHelp}>If a plot is behind or ahead of the generated programme, select the plot and the fix it is actually at today. Programme Buddy will move that fix and every following activity to the correct live position.</Text>
            </View>
            {actualProgressPlot && activityMoves.some((move) => move.plotId === actualProgressPlot.id) ? (
              <Pressable style={styles.resetLiveButton} onPress={() => resetActivityMovesForPlot(actualProgressPlot.id)}>
                <Text style={styles.resetLiveButtonText}>Reset Plot {actualProgressPlot.plotNo}</Text>
              </Pressable>
            ) : null}
          </View>
          <Text style={styles.actualProgressLabel}>1. Plot</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.progressChipRow}>
              {orderedSitePlots.map((plot) => (
                <Pressable key={plot.id} accessibilityLabel={`Select Plot ${plot.plotNo} for actual progress`} onPress={() => { setActualProgressPlotId(plot.id); setActualProgressActivityCode(''); }} style={[styles.progressChip, actualProgressPlot?.id === plot.id ? styles.progressChipActive : null]}>
                  <Text style={[styles.progressChipText, actualProgressPlot?.id === plot.id ? styles.progressChipTextActive : null]}>Plot {plot.plotNo}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
          <Text style={styles.actualProgressLabel}>2. Actual fix today</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View style={styles.progressChipRow}>
              {actualProgressActivities.map((activity) => (
                <Pressable key={activity.code} accessibilityLabel={`Select ${activity.code} as actual fix`} onPress={() => setActualProgressActivityCode(activity.code)} style={[styles.progressFixChip, actualProgressActivity?.code === activity.code ? styles.progressFixChipActive : null]}>
                  <Text style={[styles.progressFixText, actualProgressActivity?.code === activity.code ? styles.progressFixTextActive : null]}>{activity.code}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
          <Pressable
            disabled={!actualProgressPlot || !actualProgressActivity}
            accessibilityLabel="Set selected actual fix to today"
            style={[styles.actualProgressAction, (!actualProgressPlot || !actualProgressActivity) ? styles.actualProgressActionDisabled : null]}
            onPress={() => actualProgressPlot && actualProgressActivity ? setActivityToToday(actualProgressPlot, actualProgressActivity) : undefined}
          >
            <Text style={styles.actualProgressActionText}>{actualProgressPlot && actualProgressActivity ? `Set Plot ${actualProgressPlot.plotNo} — ${actualProgressActivity.code} to today` : 'Select a plot and fix'}</Text>
          </Pressable>
        </View>
        <View style={styles.summaryStrip}><MiniStat label="Active plots" value={sitePlots.length} /><MiniStat label="View" value="All trades" /><MiniStat label="Window" value="14 days" /></View>
      </View>

      {sitePlots.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="add-circle-outline" size={34} color="#2563eb" />
          <Text style={styles.emptyTitle}>No plots added yet</Text>
          <Text style={styles.emptyText}>Add plot numbers, plot types and Plot Completion Dates, then return here to view the full 2 Week Programme.</Text>
          <Link href="/master" asChild><Pressable style={styles.emptyButton}><Text style={styles.emptyButtonText}>Go to Master</Text></Pressable></Link>
        </View>
      ) : (
        <>
          <View style={styles.legendRow}>
            <View style={styles.legendPill}><View style={styles.legendDot} /><Text style={styles.legendText}>Blue cells = planned work</Text></View>
            <View style={styles.legendPill}><Text style={styles.legendCode}>« ← → »</Text><Text style={styles.legendText}>First day: move this fix + all following work by 5/1 working days</Text></View>
            <View style={styles.legendPill}><Text style={styles.legendCode}>Today</Text><Text style={styles.legendText}>Anchor the real current fix to today</Text></View>
            <View style={styles.legendPill}><Text style={styles.legendCode}>- / +</Text><Text style={styles.legendText}>Last day: shorten / extend this fix duration</Text></View>
          </View>
          <View style={styles.programmeCard}>
            <View style={styles.programmeHeader}><Text style={styles.programmeTitle}>Main 2 Week Programme</Text><Text style={styles.programmeSubtitle}>{programmeRows.length} plot{programmeRows.length === 1 ? '' : 's'} shown between {twoWeekDates}</Text></View>
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View style={styles.tableWrap}>
                <View style={styles.weekHeaderRow}><Text style={[styles.weekHeaderBlank, styles.plotCell]} /><Text style={[styles.weekHeaderBlank, styles.typeCell]} />{weekGroups.map((week, index) => <Text key={`${week}-${index}`} style={styles.weekGroup}>{formatWeekLabel(week, siteSetup)}</Text>)}</View>
                <View style={styles.dateHeaderRow}><Text style={[styles.headerCell, styles.plotCell]}>Plot</Text><Text style={[styles.headerCell, styles.typeCell]}>Type</Text>{windowDays.map((item) => <View key={item.key} style={[styles.dayHeader, item.nonWorking ? styles.weekendHeader : null]}><Text style={styles.dayHeaderName}>{item.dayName}</Text><Text style={styles.dayHeaderDate}>{item.date}</Text></View>)}</View>
                {programmeRows.map((row, rowIndex) => {
                  const template = getTemplateForPlot(row.plot, plotTemplates);
                  const houseType = houseTypes.find((item) => item.id === (row.plot.houseTypeId ?? row.plot.templateId));
                  return <View key={row.plot.id} style={[styles.tableRow, rowIndex % 2 ? styles.altRow : null]}><View style={[styles.bodyCell, styles.plotCell, styles.plotCellWrap]}><Text style={styles.plotNumber}>{row.plot.plotNo}</Text>{activityMoves.some((move) => move.plotId === row.plot.id) ? <Pressable accessibilityLabel={`Reset live movements for Plot ${row.plot.plotNo}`} onPress={() => resetActivityMovesForPlot(row.plot.id)}><Text style={styles.resetPlotMove}>Reset moves</Text></Pressable> : null}</View><Text style={[styles.bodyCell, styles.typeCell]}>{houseType?.name ?? template.name}</Text>{row.dailyActivities.map((activities, index) => { const item = windowDays[index]; return <View key={`${row.plot.id}-${item.key}`} style={[styles.dayCell, item.nonWorking ? styles.weekendCell : null, activities.length ? styles.activeDayCell : null]}>{activities.map((activity) => { const isFirstDay = !activityExistsOnAdjacentWorkingDay(row.plot, activity.code, item.absoluteDayIndex, -1); const isLastDay = !activityExistsOnAdjacentWorkingDay(row.plot, activity.code, item.absoluteDayIndex, 1); return <View key={`${activity.code}-${index}`} style={styles.activityBlock}><Text style={styles.dayCellText}>{simplifyActivity(activity.displayText || activity.code)}</Text><View style={styles.activityControls}>{isFirstDay ? <><Pressable accessibilityLabel={`Move ${activity.displayText || activity.code} 5 days earlier for Plot ${row.plot.plotNo}`} style={styles.pullBackButton} onPress={() => moveActivityAndFollowing(row.plot, activity, -5)}><Text style={styles.controlText}>«</Text></Pressable><Pressable accessibilityLabel={`Move ${activity.displayText || activity.code} 1 day earlier for Plot ${row.plot.plotNo}`} style={styles.pullBackButton} onPress={() => moveActivityAndFollowing(row.plot, activity, -1)}><Text style={styles.controlText}>←</Text></Pressable><Pressable accessibilityLabel={`Move ${activity.displayText || activity.code} 1 day later for Plot ${row.plot.plotNo}`} style={styles.fixForwardButton} onPress={() => moveActivityAndFollowing(row.plot, activity, 1)}><Text style={styles.controlText}>→</Text></Pressable><Pressable accessibilityLabel={`Move ${activity.displayText || activity.code} 5 days later for Plot ${row.plot.plotNo}`} style={styles.fixForwardButton} onPress={() => moveActivityAndFollowing(row.plot, activity, 5)}><Text style={styles.controlText}>»</Text></Pressable><Pressable accessibilityLabel={`Set ${activity.displayText || activity.code} to today for Plot ${row.plot.plotNo}`} style={styles.todayButton} onPress={() => setActivityToToday(row.plot, activity)}><Text style={styles.todayButtonText}>Today</Text></Pressable></> : null}{isLastDay ? <><Pressable style={styles.fixBackButton} onPress={() => moveFixDuration(row.plot, activity, -1)}><Text style={styles.controlText}>-</Text></Pressable><Pressable style={styles.fixForwardButton} onPress={() => moveFixDuration(row.plot, activity, 1)}><Text style={styles.controlText}>+</Text></Pressable></> : null}</View></View>; })}</View>; })}</View>;
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
  actualProgressPanel: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#93c5fd', borderRadius: 16, padding: 14, gap: 9 },
  actualProgressHeader: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' },
  actualProgressTitle: { color: '#0f172a', fontSize: 16, fontWeight: '900' },
  actualProgressHelp: { color: '#475569', fontSize: 12, lineHeight: 18, fontWeight: '700', marginTop: 3 },
  actualProgressLabel: { color: '#1e3a5f', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  progressChipRow: { flexDirection: 'row', gap: 7, paddingVertical: 2 },
  progressChip: { borderWidth: 1, borderColor: '#93c5fd', borderRadius: 999, backgroundColor: '#ffffff', paddingHorizontal: 11, paddingVertical: 7 },
  progressChipActive: { backgroundColor: '#173b5f', borderColor: '#173b5f' },
  progressChipText: { color: '#1d4ed8', fontSize: 11, fontWeight: '900' },
  progressChipTextActive: { color: '#ffffff' },
  progressFixChip: { borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 10, backgroundColor: '#ffffff', paddingHorizontal: 10, paddingVertical: 7 },
  progressFixChipActive: { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' },
  progressFixText: { color: '#334155', fontSize: 10, fontWeight: '800' },
  progressFixTextActive: { color: '#ffffff' },
  actualProgressAction: { alignSelf: 'flex-start', backgroundColor: '#166534', borderRadius: 11, paddingHorizontal: 14, paddingVertical: 10 },
  actualProgressActionDisabled: { opacity: 0.45 },
  actualProgressActionText: { color: '#ffffff', fontWeight: '900', fontSize: 12 },
  resetLiveButton: { backgroundColor: '#fff1f2', borderWidth: 1, borderColor: '#fda4af', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  resetLiveButtonText: { color: '#be123c', fontWeight: '900', fontSize: 11 },
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
  todayButton: { backgroundColor: '#fef3c7', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 },
  todayButtonText: { color: '#92400e', fontSize: 8, fontWeight: '900' },
  plotCellWrap: { alignItems: 'center', justifyContent: 'center', gap: 4 },
  plotNumber: { color: '#0f172a', fontWeight: '900', fontSize: 12 },
  resetPlotMove: { color: '#b91c1c', fontSize: 8, fontWeight: '900', textDecorationLine: 'underline' },
  pullBackButton: { backgroundColor: '#173b5f', borderRadius: 8, width: 25, height: 25, alignItems: 'center', justifyContent: 'center' },
  fixBackButton: { backgroundColor: '#991b1b', borderRadius: 8, width: 25, height: 25, alignItems: 'center', justifyContent: 'center' },
  fixForwardButton: { backgroundColor: '#166534', borderRadius: 8, width: 25, height: 25, alignItems: 'center', justifyContent: 'center' },
  controlText: { color: '#ffffff', fontWeight: '900' },
});
