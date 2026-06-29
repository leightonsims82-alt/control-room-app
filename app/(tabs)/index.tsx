import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { SectionCard } from '../../components/SectionCard';
import { StatCard } from '../../components/StatCard';
import { useSitePlanner } from '../../data/sitePlannerStore';
import { BUILD_SEQUENCE, getStage1StartWeek, MASTER_MILESTONES } from '../../utils/siteProgrammeEngine';

export default function DashboardScreen() {
  const { sitePlots } = useSitePlanner();
  const earliestStart = sitePlots.length ? Math.min(...sitePlots.map(getStage1StartWeek)) : 0;
  const latestHandover = sitePlots.length ? Math.max(...sitePlots.map((plot) => plot.stage9CompleteWeek)) : 0;

  return (
    <AppScreen>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Site Programme Control Room</Text>
          <Text style={styles.subtitle}>Stage 9 week in. Master milestones, plot breakdown and 2-week trade programmes out.</Text>
        </View>
        <View style={styles.badge}><Text style={styles.badgeText}>23-week engine</Text></View>
      </View>

      <View style={styles.openProgrammeGrid}>
        <View style={styles.programmeCard}>
          <Ionicons name="calendar-outline" size={22} color="#2563eb" />
          <View>
            <Text style={styles.programmeTitle}>Master 23 Week</Text>
            <Text style={styles.programmeText}>Milestone numbers only: 1, 2, 4, 5, 6, 7, 8, 9</Text>
          </View>
        </View>
        <View style={styles.programmeCard}>
          <Ionicons name="grid-outline" size={22} color="#16a34a" />
          <View>
            <Text style={styles.programmeTitle}>Daily Plot Breakdown</Text>
            <Text style={styles.programmeText}>Specific codes: FND, DNG, SLAB, 1ST BWK and more</Text>
          </View>
        </View>
        <View style={styles.programmeCard}>
          <Ionicons name="briefcase-outline" size={22} color="#f97316" />
          <View>
            <Text style={styles.programmeTitle}>2-Week Trade Calls</Text>
            <Text style={styles.programmeText}>Trade tables with Plot and Mon-Fri / Mon-Fri</Text>
          </View>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <StatCard label="Plots" value={sitePlots.length} helper="Week-based plots" icon={<Ionicons name="business-outline" size={26} color="#2563eb" />} />
        <StatCard label="Build sequence" value={BUILD_SEQUENCE.length} helper="Detailed activities" icon={<Ionicons name="list-outline" size={26} color="#16a34a" />} />
        <StatCard label="Earliest start" value={earliestStart || '-'} helper="Stage 1 start week" icon={<Ionicons name="play-circle-outline" size={26} color="#f97316" />} />
        <StatCard label="Latest handover" value={latestHandover || '-'} helper="Stage 9 week" icon={<Ionicons name="flag-outline" size={26} color="#dc2626" />} />
      </View>

      <SectionCard title="Master milestone offsets" subtitle="These drive the high-level 23-week completion view">
        {MASTER_MILESTONES.map((milestone) => (
          <View key={milestone.stage} style={styles.milestoneRow}>
            <View style={styles.stageBadge}><Text style={styles.stageBadgeText}>{milestone.stage}</Text></View>
            <View style={styles.milestoneMain}>
              <Text style={styles.milestoneTitle}>{milestone.label}</Text>
              <Text style={styles.milestoneMeta}>Stage 9 week {milestone.offsetFromStage9 < 0 ? milestone.offsetFromStage9 : '+0'}</Text>
            </View>
          </View>
        ))}
      </SectionCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap' },
  title: { fontSize: 30, fontWeight: '900', color: '#0f172a' },
  subtitle: { marginTop: 4, fontSize: 14, color: '#64748b', lineHeight: 20 },
  badge: { backgroundColor: '#fef3c7', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  badgeText: { color: '#92400e', fontWeight: '900', fontSize: 12 },
  openProgrammeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  programmeCard: { flex: 1, minWidth: 280, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', padding: 18, flexDirection: 'row', gap: 14, alignItems: 'center' },
  programmeTitle: { color: '#0f172a', fontWeight: '900', fontSize: 16 },
  programmeText: { color: '#64748b', fontSize: 12, marginTop: 2 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  milestoneRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },
  stageBadge: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eff6ff' },
  stageBadgeText: { color: '#2563eb', fontWeight: '900' },
  milestoneMain: { flex: 1 },
  milestoneTitle: { color: '#0f172a', fontWeight: '900' },
  milestoneMeta: { color: '#64748b', fontSize: 12, marginTop: 3 },
});
