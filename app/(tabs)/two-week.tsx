import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { SectionCard } from '../../components/SectionCard';
import { useSitePlanner } from '../../data/sitePlannerStore';
import { DAY_NAMES } from '../../utils/siteProgrammeEngine';
import { getChecklistIdForActivity } from '../../utils/inspectionChecklists';
import { formatProgrammeDayHeader } from '../../utils/programmeDates';
import { getInspectionStatusLabel, getLatestInspectionForActivity, INSPECTION_STORY_KEY, PlotInspectionStoryRecord } from '../../utils/inspectionRecords';
import {
  calendarDayIndexFromWeekDay,
  getActivitiesForTemplateDay,
  getActivityRangeForPlot,
  getHouseTypeLabel,
  getSortedSitePlots,
  getTemplateForPlot,
} from '../../utils/templateProgramme';

const TRADE_COLOURS: Record<string, { backgroundColor: string; borderColor: string; textColor: string }> = {
  Groundworks: { backgroundColor: '#dcfce7', borderColor: '#16a34a', textColor: '#14532d' },
  Brickwork: { backgroundColor: '#fee2e2', borderColor: '#dc2626', textColor: '#7f1d1d' },
  Scaffold: { backgroundColor: '#fef3c7', borderColor: '#f59e0b', textColor: '#78350f' },
  Roof: { backgroundColor: '#e0f2fe', borderColor: '#0284c7', textColor: '#075985' },
  Carpenter: { backgroundColor: '#ede9fe', borderColor: '#7c3aed', textColor: '#4c1d95' },
  Plumber: { backgroundColor: '#ccfbf1', borderColor: '#0d9488', textColor: '#134e4a' },
  Electrician: { backgroundColor: '#fef9c3', borderColor: '#ca8a04', textColor: '#713f12' },
  Sprinkler: { backgroundColor: '#dbeafe', borderColor: '#2563eb', textColor: '#1e3a8a' },
  Plastering: { backgroundColor: '#fae8ff', borderColor: '#c026d3', textColor: '#701a75' },
  Decorator: { backgroundColor: '#ffe4e6', borderColor: '#e11d48', textColor: '#881337' },
  Mastic: { backgroundColor: '#f1f5f9', borderColor: '#64748b', textColor: '#334155' },
  Flooring: { backgroundColor: '#ffedd5', borderColor: '#ea580c', textColor: '#7c2d12' },
  Cleaning: { backgroundColor: '#ecfeff', borderColor: '#0891b2', textColor: '#164e63' },
  'Handover / Site Team': { backgroundColor: '#e5e7eb', borderColor: '#111827', textColor: '#111827' },
};

function getTradeColour(trade: string) {
  return TRADE_COLOURS[trade] ?? { backgroundColor: '#f8fafc', borderColor: '#94a3b8', textColor: '#0f172a' };
}

