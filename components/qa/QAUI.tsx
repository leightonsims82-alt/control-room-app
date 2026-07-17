import { Ionicons } from '@expo/vector-icons';
import { Alert, Image, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { QAActionStatus, QAInspectionStatus } from '../../types/qa';

export function QAStatusPill({ status }: { status: QAInspectionStatus | QAActionStatus }) {
  const tone = getStatusTone(status);
  return (
    <View style={[styles.pill, { backgroundColor: tone.background, borderColor: tone.border }]}>
      <View style={[styles.dot, { backgroundColor: tone.text }]} />
      <Text style={[styles.pillText, { color: tone.text }]}>{status}</Text>
    </View>
  );
}

export function QAStatCard({ icon, label, value, helper, tone = 'blue' }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: number | string; helper: string; tone?: 'blue' | 'amber' | 'red' | 'green' }) {
  const tones = {
    blue: { icon: '#2563eb', background: '#eff6ff' },
    amber: { icon: '#d97706', background: '#fffbeb' },
    red: { icon: '#dc2626', background: '#fef2f2' },
    green: { icon: '#16a34a', background: '#f0fdf4' },
  };
  const colours = tones[tone];
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: colours.background }]}><Ionicons name={icon} size={24} color={colours.icon} /></View>
      <View style={styles.statText}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text><Text style={styles.statHelper}>{helper}</Text></View>
    </View>
  );
}

export function PhotoEvidenceField({ label, value, onChange, disabled = false }: { label: string; value?: string; onChange: (uri: string) => void; disabled?: boolean }) {
  const pickPhoto = () => {
    if (disabled) return;
    if (Platform.OS !== 'web') {
      Alert.alert('Photo evidence', 'Camera and gallery capture will be enabled in the mobile build. You can paste a photo or file reference below while testing.');
      return;
    }
    const documentRef = (globalThis as any).document;
    const FileReaderRef = (globalThis as any).FileReader;
    if (!documentRef || !FileReaderRef) return;
    const input = documentRef.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReaderRef();
      reader.onload = () => onChange(String(reader.result || ''));
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const canPreview = Boolean(value && (value.startsWith('data:image') || value.startsWith('http') || value.startsWith('file:')));
  return (
    <View style={styles.photoWrap}>
      <View style={styles.photoHeader}>
        <Text style={styles.photoLabel}>{label}</Text>
        {!disabled ? <Pressable style={styles.photoButton} onPress={pickPhoto}><Ionicons name="camera-outline" size={16} color="#1d4ed8" /><Text style={styles.photoButtonText}>Add photo</Text></Pressable> : <View style={styles.lockedBadge}><Ionicons name="lock-closed-outline" size={13} color="#64748b" /><Text style={styles.lockedBadgeText}>Locked record</Text></View>}
      </View>
      {canPreview ? <Image source={{ uri: value }} style={styles.photoPreview} resizeMode="cover" /> : null}
      <TextInput editable={!disabled} value={value || ''} onChangeText={onChange} placeholder="Photo, file or image reference" placeholderTextColor="#94a3b8" style={[styles.photoInput, disabled ? styles.photoInputDisabled : null]} />
    </View>
  );
}

function getStatusTone(status: QAInspectionStatus | QAActionStatus) {
  if (status === 'Passed' || status === 'Verified fixed') return { background: '#dcfce7', border: '#86efac', text: '#166534' };
  if (status === 'Failed' || status === 'Rejected') return { background: '#fee2e2', border: '#fecaca', text: '#991b1b' };
  if (status === 'Incomplete' || status === 'Fixed awaiting verification') return { background: '#fef3c7', border: '#fde68a', text: '#92400e' };
  if (status === 'Sent to trade' || status === 'In progress') return { background: '#dbeafe', border: '#bfdbfe', text: '#1d4ed8' };
  return { background: '#f1f5f9', border: '#cbd5e1', text: '#475569' };
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, alignSelf: 'flex-start' },
  dot: { width: 7, height: 7, borderRadius: 4 },
  pillText: { fontSize: 11, fontWeight: '900' },
  statCard: { minWidth: 200, flex: 1, flexDirection: 'row', alignItems: 'center', gap: 13, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 17, backgroundColor: '#ffffff', padding: 16 },
  statIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  statText: { flex: 1 },
  statValue: { color: '#0f172a', fontSize: 25, fontWeight: '900' },
  statLabel: { color: '#334155', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  statHelper: { color: '#94a3b8', fontSize: 11, fontWeight: '700', marginTop: 2 },
  photoWrap: { gap: 8 },
  photoHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  photoLabel: { color: '#475569', fontSize: 12, fontWeight: '900' },
  photoButton: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, borderWidth: 1, borderColor: '#bfdbfe', backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 7 },
  photoButtonText: { color: '#1d4ed8', fontWeight: '900', fontSize: 12 },
  lockedBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, backgroundColor: '#f1f5f9', paddingHorizontal: 9, paddingVertical: 6 },
  lockedBadgeText: { color: '#64748b', fontSize: 10, fontWeight: '900' },
  photoPreview: { width: '100%', maxWidth: 420, height: 190, borderRadius: 14, backgroundColor: '#e2e8f0' },
  photoInput: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, backgroundColor: '#ffffff', color: '#0f172a', paddingHorizontal: 12, paddingVertical: 10, fontWeight: '700' },
  photoInputDisabled: { backgroundColor: '#f8fafc', color: '#64748b' },
});
