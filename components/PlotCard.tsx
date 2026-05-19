import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { PlotProgramme, PlotStage } from '../types/models';
import { getActiveStage, getPlotProgress } from '../utils/programmeLogic';

export function PlotCard({ plot, stages }: { plot: PlotProgramme; stages: PlotStage[] }) {
  const progress = getPlotProgress(plot.id, stages);
  const activeStage = getActiveStage(plot.id, stages);
  const isHeld = plot.holdStatus === 'On hold';

  return (
    <Link href={`/plot/${plot.id}`} asChild>
      <View style={styles.card}>
        <View style={styles.topRow}>
          <View>
            <Text style={styles.plotName}>{plot.plotName}</Text>
            <Text style={styles.phase}>{plot.phase}</Text>
          </View>
          <View style={[styles.statusBadge, isHeld ? styles.heldBadge : styles.activeBadge]}>
            <Text style={[styles.statusText, isHeld ? styles.heldText : styles.activeText]}>{plot.holdStatus}</Text>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>{progress}% complete</Text>

        <View style={styles.detailRow}>
          <Ionicons name="construct-outline" size={18} color="#2563eb" />
          <View style={styles.detailTextWrap}>
            <Text style={styles.detailLabel}>Current stage</Text>
            <Text style={styles.detailValue}>{activeStage?.stageName ?? 'No stages found'}</Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={18} color="#64748b" />
          <View style={styles.detailTextWrap}>
            <Text style={styles.detailLabel}>Programme window</Text>
            <Text style={styles.detailValue}>{plot.startDate} to {plot.endDate}</Text>
          </View>
        </View>

        {isHeld ? <Text style={styles.holdReason}>{plot.holdReason}</Text> : null}
        <Text style={styles.openText}>Open plot details</Text>
      </View>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 280,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 18,
    gap: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  plotName: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '900',
  },
  phase: {
    color: '#64748b',
    marginTop: 2,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  activeBadge: {
    backgroundColor: '#dcfce7',
  },
  heldBadge: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '900',
  },
  activeText: {
    color: '#166534',
  },
  heldText: {
    color: '#991b1b',
  },
  progressTrack: {
    height: 10,
    backgroundColor: '#e2e8f0',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563eb',
  },
  progressText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '800',
  },
  detailRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
  },
  detailTextWrap: {
    flex: 1,
  },
  detailLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  detailValue: {
    color: '#0f172a',
    fontWeight: '800',
    marginTop: 2,
  },
  holdReason: {
    color: '#991b1b',
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    padding: 10,
    fontWeight: '700',
  },
  openText: {
    color: '#2563eb',
    fontWeight: '900',
    fontSize: 12,
  },
});
