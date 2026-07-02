import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { SectionCard } from '../../components/SectionCard';
import { StatCard } from '../../components/StatCard';
import { useSitePlanner } from '../../data/sitePlannerStore';
import { PROGRAMME_STAGE_SEQUENCE } from '../../utils/siteProgrammeEngine';
import { getStage1StartWeekForPlot } from '../../utils/templateProgramme';

export default function DashboardScreen() {
  const router = useRouter();
  const { sitePlots, plotTemplates } = useSitePlanner();
  const earliestStart = sitePlots.length ? Math.min(...sitePlots.map((plot) => getStage1StartWeekForPlot(plot, plotTemplates))) : 0;
  const latestHandover = sitePlots.length ? Math.max(...sitePlots.map((plot) => plot.stage9CompleteWeek)) : 0;

  return (
    <AppScreen>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Programme Buddy</Text>
          <Text style={styles.subtitle}>23-week build back-planning, stage-number master programmes, rolling 2-week lookaheads and stage inspections.</Text>
        </View>
        <View style={styles.badge}><Text style={styles.badgeText}>Excel rebuild</Text></View>
      </View>

      <View style={styles.openProgrammeGrid}>
        <Pressable style={styles.programmeCard} onPress={() => router.push('/(tabs)/master')}>
          <Ionicons name="calendar-outline" size={24} color="#2563eb" />
          <View style={styles.cardTextWrap}>
            <Text style={styles.programmeTitle}>Master Programme</Text>
            <Text style={styles.programmeText}>One row per plot, WK columns, stage numbers only</Text>
          </View>
        </Pressable>
        <Pressable style={styles.programmeCard} onPress={() => router.push('/(tabs)/two-week')}>
          <Ionicons name="grid-outline" size={24} color="#16a34a" />
          <View style={styles.cardTextWrap}>
            <Text style={styles.programmeTitle}>Rolling 2-Week</Text>
            <Text style={styles.programmeText}>Select the live two-week block and issue it</Text>
          </View>
        </Pressable>
        <Pressable style={styles.programmeCard} onPress={() => router.push('/(tabs)/plots')}>
          <Ionicons name="business-outline" size={24} color="#f97316" />
          <View style={styles.cardTextWrap}>
            <Text style={styles.programmeTitle}>Plot Breakdown</Text>
            <Text style={styles.programmeText}>Daily activity-code breakdown behind each plot</Text>
          </View>
        </Pressable>
        <Pressable style={styles.programmeCard} onPress={() => router.push('/(tabs)/trades')}>
          <Ionicons name="briefcase-outline" size={24} color="#7c3aed" />
          <View style={styles.cardTextWrap}>
            <Text style={styles.programmeTitle}>Trades</Text>
            <Text style={styles.programmeText}>Trade contacts, issue settings and programme previews</Text>
          </View>
        </Pressable>
        <Pressable style={styles.programmeCard} onPress={() => router.push('/(tabs)/inspections')}>
          <Ionicons name="clipboard-outline" size={24} color="#dc2626" />
          <View style={styles.cardTextWrap}>
            <Text style={styles.programmeTitle}>Inspections</Text>
            <Text style={styles.programmeText}>Stage checklists filtered by plot setup and construction method</Text>
          </View>
        </Pressable>
      </View>

      <View style={styles.statsGrid}>
        <StatCard label="Plots" value={sitePlots.length} helper="Programme rows" icon={<Ionicons name="business-outline" size={26} color="#2563eb" />} />
        <StatCard label="Stages" value={PROGRAMME_STAGE_SEQUENCE.length} helper="Stage key" icon={<Ionicons name="layers-outline" size={26} color="#16a34a" />} />
        <StatCard label="Earliest start" value={earliestStart ? `WK${String(earliestStart).padStart(2, '0')}` : '-'} helper="Back-planned" icon={<Ionicons name="play-circle-outline" size={26} color="#f97316" />} />
        <StatCard label="Latest pre-H/O" value={latestHandover ? `WK${String(latestHandover).padStart(2, '0')}` : '-'} helper="Last plot" icon={<Ionicons name="flag-outline" size={26} color="#dc2626" />} />
      </View>

      <SectionCard title="Current rebuild rule" subtitle="The app now follows the Excel logic rather than the old card-based prototype.">
        <View style={styles.ruleRow}>
          <Text style={styles.ruleNumber}>1</Text>
          <Text style={styles.ruleText}>Master programme: one row per plot, week columns across the top, stage numbers only in cells.</Text>
        </View>
        <View style={styles.ruleRow}>
          <Text style={styles.ruleNumber}>2</Text>
          <Text style={styles.ruleText}>Rolling 2-week programme: select the two-week block and scroll like the Excel issue sheet.</Text>
        </View>
        <View style={styles.ruleRow}>
          <Text style={styles.ruleNumber}>3</Text>
          <Text style={styles.ruleText}>Plot breakdown: daily activity codes remain available behind the stage-number view.</Text>
        </View>
        <View style={styles.ruleRow}>
          <Text style={styles.ruleNumber}>4</Text>
          <Text style={styles.ruleText}>Stage inspections: checklist items follow the plot's house type and construction method, with global custom items available.</Text>
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
  programmeCard: { flex: 1, minWidth: 280, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', padding: 18, flexDirection: 'row', gap: 14, alignItems: 'center' },
  cardTextWrap: { flex: 1 },
  programmeTitle: { color: '#0f172a', fontWeight: '900', fontSize: 16 },
  programmeText: { color: '#64748b', fontSize: 12, marginTop: 2 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  ruleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },
  ruleNumber: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#173b5f', color: '#ffffff', textAlign: 'center', lineHeight: 34, fontWeight: '900' },
  ruleText: { flex: 1, color: '#0f172a', lineHeight: 20, fontWeight: '800' },
});
