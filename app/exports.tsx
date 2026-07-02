import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppScreen } from '../components/AppScreen';
import { SectionCard } from '../components/SectionCard';
import { useSitePlanner } from '../data/sitePlannerStore';
import { DAY_NAMES, TRADE_ORDER } from '../utils/siteProgrammeEngine';
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

const TRADE_DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TRADE_EXPORT_META_KEY = 'programme-buddy:trade-export-meta:v1';

function csv(value: string | number | undefined) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

function cleanCell(value: string) {
  return value.split('\n').join(' / ');
}

function issueDateTime() {
  const now = new Date();
  return {
    date: now.toLocaleDateString('en-GB'),
    time: now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
  };
}

export default function ExportsScreen() {
  const { sitePlots, activityDelays, activityMoves, plotTemplates, siteSetup, programmeNotes } = useSitePlanner();
  const [inspectionStory, setInspectionStory] = useState<PlotInspectionStoryRecord[]>([]);
  const [selectedTrade, setSelectedTrade] = useState<string>(TRADE_ORDER[0]);
  const [tradeStartWeek, setTradeStartWeek] = useState('1');
  const [developerName, setDeveloperName] = useState('');
  const [siteManagerName, setSiteManagerName] = useState('');
  const [producedBy, setProducedBy] = useState('');
  const sortedPlots = useMemo(() => getSortedSitePlots(sitePlots), [sitePlots]);
  const qaStats = getInspectionStats(inspectionStory);
  const activeTradeWeek = Math.max(1, Math.min(51, Number(tradeStartWeek) || 1));

  useEffect(() => {
    async function loadTradeExportMeta() {
      const stored = await AsyncStorage.getItem(TRADE_EXPORT_META_KEY);
      if (!stored) return;
      const meta = JSON.parse(stored) as { developerName?: string; siteManagerName?: string; producedBy?: string };
      setDeveloperName(meta.developerName ?? '');
      setSiteManagerName(meta.siteManagerName ?? '');
      setProducedBy(meta.producedBy ?? '');
    }
    loadTradeExportMeta();
  }, []);

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
      ['Plot', 'Checklist', 'Activity', 'Trade', 'Status', 'Checked', 'Failed', 'Images', 'Date'].map(csv).join(','),
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
          record.imageCount ?? 0,
          new Date(record.completedAt).toLocaleDateString('en-GB'),
        ].map(csv).join(',');
      }),
    ];
    return rows.join('\n');
  }, [inspectionStory, sitePlots]);

  const tradeSpreadsheetCsv = useMemo(() => {
    const issued = issueDateTime();
    const dayHeaders = [activeTradeWeek, activeTradeWeek + 1].flatMap((week) =>
      TRADE_DAY_NAMES.map((day, dayIndex) => `WK${String(week).padStart(2, '0')} ${day} ${formatProgrammeDate(siteSetup.programmeStartDate, week, dayIndex + 1)}`),
    );
    const rows = sortedPlots
      .map((plot) => {
        const template = getTemplateForPlot(plot, plotTemplates);
        const dayCells = [activeTradeWeek, activeTradeWeek + 1].flatMap((week) =>
          TRADE_DAY_NAMES.map((_, dayIndex) => cleanCell(getActivitiesForTemplateDay(plot, week, dayIndex + 1, activityDelays, plotTemplates, activityMoves).filter((activity) => activity.trade === selectedTrade).map((activity) => activity.displayText).join(' / '))),
        );
        const note = programmeNotes.find((item) => item.plotId === plot.id && item.trade === selectedTrade && item.startWeek === activeTradeWeek)?.note ?? '';
        const hasWork = dayCells.some(Boolean) || note.trim();
        return hasWork ? [plot.plotNo, getHouseTypeLabel(template), ...dayCells, note].map(csv).join(',') : '';
      })
      .filter(Boolean);

    return [
      ['Programme Buddy Trade Programme Issue Sheet'].map(csv).join(','),
      ['Developer', developerName].map(csv).join(','),
      ['Site', siteSetup.siteName].map(csv).join(','),
      ['Site Manager', siteManagerName].map(csv).join(','),
      ['Produced By', producedBy].map(csv).join(','),
      ['Date Issued', issued.date].map(csv).join(','),
      ['Time Issued', issued.time].map(csv).join(','),
      ['Trade', selectedTrade].map(csv).join(','),
      '',
      ['Plot', 'House Type', ...dayHeaders, 'Output / Recovery Notes'].map(csv).join(','),
      ...(rows.length ? rows : [[`No planned activity for ${selectedTrade} in this 2-week window.`].map(csv).join(',')]),
    ].join('\n');
  }, [activeTradeWeek, activityDelays, activityMoves, developerName, plotTemplates, producedBy, programmeNotes, selectedTrade, siteManagerName, siteSetup.programmeStartDate, siteSetup.siteName, sortedPlots]);

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
      `QA images: ${qaStats.images}`,
      '',
      'Failed QA items:',
      ...(failed.length ? failed.map((record) => `- ${record.checklistTitle} / ${record.activityCode || 'Manual QA'} / ${record.trade || 'Trade TBC'} / ${record.failCount} failed / ${record.imageCount ?? 0} images`) : ['- None']),
      '',
      'Incomplete QA items:',
      ...(incomplete.length ? incomplete.map((record) => `- ${record.checklistTitle} / ${record.activityCode || 'Manual QA'} / ${record.trade || 'Trade TBC'}`) : ['- None']),
      '',
      'Upcoming pre-handover forecast:',
      ...(upcoming.length ? upcoming.map((item) => `- ${item}`) : ['- No plots loaded']),
    ].join('\n');
  }, [inspectionStory, qaStats.failed, qaStats.images, qaStats.incomplete, qaStats.passed, qaStats.reinspectionDue, qaStats.total, sitePlots.length, siteSetup.programmeStartDate, siteSetup.siteName, sortedPlots]);

  const saveTradeExportMeta = async () => {
    await AsyncStorage.setItem(TRADE_EXPORT_META_KEY, JSON.stringify({ developerName, siteManagerName, producedBy }));
  };

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.title}>Exports</Text>
        <Text style={styles.subtitle}>Spreadsheet-style outputs for Excel, weekly reporting and QA records. Review before sending or issuing.</Text>
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

      <SectionCard title="Trade programme spreadsheet preview" subtitle="Professional issue sheet. Make any final programme changes before copying/sending this spreadsheet output.">
        <View style={styles.formGrid}>
          <View style={styles.inputWrap}>
            <Text style={styles.label}>Developer name</Text>
            <TextInput value={developerName} onChangeText={setDeveloperName} style={styles.input} placeholder="Developer / client" />
          </View>
          <View style={styles.inputWrap}>
            <Text style={styles.label}>Site name</Text>
            <TextInput value={siteSetup.siteName} editable={false} style={[styles.input, styles.lockedInput]} />
          </View>
          <View style={styles.inputWrap}>
            <Text style={styles.label}>Site manager name</Text>
            <TextInput value={siteManagerName} onChangeText={setSiteManagerName} style={styles.input} placeholder="Site manager" />
          </View>
          <View style={styles.inputWrap}>
            <Text style={styles.label}>Produced by</Text>
            <TextInput value={producedBy} onChangeText={setProducedBy} style={styles.input} placeholder="Person producing programme" />
          </View>
          <View style={styles.inputWrapSmall}>
            <Text style={styles.label}>Start week</Text>
            <TextInput value={tradeStartWeek} onChangeText={setTradeStartWeek} style={styles.input} keyboardType="number-pad" />
          </View>
          <View style={styles.inputWrap}>
            <Text style={styles.label}>Trade</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.tradeChips}>
                {TRADE_ORDER.map((trade) => (
                  <Pressable key={trade} style={[styles.tradeChip, selectedTrade === trade ? styles.tradeChipActive : null]} onPress={() => setSelectedTrade(trade)}>
                    <Text style={[styles.tradeChipText, selectedTrade === trade ? styles.tradeChipTextActive : null]}>{trade}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
          <Pressable style={styles.saveButton} onPress={saveTradeExportMeta}>
            <Text style={styles.saveButtonText}>Save Header Details</Text>
          </Pressable>
        </View>
        <View style={styles.issueMetaGrid}>
          <InfoBox label="Developer" value={developerName || 'TBC'} />
          <InfoBox label="Site" value={siteSetup.siteName} />
          <InfoBox label="Site Manager" value={siteManagerName || 'TBC'} />
          <InfoBox label="Produced By" value={producedBy || 'TBC'} />
          <InfoBox label="Date issued" value={issueDateTime().date} />
          <InfoBox label="Time issued" value={issueDateTime().time} />
        </View>
        <ScrollView horizontal>
          <TextInput value={tradeSpreadsheetCsv} editable={false} multiline selectTextOnFocus style={[styles.exportBox, styles.extraWideExportBox]} />
        </ScrollView>
      </SectionCard>

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

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoBox}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
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
  formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' },
  inputWrap: { gap: 6, minWidth: 190, flex: 1 },
  inputWrapSmall: { gap: 6, width: 120 },
  label: { color: '#334155', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  input: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: '#0f172a', fontWeight: '800' },
  lockedInput: { backgroundColor: '#f1f5f9', color: '#64748b' },
  saveButton: { backgroundColor: '#0f172a', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, alignSelf: 'flex-end' },
  saveButtonText: { color: '#ffffff', fontWeight: '900' },
  tradeChips: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  tradeChip: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#ffffff' },
  tradeChipActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  tradeChipText: { color: '#64748b', fontSize: 12, fontWeight: '900' },
  tradeChipTextActive: { color: '#ffffff' },
  issueMetaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  infoBox: { flex: 1, minWidth: 160, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#ffffff', borderRadius: 12, padding: 12 },
  infoLabel: { color: '#64748b', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  infoValue: { color: '#0f172a', fontSize: 14, fontWeight: '900', marginTop: 4 },
  exportBox: { minHeight: 220, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 14, padding: 12, backgroundColor: '#f8fafc', color: '#0f172a', fontFamily: 'monospace', fontSize: 12, textAlignVertical: 'top' },
  wideExportBox: { minWidth: 1000 },
  extraWideExportBox: { minWidth: 1500 },
});
