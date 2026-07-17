import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { isQAActivity } from '../../data/qaTemplates';
import { useQAData } from '../../data/qaStore';
import { useSitePlanner } from '../../data/sitePlannerStore';
import { QAInspectionStatus } from '../../types/qa';
import { getActivitiesForTemplateDay, getTemplateForPlot, isProgrammeWorkingDay, normaliseProgrammeWeek, orderedActivities, SiteProgrammeSetup, TemplateActivity, TemplateSitePlot } from '../../utils/templateProgramme';

const PROGRAMME_START_DATE = new Date(2026, 6, 6);
const PROGRAMME_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const DAY_WIDTH = 98;
const PLOT_WIDTH = 82;
const TYPE_WIDTH = 110;
const WEEK_WIDTH = DAY_WIDTH * 7;

type ProgrammeRow = { plot: TemplateSitePlot; dailyActivities: TemplateActivity[][] };
type SelectedActivity = { plotId: string; templateId: string; activityCode: string };

function formatWeekLabel(week: number) { return `WK${String(normaliseProgrammeWeek(week)).padStart(2, '0')}`; }
function getProgrammeDateFromIndex(dayIndexFromStart: number) { const date = new Date(PROGRAMME_START_DATE); date.setDate(PROGRAMME_START_DATE.getDate() + dayIndexFromStart); return date; }
function getCurrentProgrammeWeek() { const today = new Date(); const days = Math.floor((today.getTime() - PROGRAMME_START_DATE.getTime()) / (1000 * 60 * 60 * 24)); return normaliseProgrammeWeek(Math.floor(days / 7) + 1); }
function formatShortDate(date: Date) { return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }); }
function plotNoSortValue(plotNo: string) { const parsed = Number(plotNo.replace(/[^0-9.]/g, '')); return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER; }

