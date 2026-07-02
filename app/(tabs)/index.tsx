import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { SectionCard } from '../../components/SectionCard';
import { StatCard } from '../../components/StatCard';
import { useSitePlanner } from '../../data/sitePlannerStore';
import { getInspectionStats, INSPECTION_STORY_KEY, PlotInspectionStoryRecord } from '../../utils/inspectionRecords';
import { formatProgrammeDate } from '../../utils/programmeDates';
import { getSortedSitePlots } from '../../utils/templateProgramme';

export default function DashboardScreen() {
  const router = useRouter();
  const { sitePlots, siteSetup } = useSitePlanner();
  const [inspectionStory, setInspectionStory] = useState<PlotInspectionStoryRecord[]>([]);
  const sortedPlots = useMemo(() => getSortedSitePlots(sitePlots), [sitePlots]);
  const latestHandover = sitePlots.length ? Math.max(...sitePlots.map((plot) => plot.stage9CompleteWeek)) : 0;
  const qaStats = getInspectionStats(inspectionStory);
  const failedRecords = inspectionStory.filter((record) => record.status === 'Failed').slice(0, 5);
  const nextHandovers = sortedPlots
    .slice()
    .sort((a, b) => a.stage9CompleteWeek - b.stage9CompleteWeek)
    .slice(0, 5);

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

  return (
    <AppScreen>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Programme Buddy</Text>
          <Text style={styles.subtitle}>Programme, trade issue sheet, QA trigger, plot story, exports and control-room dashboard.</Text>
        </View>
        <View style={styles.badge}><Text style={styles.badgeText}>Control room</Text></View>
      </View>

      <View style={styles.openProgrammeGrid}>
        <Pressable style={styles.programmeCard} onPress={() => router.push('/(tabs)/master')}>
          <Ionicons name="calendar-outline" size={24} color="#2563eb" />
          <View style={styles.cardTextWrap}>
            <Text style={styles.programmeTitle}>Master Programme</Text>
            <Text style={styles.programmeText}>Build order, plots, house type codes and stage matrix</Text>
          </View>
        </Pressable>
        <Pressable style={styles.programmeCard} onPress={() => router.push('/(tabs)/two-week')}>
          <Ionicons name="grid-outline" size={24} color="#16a34a" />
          <View style={styles.cardTextWrap}>
            <Text style={styles.programmeTitle}>Rolling 2-Week</Text>
            <Text style={styles.programmeText}>Live dates, activity cells and QA status buttons</Text>
          </View>
        </Pressable>
        <Pressable style={styles.programmeCard} onPress={() => router.push('/(tabs)/trades')}>
          <Ionicons name="briefcase-outline" size={24} color="#7c3aed" />
          <View style={styles.cardTextWrap}>
            <Text style={styles.programmeTitle}>Trade Programmes</Text>
            <Text style={styles.programmeText}>Drag fixes, issue trades and add recovery notes</Text>
          </View>
        </Pressable>
        <Pressable style={styles.programmeCard} onPress={() => router.push('/(tabs)/inspections')}>
          <Ionicons name="clipboard-outline" size={24} color="#dc2626" />
          <View style={styles.cardTextWrap}>
            <Text style={styles.programmeTitle}>Plot QA Story</Text>
            <Text style={styles.programmeText}>Plot-by-plot QA timeline, checks, comments and image refs</Text>
          </View>
        </Pressable>
        <Pressable style={styles.programmeCard} onPress={() => router.push('/exports')}>
          <Ionicons name="download-outline" size={24} color="#0f172a" />
          <View style={styles.cardTextWrap}>
            <Text style={styles.programmeTitle}>Exports</Text>
            <Text style={styles.programmeText}>Copy-ready Excel CSV, QA register and weekly report outputs</Text>
          </View>
        </Pressable>
      </View>

      <View style={styles.statsGrid}>
        <StatCard label="Plots" value={sitePlots.length} helper="Programme rows" icon={<Ionicons name="business-outline" size={26} color="#2563eb" />} />
        <StatCard label="QA records" value={qaStats.total} helper={`${qaStats.passed} passed / ${qaStats.failed} failed`} icon={<Ionicons name="shield-checkmark-outline" size={26} color="#16a34a" />} />
        <StatCard label="Rechecks due" value={qaStats.reinspectionDue} helper="Failed or incomplete QA" icon={<Ionicons name="warning-outline" size={26} color="#dc2626" />} />
        <StatCard label="Latest pre-H/O" value={latestHandover ? `WK${String(latestHandover).padStart(2, '0')}` : '-'} helper={latestHandover ? formatProgrammeDate(siteSetup.programmeStartDate, latestHandover, 5) : 'Last plot'} icon={<Ionicons name="flag-outline" size={26} color="#f97316" />} />
      </View>

      <SectionCard title="Live QA control" subtitle="Failures and incomplete inspections stay visible until they are rechecked and passed.">
        {failedRecords.length === 0 ? <Text style={styles.empty}>No failed QA records currently saved.</Text> : null}
        {failedRecords.map((record) => (
          <Pressable key={record.id} style={styles.alertRow} onPress={() => router.push({ pathname: '/(tabs)/inspections', params: { plotId: record.plotId, checklistId: record.checklistId, activityCode: record.activityCode ?? '', trade: record.trade ?? '' } } as any)}>
            <Ionicons name="alert-circle-outline" size={22} color="#dc2626" />
            <View style={styles.alertMain}>
              <Text style={styles.alertTitle}>{record.checklistTitle}</Text>
              <Text style={styles.alertMeta}>{record.activityCode || 'Manual QA'} · {record.trade || 'Trade TBC'} · {record.failCount} failed item{record.failCount === 1 ? '' : 's'}</Text>
            </View>
            <Text style={styles.alertAction}>Open</Text>
          </Pressable>
        ))}
      </SectionCard>

      <SectionCard title="Upcoming pre-handover forecast" subtitle={`Programme starts ${siteSetup.programmeStartDate}. Dates are shown from Setup.`}>
        <View style={styles.forecastGrid}>
          {nextHandovers.map((plot) => (
            <View key={plot.id} style={styles.forecastCard}>
              <Text style={styles.forecastPlot}>Plot {plot.plotNo}</Text>
              <Text style={styles.forecastMeta}>WK{String(plot.stage9CompleteWeek).padStart(2, '0')}</Text>
              <Text style={styles.forecastDate}>{formatProgrammeDate(siteSetup.programmeStartDate, plot.stage9CompleteWeek, 5)}</Text>
            </View>
          ))}
        </View>
      </SectionCard>

      <SectionCard title="Current build logic" subtitle="The workflow now links programme → inspection → plot story → dashboard → exports.">
        <View style={styles.ruleRow}>
          <Text style={styles.ruleNumber}>1</Text>
          <Text style={styles.ruleText}>The programme is sorted by build order, not plot number.</Text>
        </View>
        <View style={styles.ruleRow}>
          <Text style={styles.ruleNumber}>2</Text>
          <Text style={styles.ruleText}>Final day of a fix triggers the QA inspection directly from the programme cell.</Text>
        </View>
        <View style={styles.ruleRow}>
          <Text style={styles.ruleNumber}>3</Text>
          <Text style={styles.ruleText}>Saved inspections feed back as Passed, Failed or Incomplete status on the programme and dashboard.</Text>
        </View>
        <View style={styles.ruleRow}>
          <Text style={styles.ruleNumber}>4</Text>
          <Text style={styles.ruleText}>Exports give copy-ready programme, QA register and weekly control report outputs.</Text>
        </View>
      </SectionCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap' },
  title: { fontSize: 32, fontWeight: '900', color: '#0f172a' },
  subtitle: { marginTop: 4, fontSize: 14, color: '#64748b', lineHeight: 20 },
  badge: { backgroundColor: '#fef3c7', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  badgeText: { color: '#92400e', fontWeight: '900', fontSize: 12 },
  openProgrammeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  programmeCard: { flex: 1, minWidth: 240, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', padding: 18, flexDirection: 'row', gap: 14, alignItems: 'center' },
  cardTextWrap: { flex: 1 },
  programmeTitle: { color: '#0f172a', fontWeight: '900', fontSize: 16 },
  programmeText: { color: '#64748b', fontSize: 12, marginTop: 2 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  empty: { color: '#64748b', fontWeight: '700' },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fff1f2', borderRadius: 14, padding: 12 },
  alertMain: { flex: 1 },
  alertTitle: { color: '#0f172a', fontWeight: '900' },
  alertMeta: { color: '#64748b', fontSize: 12, marginTop: 2, fontWeight: '700' },
  alertAction: { color: '#dc2626', fontWeight: '900', fontSize: 12 },
  forecastGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  forecastCard: { minWidth: 150, flex: 1, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, padding: 12 },
  forecastPlot: { color: '#0f172a', fontWeight: '900' },
  forecastMeta: { color: '#2563eb', fontSize: 12, fontWeight: '900', marginTop: 4 },
  forecastDate: { color: '#64748b', fontSize: 12, marginTop: 2, fontWeight: '800' },
  ruleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },
  ruleNumber: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#173b5f', color: '#ffffff', textAlign: 'center', lineHeight: 34, fontWeight: '900' },
  ruleText: { flex: 1, color: '#0f172a', lineHeight: 20, fontWeight: '800' },
});
