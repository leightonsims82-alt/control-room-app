import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { SectionCard } from '../../components/SectionCard';
import { useSitePlanner } from '../../data/sitePlannerStore';
import { DAY_NAMES } from '../../utils/siteProgrammeEngine';
import { getChecklistIdForActivity } from '../../utils/inspectionChecklists';
import {
  calendarDayIndexFromWeekDay,
  getActivitiesForTemplateDay,
  getActivityRangeForPlot,
  getHouseTypeLabel,
  getSortedSitePlots,
  getTemplateForPlot,
} from '../../utils/templateProgramme';

export default function TwoWeekProgrammeScreen() {
  const { sitePlots, activityDelays, activityMoves, plotTemplates } = useSitePlanner();
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
  const activeCodes = useMemo(() => {
    const codes = new Map<string, string>();
    sortedPlots.forEach((plot) => {
      [startWeek, startWeek + 1].forEach((week) => {
        DAY_NAMES.forEach((_, dayIndex) => {
          getActivitiesForTemplateDay(plot, week, dayIndex + 1, activityDelays, plotTemplates, activityMoves).forEach((activity) => codes.set(activity.code, activity.code));
        });
      });
    });
    return Array.from(codes.values()).sort();
  }, [sortedPlots, activityDelays, activityMoves, plotTemplates, startWeek]);

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
        <Text style={styles.subtitle}>Click Inspect on the last day of a fix to complete the QA check. In phone landscape, one full week is sized to fit the screen.</Text>
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

      <SectionCard title="Rolling programme" subtitle="Inspections trigger from the final programmed day of each activity/fix.">
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
              {[startWeek, startWeek + 1].flatMap((week) => DAY_NAMES.map((day) => <Text key={`${week}-${day}`} style={[styles.dayHeader, { width: dayWidth }, compactText ? styles.compactDayHeader : null]}>WK{String(week).padStart(2, '0')} {day}</Text>))}
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
                            return (
                              <View key={activity.code} style={styles.activityBlock}>
                                <Text style={[styles.activityCode, compactText ? styles.compactActivityCode : null]}>{activity.code}</Text>
                                {isLastDay ? (
                                  <Pressable style={styles.inspectButton} onPress={() => openInspection(plot.id, activity.code, activity.trade, checklistId)}>
                                    <Text style={styles.inspectButtonText}>Inspect</Text>
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

      <SectionCard title="Active fix / activity codes" subtitle="Codes appearing in the selected two-week window.">
        <View style={styles.codeGrid}>
          {activeCodes.length === 0 ? <Text style={styles.empty}>No planned activity in this window.</Text> : null}
          {activeCodes.map((code) => (
            <View key={code} style={styles.codeItem}>
              <Text style={styles.codeText}>{code}</Text>
            </View>
          ))}
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
  dayHeader: { backgroundColor: '#173b5f', color: '#ffffff', fontWeight: '900', fontSize: 12, padding: 8, borderWidth: 1, borderColor: '#9fb6ce', textAlign: 'center' },
  compactDayHeader: { fontSize: 10, paddingHorizontal: 3 },
  bodyCell: { color: '#0f172a', padding: 8, borderWidth: 1, borderColor: '#c8d7e6', textAlign: 'center', fontWeight: '800' },
  compactCellText: { fontSize: 11, paddingHorizontal: 4 },
  dayCell: { minHeight: 70, padding: 5, borderWidth: 1, borderColor: '#c8d7e6', alignItems: 'stretch', justifyContent: 'center', gap: 4 },
  activeDayCell: { backgroundColor: '#dff0ff' },
  activityBlock: { backgroundColor: '#ffffff', borderRadius: 8, borderWidth: 1, borderColor: '#bfdbfe', padding: 4, gap: 4, alignItems: 'center' },
  activityCode: { color: '#0f172a', textAlign: 'center', fontSize: 11, fontWeight: '900' },
  compactActivityCode: { fontSize: 10 },
  inspectButton: { backgroundColor: '#0f172a', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 4, alignSelf: 'stretch' },
  inspectButtonText: { color: '#ffffff', fontSize: 10, fontWeight: '900', textAlign: 'center' },
  codeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  codeItem: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  codeText: { color: '#0f172a', fontWeight: '900', fontSize: 12 },
  empty: { color: '#64748b', fontWeight: '700' },
});
