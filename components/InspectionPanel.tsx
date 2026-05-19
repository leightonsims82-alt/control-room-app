import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { InspectionStatus, PlotStage } from '../types/models';

const inspectionStatuses: InspectionStatus[] = ['Ready for inspection', 'Pending', 'Passed', 'Issues noted', 'Blocked'];

const statusConfig: Record<InspectionStatus, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string; border: string }> = {
  'Not applicable': { icon: 'remove-circle-outline', color: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0' },
  'Ready for inspection': { icon: 'time-outline', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  Pending: { icon: 'hourglass-outline', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  Passed: { icon: 'checkmark-circle-outline', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  'Issues noted': { icon: 'alert-circle-outline', color: '#f97316', bg: '#fff7ed', border: '#fed7aa' },
  Blocked: { icon: 'shield-outline', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
};

type InspectionPanelProps = {
  stage: PlotStage;
  onChange?: (stageId: string, status: InspectionStatus) => Promise<void>;
};

export function InspectionPanel({ stage, onChange }: InspectionPanelProps) {
  if (!stage.isKeyStage) return null;

  const status = stage.inspectionStatus || 'Not applicable';
  const config = statusConfig[status];
  const windowText = stage.inspectionWindowStart && stage.inspectionWindowEnd
    ? `${stage.inspectionWindowStart} to ${stage.inspectionWindowEnd}`
    : 'Not set';

  return (
    <View style={[styles.wrapper, { backgroundColor: config.bg, borderColor: config.border }]}> 
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name={config.icon} size={18} color={config.color} />
          <Text style={styles.title}>Inspection Status</Text>
        </View>
        <Text style={[styles.status, { color: config.color }]}>{status}</Text>
      </View>

      <View style={styles.body}>
        <View>
          <Text style={styles.label}>Inspection Window</Text>
          <Text style={styles.value}>{windowText}</Text>
        </View>

        {onChange ? (
          <View style={styles.statusGrid}>
            {inspectionStatuses.map((item) => {
              const active = item === status;
              return (
                <Pressable key={item} style={[styles.statusButton, active ? styles.statusButtonActive : null]} onPress={() => onChange(stage.id, item)}>
                  <Text style={[styles.statusButtonText, active ? styles.statusButtonTextActive : null]}>{item}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {stage.inspectionNotes ? (
          <View style={styles.noteBox}>
            <Text style={styles.label}>Notes</Text>
            <Text style={styles.note}>{stage.inspectionNotes}</Text>
          </View>
        ) : null}

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>✓ Inspection window follows key stage completion.</Text>
          <Text style={styles.infoText}>✓ Work can continue unless marked Blocked.</Text>
          <Text style={styles.infoText}>✓ Use Issues noted for non-blocking observations.</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: '#0f172a', fontWeight: '900', fontSize: 14 },
  status: { fontSize: 12, fontWeight: '900', backgroundColor: '#ffffff', borderRadius: 999, overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 4 },
  body: { padding: 14, gap: 12 },
  label: { color: '#64748b', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', marginBottom: 4 },
  value: { color: '#0f172a', fontSize: 13, fontWeight: '800' },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusButton: { borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#ffffff', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  statusButtonActive: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  statusButtonText: { color: '#64748b', fontSize: 12, fontWeight: '800' },
  statusButtonTextActive: { color: '#2563eb' },
  noteBox: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 10 },
  note: { color: '#475569', fontSize: 13, lineHeight: 18 },
  infoBox: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 10, gap: 3 },
  infoText: { color: '#64748b', fontSize: 12, lineHeight: 16 },
});