export default function TwoWeekProgrammeScreen() {
  const { sitePlots, activityDelays, activityMoves, plotTemplates, siteSetup } = useSitePlanner();
  const [inspectionStory, setInspectionStory] = useState<PlotInspectionStoryRecord[]>([]);
  const { width, height } = useWindowDimensions();
  const isLandscapePhone = width > height && width < 1000;
  const viewportWidth = Math.min(width - 40, 1100);
  const plotWidth = isLandscapePhone ? 58 : 94;
  const templateWidth = isLandscapePhone ? 78 : 130;
  const dayWidth = isLandscapePhone ? Math.max(92, Math.floor((viewportWidth - plotWidth - templateWidth - 12) / 5)) : 140;
  const weekWidth = dayWidth * 5;
  const compactText = isLandscapePhone;
  const sortedPlots = useMemo(() => getSortedSitePlots(sitePlots), [sitePlots]);
  const [startWeek, setStartWeek] = useState(1);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function loadInspectionStory() {
        const stored = await AsyncStorage.getItem(INSPECTION_STORY_KEY);
        if (active) setInspectionStory(stored ? JSON.parse(stored) : []);
      }
      loadInspectionStory();
      return () => {
        active = false;
      };
    }, []),
  );

  const activeItems = useMemo(() => {
    const items = new Map<string, { code: string; trade: string }>();
    sortedPlots.forEach((plot) => {
      [startWeek, startWeek + 1].forEach((week) => {
        DAY_NAMES.forEach((_, dayIndex) => {
          getActivitiesForTemplateDay(plot, week, dayIndex + 1, activityDelays, plotTemplates, activityMoves).forEach((activity) => items.set(`${activity.trade}:${activity.code}`, { code: activity.code, trade: activity.trade }));
        });
      });
    });
    return Array.from(items.values()).sort((a, b) => `${a.trade} ${a.code}`.localeCompare(`${b.trade} ${b.code}`));
  }, [sortedPlots, activityDelays, activityMoves, plotTemplates, startWeek]);

  const activeTrades = useMemo(() => Array.from(new Set(activeItems.map((item) => item.trade))).sort(), [activeItems]);

  const openInspection = (plotId: string, activityCode: string, trade: string, checklistId: string) => {
    router.push({
      pathname: '/inspections',
      params: { plotId, activityCode, trade, checklistId },
    } as any);
  };

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.title}>Rolling 2-Week Programme</Text>
        <Text style={styles.subtitle}>Colour coded by trade. Click the QA status on the last day of a fix. Dates come from Setup.</Text>
      </View>

      <SectionCard title="2-week selector" subtitle={`Currently showing WK${String(startWeek).padStart(2, '0')} and WK${String(startWeek + 1).padStart(2, '0')}`}>
        <View style={styles.weekControls}>
          <Pressable style={styles.weekButton} onPress={() => setStartWeek((week) => Math.max(1, week - 1))}>
            <Text style={styles.weekButtonText}>Previous</Text>
          </Pressable>
          <Text style={styles.weekLabel}>WK{String(startWeek).padStart(2, '0')} + WK{String(startWeek + 1).padStart(2, '0')}</Text>
          <Pressable style={styles.weekButton} onPress={() => setStartWeek((week) => Math.min(51, week + 1))}>
            <Text style={styles.weekButtonText}>Next</Text>
          </Pressable>
        </View>
      </SectionCard>

      <SectionCard title="Trade colour key" subtitle="Colour coding applies to this rolling 2-week programme only.">
        <View style={styles.codeGrid}>
          {activeTrades.length === 0 ? <Text style={styles.empty}>No trade activity in this window.</Text> : null}
          {activeTrades.map((trade) => {
            const colour = getTradeColour(trade);
            return (
              <View key={trade} style={[styles.tradeKeyItem, { backgroundColor: colour.backgroundColor, borderColor: colour.borderColor }]}>
                <Text style={[styles.tradeKeyText, { color: colour.textColor }]}>{trade}</Text>
              </View>
            );
          })}
        </View>
      </SectionCard>

      <SectionCard title="Rolling programme" subtitle="Final fix day shows QA status: Inspect, Passed, Failed or Incomplete.">
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View>
            <View style={styles.weekHeaderRow}>
              <Text style={[styles.weekHeaderBlank, { width: plotWidth }]} />
              <Text style={[styles.weekHeaderBlank, { width: templateWidth }]} />
              <Text style={[styles.weekGroup, { width: weekWidth }]}>Week 1</Text>
              <Text style={[styles.weekGroup, { width: weekWidth }]}>Week 2</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.headerCell, { width: plotWidth }]}>Plot</Text>
              <Text style={[styles.headerCell, { width: templateWidth }]}>Type</Text>
              {[startWeek, startWeek + 1].flatMap((week) =>
                DAY_NAMES.map((day, dayIndex) => (
                  <Text key={`${week}-${day}`} style={[styles.dayHeader, { width: dayWidth }, compactText ? styles.compactDayHeader : null]}>
                    {formatProgrammeDayHeader(siteSetup.programmeStartDate, week, day, dayIndex + 1, compactText)}
                  </Text>
                )),
              )}
            </View>

            {sortedPlots.map((plot, rowIndex) => {
              const template = getTemplateForPlot(plot, plotTemplates);
              return (
                <View key={plot.id} style={[styles.tableRow, rowIndex % 2 ? styles.altRow : null]}>
                  <Text style={[styles.bodyCell, { width: plotWidth }]}>{plot.plotNo}</Text>
                  <Text style={[styles.bodyCell, { width: templateWidth }, compactText ? styles.compactCellText : null]}>{getHouseTypeLabel(template)}</Text>
                  {[startWeek, startWeek + 1].flatMap((week) =>
                    DAY_NAMES.map((_, dayIndex) => {
                      const day = dayIndex + 1;
                      const currentDay = calendarDayIndexFromWeekDay(week, day);
                      const activities = getActivitiesForTemplateDay(plot, week, day, activityDelays, plotTemplates, activityMoves);
                      return (
                        <View key={`${plot.id}-${week}-${dayIndex}`} style={[styles.dayCell, { width: dayWidth }, activities.length ? styles.activeDayCell : null]}>
                          {activities.map((activity) => {
                            const range = getActivityRangeForPlot(plot, activity.code, activityDelays, plotTemplates, activityMoves);
                            const isLastDay = range?.finish === currentDay;
                            const checklistId = getChecklistIdForActivity(activity.code, activity.trade, activity.stage);
                            const qaRecord = getLatestInspectionForActivity(inspectionStory, plot.id, activity.code);
                            const qaLabel = getInspectionStatusLabel(qaRecord);
                            const colour = getTradeColour(activity.trade);
                            return (
                              <View key={activity.code} style={[styles.activityBlock, { backgroundColor: colour.backgroundColor, borderColor: colour.borderColor }]}>
                                <Text style={[styles.activityTrade, { color: colour.textColor }]}>{activity.trade}</Text>
                                <Text style={[styles.activityCode, { color: colour.textColor }, compactText ? styles.compactActivityCode : null]}>{activity.code}</Text>
                                {isLastDay ? (
                                  <Pressable
                                    style={[styles.inspectButton, qaRecord?.status === 'Passed' ? styles.qaPassed : qaRecord?.status === 'Failed' ? styles.qaFailed : qaRecord?.status === 'Incomplete' ? styles.qaIncomplete : null]}
                                    onPress={() => openInspection(plot.id, activity.code, activity.trade, checklistId)}
                                  >
                                    <Text style={styles.inspectButtonText}>{qaLabel}</Text>
                                  </Pressable>
                                ) : null}
                              </View>
                            );
                          })}
                        </View>
                      );
                    }),
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </SectionCard>

      <SectionCard title="Active fix / activity codes" subtitle="Codes appearing in the selected two-week window, grouped by trade colour.">
        <View style={styles.codeGrid}>
          {activeItems.length === 0 ? <Text style={styles.empty}>No planned activity in this window.</Text> : null}
          {activeItems.map((item) => {
            const colour = getTradeColour(item.trade);
            return (
              <View key={`${item.trade}-${item.code}`} style={[styles.codeItem, { backgroundColor: colour.backgroundColor, borderColor: colour.borderColor }]}>
                <Text style={[styles.codeText, { color: colour.textColor }]}>{item.code}</Text>
              </View>
            );
          })}
        </View>
      </SectionCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 4 },
  title: { color: '#0f172a', fontSize: 30, fontWeight: '900' },
  subtitle: { color: '#64748b', fontSize: 14, lineHeight: 20 },
  weekControls: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  weekButton: { backgroundColor: '#0f172a', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  weekButtonText: { color: '#ffffff', fontWeight: '900' },
  weekLabel: { color: '#0f172a', fontWeight: '900', fontSize: 16 },
  weekHeaderRow: { flexDirection: 'row' },
  tableRow: { flexDirection: 'row', alignItems: 'stretch' },
  altRow: { backgroundColor: '#f8fbff' },
  weekHeaderBlank: { backgroundColor: '#173b5f', borderWidth: 1, borderColor: '#9fb6ce', minHeight: 28 },
  weekGroup: { backgroundColor: '#173b5f', color: '#ffffff', fontWeight: '900', fontSize: 12, padding: 7, borderWidth: 1, borderColor: '#9fb6ce', textAlign: 'center' },
  headerCell: { backgroundColor: '#173b5f', color: '#ffffff', fontWeight: '900', fontSize: 12, padding: 8, borderWidth: 1, borderColor: '#9fb6ce', textAlign: 'center' },
  dayHeader: { backgroundColor: '#173b5f', color: '#ffffff', fontWeight: '900', fontSize: 12, padding: 7, borderWidth: 1, borderColor: '#9fb6ce', textAlign: 'center', lineHeight: 16 },
  compactDayHeader: { fontSize: 10, paddingHorizontal: 3, lineHeight: 13 },
  bodyCell: { color: '#0f172a', padding: 8, borderWidth: 1, borderColor: '#c8d7e6', textAlign: 'center', fontWeight: '800' },
  compactCellText: { fontSize: 11, paddingHorizontal: 4 },
  dayCell: { minHeight: 70, padding: 5, borderWidth: 1, borderColor: '#c8d7e6', alignItems: 'stretch', justifyContent: 'center', gap: 4 },
  activeDayCell: { backgroundColor: '#f8fafc' },
  activityBlock: { borderRadius: 8, borderWidth: 1, padding: 4, gap: 3, alignItems: 'center' },
  activityTrade: { textAlign: 'center', fontSize: 9, fontWeight: '900' },
  activityCode: { textAlign: 'center', fontSize: 11, fontWeight: '900' },
  compactActivityCode: { fontSize: 10 },
  inspectButton: { backgroundColor: '#0f172a', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 4, alignSelf: 'stretch' },
  qaPassed: { backgroundColor: '#16a34a' },
  qaFailed: { backgroundColor: '#dc2626' },
  qaIncomplete: { backgroundColor: '#f97316' },
  inspectButtonText: { color: '#ffffff', fontSize: 10, fontWeight: '900', textAlign: 'center' },
  codeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tradeKeyItem: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  tradeKeyText: { fontWeight: '900', fontSize: 12 },
  codeItem: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  codeText: { fontWeight: '900', fontSize: 12 },
  empty: { color: '#64748b', fontWeight: '700' },
});