function getProgrammeDayFromAbsoluteIndex(absoluteDayIndex: number) {
  const week = normaliseProgrammeWeek(Math.floor(absoluteDayIndex / 7) + 1);
  const dayIndex = ((absoluteDayIndex % 7) + 7) % 7;
  return { week, day: dayIndex + 1 };
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

function qaTone(status?: QAInspectionStatus) {
  if (status === 'Passed') return { backgroundColor: '#dcfce7', borderColor: '#86efac', color: '#166534' };
  if (status === 'Failed') return { backgroundColor: '#fee2e2', borderColor: '#fecaca', color: '#991b1b' };
  if (status === 'Incomplete') return { backgroundColor: '#fef3c7', borderColor: '#fde68a', color: '#92400e' };
  return { backgroundColor: '#f3e8ff', borderColor: '#ddd6fe', color: '#7c3aed' };
}

export default function TwoWeekProgrammeScreen() {
  const router = useRouter();
  const { sitePlots, activityDelays, plotTemplates, siteSetup, setActivityDelay, updatePlotTemplate } = useSitePlanner();
  const { inspections, startInspection } = useQAData();
  const { width } = useWindowDimensions();
  const [startWeek, setStartWeek] = useState(getCurrentProgrammeWeek());
  const [viewDayOffset, setViewDayOffset] = useState(0);
  const [moveMessage, setMoveMessage] = useState('');
  const [selectedEdit, setSelectedEdit] = useState<SelectedActivity | null>(null);
  const [draftOverlapEnabled, setDraftOverlapEnabled] = useState(false);
  const [draftOverlapDays, setDraftOverlapDays] = useState(1);
  const [draftDuration, setDraftDuration] = useState(1);
  const [savingEdit, setSavingEdit] = useState(false);

  const windowDays = useMemo(() => buildTwoWeekWindow(startWeek, viewDayOffset, siteSetup), [startWeek, viewDayOffset, siteSetup]);
  const twoWeekDates = formatDateRange(windowDays);
  const weekGroups = [windowDays[0].week, windowDays[7].week];
  const orderedSitePlots = useMemo(() => sitePlots.slice().sort((a, b) => a.stage9CompleteWeek - b.stage9CompleteWeek || plotNoSortValue(a.plotNo) - plotNoSortValue(b.plotNo)), [sitePlots]);

  const programmeRows = useMemo<ProgrammeRow[]>(() => orderedSitePlots.map((plot) => ({
    plot,
    dailyActivities: windowDays.map((item) => getActivitiesForTemplateDay(plot, item.week, item.day, activityDelays, plotTemplates, siteSetup)),
  })), [orderedSitePlots, windowDays, activityDelays, plotTemplates, siteSetup]);

  const selectedPlot = selectedEdit ? sitePlots.find((plot) => plot.id === selectedEdit.plotId) : undefined;
  const selectedTemplate = selectedEdit ? plotTemplates.find((template) => template.id === selectedEdit.templateId) : undefined;
  const selectedActivities = selectedTemplate ? orderedActivities(selectedTemplate) : [];
  const selectedActivityIndex = selectedEdit ? selectedActivities.findIndex((activity) => activity.code === selectedEdit.activityCode) : -1;
  const selectedActivity = selectedActivityIndex >= 0 ? selectedActivities[selectedActivityIndex] : undefined;
  const previousActivity = selectedActivityIndex > 0 ? selectedActivities[selectedActivityIndex - 1] : undefined;
  const isWideEditor = width >= 760;

  const activityExistsOnAdjacentWorkingDay = (plot: TemplateSitePlot, activityCode: string, absoluteDayIndex: number, direction: -1 | 1) => {
    const adjacent = findAdjacentWorkingProgrammeDay(absoluteDayIndex, direction, siteSetup);
    if (!adjacent) return false;
    return getActivitiesForTemplateDay(plot, adjacent.week, adjacent.day, activityDelays, plotTemplates, siteSetup).some((activity) => activity.code === activityCode);
  };

  const getDelayDays = (plotId: string, activityCode: string) => activityDelays.find((delay) => delay.plotId === plotId && delay.activityCode === activityCode)?.delayDays ?? 0;

  const getOverlapDays = (templateId: string, activityCode: string) => {
    const template = plotTemplates.find((item) => item.id === templateId);
    if (!template) return 0;
    const activities = orderedActivities(template);
    const index = activities.findIndex((activity) => activity.code === activityCode);
    if (index <= 0) return 0;
    const current = activities[index];
    const previous = activities[index - 1];
    const linkedToPrevious = current.overlapAllowed && current.overlapLinkCode === previous.code && current.overlapStartFrom === 'start';
    if (!linkedToPrevious) return 0;
    return Math.max(0, Math.max(1, previous.durationDays) - (current.overlapLagDays ?? previous.durationDays));
  };

  const latestInspection = (plotId: string, activityCode: string) => inspections
    .filter((inspection) => inspection.plotId === plotId && inspection.activityCode === activityCode)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];

  const openActivityEditor = (plot: TemplateSitePlot, activity: TemplateActivity) => {
    const template = getTemplateForPlot(plot, plotTemplates);
    const activities = orderedActivities(template);
    const index = activities.findIndex((item) => item.code === activity.code);
    const previous = index > 0 ? activities[index - 1] : undefined;
    const overlapDays = previous ? getOverlapDays(template.id, activity.code) : 0;
    const currentDuration = Math.max(1, activity.durationDays + getDelayDays(plot.id, activity.code));

    setDraftOverlapEnabled(overlapDays > 0);
    setDraftOverlapDays(Math.max(1, overlapDays || 1));
    setDraftDuration(currentDuration);
    setSelectedEdit({ plotId: plot.id, templateId: template.id, activityCode: activity.code });
  };

  const openProgrammeActivity = async (plot: TemplateSitePlot, activity: TemplateActivity) => {
    if (!isQAActivity(activity)) {
      openActivityEditor(plot, activity);
      return;
    }
    const existing = latestInspection(plot.id, activity.code);
    if (existing) {
      router.push(`/qa/inspection/${existing.id}`);
      return;
    }
    const template = getTemplateForPlot(plot, plotTemplates);
    const inspection = await startInspection({
      plotId: plot.id,
      plotNo: plot.plotNo,
      templateId: template.id,
      activityCode: activity.code,
      activityName: activity.displayText || activity.code,
      stage: activity.stage,
      trade: activity.trade,
    });
    router.push(`/qa/inspection/${inspection.id}`);
  };

  const closeActivityEditor = () => {
    if (savingEdit) return;
    setSelectedEdit(null);
  };

  const applyActivityEdit = async () => {
    if (!selectedPlot || !selectedTemplate || !selectedActivity) return;
    setSavingEdit(true);
    try {
      const delayDays = draftDuration - selectedActivity.durationDays;
      const canOverlap = Boolean(previousActivity && draftOverlapEnabled);
      const previousDuration = Math.max(1, previousActivity?.durationDays ?? 1);
      const overlapDays = Math.min(previousDuration, Math.max(1, draftOverlapDays));
      const overlapLagDays = Math.max(0, previousDuration - overlapDays);
      const nextActivities = selectedTemplate.activities.map((activity) => {
        if (activity.code !== selectedActivity.code) return activity;
        if (!canOverlap || !previousActivity) {
          return { ...activity, overlapAllowed: false, overlapLinkCode: undefined, overlapStartFrom: 'start' as const, overlapLagDays: 0 };
        }
        return {
          ...activity,
          overlapAllowed: true,
          overlapLinkCode: previousActivity.code,
          overlapStartFrom: 'start' as const,
          overlapLagDays,
        };
      });

      await Promise.all([
        setActivityDelay({ plotId: selectedPlot.id, activityCode: selectedActivity.code, delayDays }),
        updatePlotTemplate({ ...selectedTemplate, activities: nextActivities }),
      ]);

      const relationship = canOverlap && previousActivity ? `overlapping ${previousActivity.displayText} by ${overlapDays} day${overlapDays === 1 ? '' : 's'}` : 'starting after the previous activity';
      setMoveMessage(`Plot ${selectedPlot.plotNo} ${selectedActivity.displayText}: ${draftDuration} day${draftDuration === 1 ? '' : 's'}, ${relationship}.`);
      setSelectedEdit(null);
    } finally {
      setSavingEdit(false);
    }
  };

  const resetWindow = () => { setStartWeek(getCurrentProgrammeWeek()); setViewDayOffset(0); setMoveMessage(''); };

  return (
    <AppScreen>
      <View style={styles.header}>
        <View style={styles.headerMain}>
          <Text style={styles.kicker}>Live lookahead</Text>
          <Text style={styles.title}>2 Week Programme</Text>
          <Text style={styles.subtitle}>Select programme work to edit overlap or duration. Select a QA gateway to inspect the plot.</Text>
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
          <View style={styles.editHint}>
            <Ionicons name="hand-left-outline" size={18} color="#1d4ed8" />
            <Text style={styles.editHintText}>Normal activity: edit overlap or duration. Purple QA activity: open the inspection and plot story.</Text>
          </View>
          <View style={styles.programmeCard}>
            <View style={styles.programmeHeader}><Text style={styles.programmeTitle}>Main 2 Week Programme</Text><Text style={styles.programmeSubtitle}>{programmeRows.length} plot{programmeRows.length === 1 ? '' : 's'} shown between {twoWeekDates}</Text></View>
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View style={styles.tableWrap}>
                <View style={styles.weekHeaderRow}><Text style={[styles.weekHeaderBlank, styles.plotCell]} /><Text style={[styles.weekHeaderBlank, styles.typeCell]} />{weekGroups.map((week, index) => <Text key={`${week}-${index}`} style={styles.weekGroup}>{formatWeekLabel(week)}</Text>)}</View>
                <View style={styles.dateHeaderRow}><Text style={[styles.headerCell, styles.plotCell]}>Plot</Text><Text style={[styles.headerCell, styles.typeCell]}>Type</Text>{windowDays.map((item) => <View key={item.key} style={[styles.dayHeader, item.nonWorking ? styles.weekendHeader : null]}><Text style={styles.dayHeaderName}>{item.dayName}</Text><Text style={styles.dayHeaderDate}>{formatShortDate(item.date)}</Text></View>)}</View>
                {programmeRows.map((row, rowIndex) => {
                  const template = getTemplateForPlot(row.plot, plotTemplates);
                  return (
                    <View key={row.plot.id} style={[styles.tableRow, rowIndex % 2 ? styles.altRow : null]}>
                      <Text style={[styles.bodyCell, styles.plotCell]}>{row.plot.plotNo}</Text>
                      <Text style={[styles.bodyCell, styles.typeCell]}>{template.name}</Text>
                      {row.dailyActivities.map((activities, index) => {
                        const item = windowDays[index];
                        return (
                          <View key={`${row.plot.id}-${item.key}`} style={[styles.dayCell, item.nonWorking ? styles.weekendCell : null, activities.length ? styles.activeDayCell : null]}>
                            {activities.map((activity) => {
                              const isFirstVisibleDay = !activityExistsOnAdjacentWorkingDay(row.plot, activity.code, item.absoluteDayIndex, -1);
                              const delayDays = getDelayDays(row.plot.id, activity.code);
                              const overlapDays = getOverlapDays(template.id, activity.code);
                              const hasAdjustment = delayDays !== 0 || overlapDays > 0;
                              const qaGateway = isQAActivity(activity);
                              const inspection = qaGateway ? latestInspection(row.plot.id, activity.code) : undefined;
                              const tone = qaTone(inspection?.status);
                              return (
                                <Pressable key={`${activity.code}-${index}`} style={({ pressed }) => [styles.activityBlock, qaGateway ? styles.qaGatewayBlock : null, pressed ? styles.activityBlockPressed : null]} onPress={() => openProgrammeActivity(row.plot, activity)}>
                                  <Text style={styles.dayCellText}>{simplifyActivity(activity.displayText || activity.code)}</Text>
                                  {qaGateway && isFirstVisibleDay ? (
                                    <View style={[styles.qaStatusBadge, { backgroundColor: tone.backgroundColor, borderColor: tone.borderColor }]}><Ionicons name="shield-checkmark-outline" size={10} color={tone.color} /><Text style={[styles.qaStatusBadgeText, { color: tone.color }]}>{inspection?.status || 'Due'}</Text></View>
                                  ) : null}
                                  {!qaGateway && isFirstVisibleDay && hasAdjustment ? (
                                    <View style={styles.adjustmentRow}>
                                      {overlapDays > 0 ? <View style={styles.adjustmentBadge}><Ionicons name="link-outline" size={10} color="#1d4ed8" /><Text style={styles.adjustmentBadgeText}>{overlapDays}d</Text></View> : null}
                                      {delayDays !== 0 ? <View style={styles.adjustmentBadge}><Ionicons name="time-outline" size={10} color="#1d4ed8" /><Text style={styles.adjustmentBadgeText}>{delayDays > 0 ? '+' : ''}{delayDays}d</Text></View> : null}
                                    </View>
                                  ) : null}
                                </Pressable>
                              );
                            })}
                          </View>
                        );
                      })}
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </>
      )}

      <Modal visible={Boolean(selectedEdit)} transparent animationType="fade" onRequestClose={closeActivityEditor}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeActivityEditor} />
          <View style={[styles.editorSheet, isWideEditor ? styles.editorSheetWide : styles.editorSheetNarrow]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.editorContent}>
              <View style={styles.editorHeader}>
                <View style={styles.editorHeaderText}>
                  <Text style={styles.editorKicker}>Edit activity</Text>
                  <Text style={styles.editorTitle}>{selectedActivity?.displayText ?? selectedActivity?.code ?? 'Activity'}</Text>
                  <Text style={styles.editorSubtitle}>Plot {selectedPlot?.plotNo ?? '-'} · {selectedActivity?.trade ?? '-'}</Text>
                </View>
                <Pressable style={styles.editorCloseButton} onPress={closeActivityEditor} disabled={savingEdit}><Ionicons name="close" size={20} color="#334155" /></Pressable>
              </View>

              <View style={styles.scopeNotice}>
                <Ionicons name="information-circle-outline" size={19} color="#1d4ed8" />
                <Text style={styles.scopeNoticeText}>Duration applies only to Plot {selectedPlot?.plotNo}. Overlap applies to every plot using the {selectedTemplate?.name} sequence.</Text>
              </View>

              <View style={styles.editorSection}>
                <Text style={styles.editorLabel}>Start relationship</Text>
                <View style={styles.modeRow}>
                  <Pressable style={[styles.modeButton, !draftOverlapEnabled ? styles.modeButtonActive : null]} onPress={() => setDraftOverlapEnabled(false)} disabled={savingEdit}><Text style={[styles.modeButtonText, !draftOverlapEnabled ? styles.modeButtonTextActive : null]}>After previous</Text></Pressable>
                  <Pressable style={[styles.modeButton, draftOverlapEnabled ? styles.modeButtonActive : null, !previousActivity ? styles.modeButtonDisabled : null]} onPress={() => previousActivity && setDraftOverlapEnabled(true)} disabled={!previousActivity || savingEdit}><Text style={[styles.modeButtonText, draftOverlapEnabled ? styles.modeButtonTextActive : null]}>Overlap previous</Text></Pressable>
                </View>
                {previousActivity ? <Text style={styles.editorHelper}>Previous activity: {previousActivity.displayText}</Text> : <Text style={styles.editorHelper}>This is the first activity in the sequence, so it cannot overlap a previous activity.</Text>}
              </View>

              {draftOverlapEnabled && previousActivity ? (
                <View style={styles.editorSection}>
                  <Text style={styles.editorLabel}>Overlap by</Text>
                  <Stepper value={draftOverlapDays} unit="working day" onDecrease={() => setDraftOverlapDays((value) => Math.max(1, value - 1))} onIncrease={() => setDraftOverlapDays((value) => Math.min(Math.max(1, previousActivity.durationDays), value + 1))} decreaseDisabled={draftOverlapDays <= 1 || savingEdit} increaseDisabled={draftOverlapDays >= Math.max(1, previousActivity.durationDays) || savingEdit} />
                  <Text style={styles.editorHelper}>{selectedActivity?.displayText} will begin {draftOverlapDays} working day{draftOverlapDays === 1 ? '' : 's'} before {previousActivity.displayText} finishes.</Text>
                </View>
              ) : null}

              <View style={styles.editorSection}>
                <Text style={styles.editorLabel}>Activity duration</Text>
                <Stepper value={draftDuration} unit="working day" onDecrease={() => setDraftDuration((value) => Math.max(1, value - 1))} onIncrease={() => setDraftDuration((value) => value + 1)} decreaseDisabled={draftDuration <= 1 || savingEdit} increaseDisabled={savingEdit} />
                <Text style={styles.editorHelper}>The duration adjustment is saved against Plot {selectedPlot?.plotNo} only.</Text>
              </View>

              <View style={styles.previewCard}>
                <Text style={styles.previewLabel}>Programme preview</Text>
                <Text style={styles.previewText}>{draftOverlapEnabled && previousActivity ? `${previousActivity.displayText} ↔ ${selectedActivity?.displayText}` : `${previousActivity?.displayText ?? 'Start'} → ${selectedActivity?.displayText ?? 'Activity'}`}</Text>
                <Text style={styles.previewSubtext}>{draftOverlapEnabled && previousActivity ? `${draftOverlapDays}-day overlap` : 'Sequential start'} · {draftDuration}-day duration</Text>
              </View>

              <View style={styles.editorActions}>
                <Pressable style={styles.cancelButton} onPress={closeActivityEditor} disabled={savingEdit}><Text style={styles.cancelButtonText}>Cancel</Text></Pressable>
                <Pressable style={[styles.applyButton, savingEdit ? styles.applyButtonDisabled : null]} onPress={applyActivityEdit} disabled={savingEdit}><Text style={styles.applyButtonText}>{savingEdit ? 'Applying…' : 'Apply change'}</Text></Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
}

function MiniStat({ label, value }: { label: string | number; value: string | number }) {
  return <View style={styles.miniStat}><Text style={styles.miniStatValue}>{value}</Text><Text style={styles.miniStatLabel}>{label}</Text></View>;
}

function Stepper({ value, unit, onDecrease, onIncrease, decreaseDisabled, increaseDisabled }: { value: number; unit: string; onDecrease: () => void; onIncrease: () => void; decreaseDisabled?: boolean; increaseDisabled?: boolean }) {
  return (
    <View style={styles.stepperRow}>
      <Pressable style={[styles.stepperButton, decreaseDisabled ? styles.stepperButtonDisabled : null]} onPress={onDecrease} disabled={decreaseDisabled}><Text style={styles.stepperButtonText}>−</Text></Pressable>
      <View style={styles.stepperValueWrap}><Text style={styles.stepperValue}>{value}</Text><Text style={styles.stepperUnit}>{unit}{value === 1 ? '' : 's'}</Text></View>
      <Pressable style={[styles.stepperButton, increaseDisabled ? styles.stepperButtonDisabled : null]} onPress={onIncrease} disabled={increaseDisabled}><Text style={styles.stepperButtonText}>+</Text></Pressable>
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
  editHint: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 14, paddingHorizontal: 13, paddingVertical: 10 },
  editHintText: { color: '#1e3a8a', fontSize: 12, fontWeight: '800', flex: 1 },
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
  dayCell: { width: DAY_WIDTH, minHeight: 70, borderTopWidth: 1, borderTopColor: '#c8d7e6', borderRightWidth: 1, borderRightColor: '#c8d7e6', alignItems: 'stretch', justifyContent: 'center', padding: 4, gap: 4 },
  weekendCell: { backgroundColor: '#f1f5f9' },
  activeDayCell: { backgroundColor: '#dbeafe' },
  activityBlock: { alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 7, paddingHorizontal: 3, borderRadius: 8 },
  qaGatewayBlock: { backgroundColor: '#faf5ff', borderWidth: 1, borderColor: '#d8b4fe' },
  activityBlockPressed: { backgroundColor: 'rgba(255, 255, 255, 0.72)' },
  dayCellText: { color: '#0f172a', fontSize: 10, lineHeight: 12, fontWeight: '900', textAlign: 'center' },
  qaStatusBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, borderWidth: 1, borderRadius: 999, paddingHorizontal: 5, paddingVertical: 2 },
  qaStatusBadgeText: { fontSize: 8, fontWeight: '900' },
  adjustmentRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 3 },
  adjustmentBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#93c5fd', borderRadius: 999, paddingHorizontal: 5, paddingVertical: 2 },
  adjustmentBadgeText: { color: '#1d4ed8', fontSize: 8, fontWeight: '900' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.48)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  editorSheet: { backgroundColor: '#ffffff', borderRadius: 22, borderWidth: 1, borderColor: '#dbeafe', maxHeight: '92%', shadowColor: '#0f172a', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.24, shadowRadius: 28, elevation: 18 },
  editorSheetWide: { width: 540 },
  editorSheetNarrow: { width: '100%', maxWidth: 540 },
  editorContent: { padding: 18, gap: 16 },
  editorHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  editorHeaderText: { flex: 1 },
  editorKicker: { color: '#2563eb', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  editorTitle: { color: '#0f172a', fontSize: 24, fontWeight: '900', marginTop: 3 },
  editorSubtitle: { color: '#64748b', fontSize: 13, fontWeight: '800', marginTop: 3 },
  editorCloseButton: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  scopeNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 13, padding: 11 },
  scopeNoticeText: { color: '#1e3a8a', fontSize: 12, lineHeight: 17, fontWeight: '800', flex: 1 },
  editorSection: { gap: 9 },
  editorLabel: { color: '#334155', fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.35 },
  editorHelper: { color: '#64748b', fontSize: 12, lineHeight: 17, fontWeight: '700' },
  modeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  modeButton: { flex: 1, minWidth: 145, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#f8fafc', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, alignItems: 'center' },
  modeButtonActive: { borderColor: '#173b5f', backgroundColor: '#173b5f' },
  modeButtonDisabled: { opacity: 0.45 },
  modeButtonText: { color: '#475569', fontSize: 13, fontWeight: '900' },
  modeButtonTextActive: { color: '#ffffff' },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepperButton: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#173b5f', alignItems: 'center', justifyContent: 'center' },
  stepperButtonDisabled: { backgroundColor: '#cbd5e1' },
  stepperButtonText: { color: '#ffffff', fontSize: 22, fontWeight: '900' },
  stepperValueWrap: { minWidth: 120, alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  stepperValue: { color: '#0f172a', fontSize: 22, fontWeight: '900' },
  stepperUnit: { color: '#64748b', fontSize: 11, fontWeight: '800' },
  previewCard: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, padding: 13, gap: 3 },
  previewLabel: { color: '#64748b', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  previewText: { color: '#0f172a', fontSize: 15, fontWeight: '900' },
  previewSubtext: { color: '#1d4ed8', fontSize: 12, fontWeight: '800' },
  editorActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' },
  cancelButton: { borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#ffffff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  cancelButtonText: { color: '#334155', fontWeight: '900' },
  applyButton: { backgroundColor: '#0f172a', borderRadius: 12, paddingHorizontal: 18, paddingVertical: 12 },
  applyButtonDisabled: { opacity: 0.55 },
  applyButtonText: { color: '#ffffff', fontWeight: '900' },
});
