import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppScreen } from '../components/AppScreen';
import { SectionCard } from '../components/SectionCard';
import { useSitePlanner } from '../data/sitePlannerStore';
import { DAY_NAMES } from '../utils/siteProgrammeEngine';
import { getInspectionStats, INSPECTION_STORY_KEY, PlotInspectionStoryRecord } from '../utils/inspectionRecords';
import { formatProgrammeDate } from '../utils/programmeDates';
import {
  getActivitiesForTemplateDay,
  getHouseTypeLabel,
  getSortedSitePlots,
  getStage1StartWeekForPlot,
  getStageNumberForPlotWeek,
  getTemplateForPlot,
} from '../utils/templateProgramme';

function csv(value: string | number | undefined) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

export default function ExportsScreen() {
  const { sitePlots, activityDelays, activityMoves, plotTemplates, siteSetup } = useSitePlanner();
  const [inspectionStory, setInspectionStory] = useState<PlotInspectionStoryRecord[]>([]);
  const sortedPlots = useMemo(() => getSortedSitePlots(sitePlots), [sitePlots]);
  const qaStats = getInspectionStats(inspectionStory);

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

  const masterCsv = useMemo(() => {
    const weekHeaders = Array.from({ length: 52 }, (_, index) => `WK${String(index + 1).padStart(2, '0')}`);
    const rows = [
      ['Build Order', 'Plot', 'House Type', 'Stage 1 Start', 'Pre-Handover Week', 'Pre-Handover Date', ...weekHeaders].map(csv).join(','),
      ...sortedPlots.map((plot, index) => {
        const template = getTemplateForPlot(plot, plotTemplates);
        const values = [
          index + 1,
          plot.plotNo,
          getHouseTypeLabel(template),
          `WK${String(getStage1StartWeekForPlot(plot, plotTemplates)).padStart(2, '0')}`,
          `WK${String(plot.stage9CompleteWeek).padStart(2, '0')}`,
          formatProgrammeDate(siteSetup.programmeStartDate, plot.stage9CompleteWeek, 5),
          ...weekHeaders.map((_, weekIndex) => getStageNumberForPlotWeek(plot, weekIndex + 1, plotTemplates)),
        ];
        return values.map(csv).join(',');
      }),
    ];
    return rows.join('\n');
  }, [plotTemplates, siteSetup.programmeStartDate, sortedPlots]);

  const rollingCsv = useMemo(() => {
    const startWeek = Math.max(1, sortedPlots.length ? Math.min(...sortedPlots.map((plot) => getStage1StartWeekForPlot(plot, plotTemplates))) : 1);
    const headers = [
      'Plot',
      'House Type',
      ...[startWeek, startWeek + 1].flatMap((week) => DAY_NAMES.map((day, index) => `WK${String(week).padStart(2, '0')} ${day} ${formatProgrammeDate(siteSetup.programmeStartDate, week, index + 1)}`)),
    ];
    const rows = [
      headers.map(csv).join(','),
      ...sortedPlots.map((plot) => {
        const template = getTemplateForPlot(plot, plotTemplates);
        const dayValues = [startWeek, startWeek + 1].flatMap((week) => DAY_NAMES.map((_, dayIndex) => getActivitiesForTemplateDay(plot, week, dayIndex + 1, activityDelays, plotTemplates, activityMoves).map((activity) => activity.code).join(' / ')));
        return [plot.plotNo, getHouseTypeLabel(template), ...dayValues].map(csv).join(',');
      }),
    ];
    return rows.join('\n');
  }, [activityDelays, activityMoves, plotTemplates, siteSetup.programmeStartDate, sortedPlots]);

  const qaCsv = useMemo(() => {
    const rows = [
      ['Plot', 'Checklist', 'Activity', 'Trade', 'Status', 'Checked', 'Failed', 'Date'].map(csv).join(','),
      ...inspectionStory.map((record) => {
        const plot = sitePlots.find((item) => item.id === record.plotId);
        return [
          plot?.plotNo ?? record.plotId,
          record.checklistTitle,
          record.activityCode || 'Manual QA',
          record.trade || 'Trade TBC',
          record.status,
          `${record.completedCount}/${record.itemCount}`,
          record.failCount,
          new Date(record.completedAt).toLocaleDateString('en-GB'),
        ].map(csv).join(',');
      }),
    ];
    return rows.join('\n');
  }, [inspectionStory, sitePlots]);

  const weeklyReport = useMemo(() => {
    const failed = inspectionStory.filter((record) => record.status === 'Failed');
    const incomplete = inspectionStory.filter((record) => record.status === 'Incomplete');
    const upcoming = sortedPlots
      .slice()
      .sort((a, b) => a.stage9CompleteWeek - b.stage9CompleteWeek)
      .slice(0, 8)
      .map((plot) => `Plot ${plot.plotNo}: WK${String(plot.stage9CompleteWeek).padStart(2, '0')} / ${formatProgrammeDate(siteSetup.programmeStartDate, plot.stage9CompleteWeek, 5)}`);

    return [
      `${siteSetup.siteName} — Weekly Control Report`,
      `Programme start: ${siteSetup.programmeStartDate}`,
      '',
      `Plots: ${sitePlots.length}`,
      `QA records: ${qaStats.total}`,
      `Passed: ${qaStats.passed}`,
      `Failed: ${qaStats.failed}`,
      `Incomplete: ${qaStats.incomplete}`,
      `Rechecks due: ${qaStats.reinspectionDue}`,
      '',
      'Failed QA items:',
      ...(failed.length ? failed.map((record) => `- ${record.checklistTitle} / ${record.activityCode || 'Manual QA'} / ${record.trade || 'Trade TBC'} / ${record.failCount} failed`) : ['- None']),
      '',
      'Incomplete QA items:',
      ...(incomplete.length ? incomplete.map((record) => `- ${record.checklistTitle} / ${record.activityCode || 'Manual QA'} / ${record.trade || 'Trade TBC'}`) : ['- None']),
      '',
      'Upcoming pre-handover forecast:',
      ...(upcoming.length ? upcoming.map((item) => `- ${item}`) : ['- No plots loaded']),
    ].join('\n');
  }, [inspectionStory, qaStats.failed, qaStats.incomplete, qaStats.passed, qaStats.reinspectionDue, qaStats.total, sitePlots.length, siteSetup.programmeStartDate, siteSetup.siteName, sortedPlots]);

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.title}>Exports</Text>
        <Text style={styles.subtitle}>Copy-ready outputs for Excel, weekly reporting and QA records. Paste CSV text into Excel for now; true file export can be connected later.</Text>
      </View>

      <View style={styles.summaryGrid}>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>Plots</Text>
          <Text style={styles.summaryValue}>{sitePlots.length}</Text>
        </View>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>QA records</Text>
          <Text style={styles.summaryValue}>{qaStats.total}</Text>
        </View>
        <View style={[styles.summaryBox, qaStats.reinspectionDue ? styles.summaryWarning : null]}>
          <Text style={styles.summaryLabel}>Rechecks due</Text>
          <Text style={styles.summaryValue}>{qaStats.reinspectionDue}</Text>
        </View>
      </View>

      <SectionCard title="Weekly control report" subtitle="Copy this into an email or site report.">
        <TextInput value={weeklyReport} editable={false} multiline selectTextOnFocus style={styles.exportBox} />
      </SectionCard>

      <SectionCard title="Master programme CSV" subtitle="Copy and paste into Excel. Stage cells remain numbers only.">
        <ScrollView horizontal>
          <TextInput value={masterCsv} editable={false} multiline selectTextOnFocus style={[styles.exportBox, styles.wideExportBox]} />
        </ScrollView>
      </SectionCard>

      <SectionCard title="Rolling 2-week CSV" subtitle="Copy and paste into Excel for the first live 2-week window.">
        <ScrollView horizontal>
          <TextInput value={rollingCsv} editable={false} multiline selectTextOnFocus style={[styles.exportBox, styles.wideExportBox]} />
        </ScrollView>
      </SectionCard>

      <SectionCard title="QA story CSV" subtitle="Copy and paste into Excel to create a QA history register.">
        <ScrollView horizontal>
          <TextInput value={qaCsv} editable={false} multiline selectTextOnFocus style={[styles.exportBox, styles.wideExportBox]} />
        </ScrollView>
      </SectionCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 4 },
  title: { color: '#0f172a', fontSize: 30, fontWeight: '900' },
  subtitle: { color: '#64748b', fontSize: 14, lineHeight: 20 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  summaryBox: { flex: 1, minWidth: 160, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, padding: 16 },
  summaryWarning: { backgroundColor: '#fff1f2', borderColor: '#fecaca' },
  summaryLabel: { color: '#64748b', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  summaryValue: { color: '#0f172a', fontSize: 26, fontWeight: '900', marginTop: 4 },
  exportBox: { minHeight: 220, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 14, padding: 12, backgroundColor: '#f8fafc', color: '#0f172a', fontFamily: 'monospace', fontSize: 12, textAlignVertical: 'top' },
  wideExportBox: { minWidth: 1000 },
});
