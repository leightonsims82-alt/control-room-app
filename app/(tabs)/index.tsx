import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { StatCard } from '../../components/StatCard';
import { plotProgrammes, plotStages } from '../../data/demoData';
import { getDelayedStages, getHeldPlots, getKeyStages, getTradePerformance } from '../../utils/programmeLogic';

export default function DashboardScreen() {
  const heldPlots = getHeldPlots(plotProgrammes);
  const delayedStages = getDelayedStages(plotStages);
  const keyStages = getKeyStages(plotStages).slice(0, 5);
  const tradePerformance = getTradePerformance(plotStages);
  const performer = tradePerformance[0];

  return (
    <AppScreen>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Dashboard</Text>
          <Text style={styles.subtitle}>Welcome back, Leighton</Text>
        </View>
        <View style={styles.badge}><Text style={styles.badgeText}>Trial build</Text></View>
      </View>

      <View style={styles.openProgrammeGrid}>
        <View style={styles.programmeCard}>
          <Ionicons name="grid-outline" size={22} color="#2563eb" />
          <View>
            <Text style={styles.programmeTitle}>2-Week Programme</Text>
            <Text style={styles.programmeText}>Grid board, short-term planning</Text>
          </View>
        </View>
        <View style={styles.programmeCard}>
          <Ionicons name="calendar-outline" size={22} color="#64748b" />
          <View>
            <Text style={styles.programmeTitle}>Master Programme</Text>
            <Text style={styles.programmeText}>Gantt chart, long-term view</Text>
          </View>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <StatCard label="Total plots" value={plotProgrammes.length} helper="All plots" icon={<Ionicons name="clipboard-outline" size={26} color="#2563eb" />} />
        <StatCard label="Active" value={plotProgrammes.length - heldPlots.length} helper="Currently working" icon={<Ionicons name="business-outline" size={26} color="#16a34a" />} />
        <StatCard label="On hold" value={heldPlots.length} helper="Paused" icon={<Ionicons name="pause-circle-outline" size={26} color="#ef4444" />} />
        <StatCard label="Delayed stages" value={delayedStages.length} helper="Need attention" icon={<Ionicons name="warning-outline" size={26} color="#f97316" />} />
      </View>

      <View style={styles.keyPanel}>
        <Text style={styles.keyTitle}>This Week's Key Stages</Text>
        <Text style={styles.keySubtitle}>Priority stages requiring focus</Text>
        {keyStages.map((stage) => (
          <View key={stage.id} style={styles.keyRow}>
            <View>
              <Text style={styles.keyRowTitle}>{stage.stageName}</Text>
              <Text style={styles.keyRowText}>{stage.startDate} to {stage.endDate}</Text>
            </View>
            <Text style={styles.keyTrade}>{stage.trade}</Text>
          </View>
        ))}
      </View>

      <View style={styles.bottomGrid}>
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Trade Performance Leaderboard</Text>
          {tradePerformance.map((trade) => (
            <View key={trade.trade} style={styles.leaderRow}>
              <Text style={styles.leaderName}>{trade.trade}</Text>
              <Text style={styles.leaderScore}>{trade.score}%</Text>
            </View>
          ))}
        </View>
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Performer of the Month</Text>
          <Text style={styles.performer}>{performer?.trade ?? 'No qualified trades'}</Text>
          <Text style={styles.panelText}>Based on completed stages and delays.</Text>
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, alignItems: 'center' },
  title: { fontSize: 30, fontWeight: '800', color: '#0f172a' },
  subtitle: { marginTop: 4, fontSize: 14, color: '#64748b' },
  badge: { backgroundColor: '#fef3c7', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  badgeText: { color: '#92400e', fontWeight: '700', fontSize: 12 },
  openProgrammeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  programmeCard: { flex: 1, minWidth: 280, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', padding: 18, flexDirection: 'row', gap: 14, alignItems: 'center' },
  programmeTitle: { color: '#0f172a', fontWeight: '800', fontSize: 16 },
  programmeText: { color: '#64748b', fontSize: 12, marginTop: 2 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  keyPanel: { borderRadius: 22, padding: 22, gap: 10, backgroundColor: '#2563eb' },
  keyTitle: { color: '#fff', fontSize: 20, fontWeight: '900' },
  keySubtitle: { color: '#dbeafe', marginBottom: 6 },
  keyRow: { backgroundColor: '#fff', borderRadius: 12, padding: 14, flexDirection: 'row', justifyContent: 'space-between', gap: 10, alignItems: 'center' },
  keyRowTitle: { color: '#0f172a', fontWeight: '800' },
  keyRowText: { color: '#64748b', fontSize: 12, marginTop: 3 },
  keyTrade: { color: '#2563eb', fontWeight: '800' },
  bottomGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  panel: { flex: 1, minWidth: 280, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', padding: 18 },
  panelTitle: { color: '#334155', fontWeight: '900', marginBottom: 10 },
  panelText: { color: '#64748b', fontSize: 13 },
  leaderRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingVertical: 10 },
  leaderName: { color: '#0f172a', fontWeight: '700' },
  leaderScore: { color: '#2563eb', fontWeight: '900' },
  performer: { color: '#0f172a', fontSize: 22, fontWeight: '900', marginBottom: 8 },
});
