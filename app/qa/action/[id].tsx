import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppScreen } from '../../../components/AppScreen';
import { PhotoEvidenceField, QAStatusPill } from '../../../components/qa/QAUI';
import { SectionCard } from '../../../components/SectionCard';
import { useQAData } from '../../../data/qaStore';
import { QAActionStatus } from '../../../types/qa';

const STATUSES: QAActionStatus[] = ['Open', 'Sent to trade', 'In progress', 'Fixed awaiting verification', 'Verified fixed', 'Rejected'];

export default function QAActionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { actions, inspections, updateAction } = useQAData();
  const action = actions.find((item) => item.id === id);
  const [message, setMessage] = useState('');

  if (!action) {
    return (
      <AppScreen>
        <Pressable onPress={() => router.replace('/qa')} style={styles.backButton}><Text style={styles.backButtonText}>‹ Back to QA</Text></Pressable>
        <Text style={styles.title}>QA action not found</Text>
      </AppScreen>
    );
  }

  const inspection = inspections.find((item) => item.id === action.inspectionId);

  const setStatus = async (status: QAActionStatus) => {
    if (status === 'Verified fixed' && !action.closeOutComment?.trim() && !action.closeOutPhotoUri?.trim()) {
      setMessage('Add close-out evidence or a clear close-out comment before verifying the action.');
      return;
    }
    await updateAction(action.id, { status });
    setMessage(status === 'Verified fixed' ? 'Action verified fixed and closed.' : `Action updated to ${status}.`);
  };

  return (
    <AppScreen>
      <View style={styles.topRow}>
        <Pressable onPress={() => router.back()} style={styles.backButton}><Text style={styles.backButtonText}>‹ Back</Text></Pressable>
        <Pressable onPress={() => router.push(`/qa/plot/${action.plotId}`)} style={styles.storyButton}><Ionicons name="time-outline" size={16} color="#1d4ed8" /><Text style={styles.storyButtonText}>Plot story</Text></Pressable>
      </View>

      <View style={styles.hero}>
        <View style={styles.heroIcon}><Ionicons name="construct-outline" size={28} color="#dc2626" /></View>
        <View style={styles.heroMain}><Text style={styles.kicker}>QA trade action</Text><Text style={styles.title}>Plot {action.plotNo} · {action.trade}</Text><Text style={styles.subtitle}>{action.activityCode} · Stage {action.stage}</Text></View>
        <QAStatusPill status={action.status} />
      </View>

      <SectionCard title="Failure record" subtitle="The original inspection evidence remains locked in the plot story.">
        <View style={styles.detailCard}><Text style={styles.detailLabel}>Failed check</Text><Text style={styles.detailValue}>{action.description}</Text></View>
        <View style={styles.detailCard}><Text style={styles.detailLabel}>Required action</Text><Text style={styles.detailValue}>{action.requiredAction}</Text></View>
        <View style={styles.detailGrid}>
          <View style={styles.detailCard}><Text style={styles.detailLabel}>Inspection</Text><Text style={styles.detailValue}>{inspection?.activityName || action.activityCode}</Text></View>
          <View style={styles.detailCard}><Text style={styles.detailLabel}>Raised</Text><Text style={styles.detailValue}>{new Date(action.createdAt).toLocaleString('en-GB')}</Text></View>
        </View>
        {action.sourcePhotoUri ? <PhotoEvidenceField label="Original failure evidence" value={action.sourcePhotoUri} onChange={() => undefined} /> : null}
      </SectionCard>

      <SectionCard title="Responsible trade" subtitle="Update responsibility before issuing the action.">
        <TextInput value={action.trade} onChangeText={(value) => updateAction(action.id, { trade: value })} placeholder="Responsible trade" placeholderTextColor="#94a3b8" style={styles.input} />
      </SectionCard>

      <SectionCard title="Action status" subtitle="Move the item through the close-out workflow. Verification requires evidence or a close-out note.">
        <View style={styles.statusGrid}>
          {STATUSES.map((status) => (
            <Pressable key={status} onPress={() => setStatus(status)} style={[styles.statusButton, action.status === status ? styles.statusButtonActive : null, status === 'Verified fixed' ? styles.statusButtonVerified : null]}>
              <Text style={[styles.statusButtonText, action.status === status || status === 'Verified fixed' ? styles.statusButtonTextActive : null]}>{status}</Text>
            </Pressable>
          ))}
        </View>
      </SectionCard>

      <SectionCard title="Close-out evidence" subtitle="The trade or site team can add remedial evidence before verification.">
        <View style={styles.field}><Text style={styles.fieldLabel}>Close-out comment</Text><TextInput value={action.closeOutComment || ''} onChangeText={(value) => updateAction(action.id, { closeOutComment: value })} placeholder="Describe the remedial work completed" placeholderTextColor="#94a3b8" multiline style={[styles.input, styles.notesInput]} /></View>
        <PhotoEvidenceField label="Close-out photo" value={action.closeOutPhotoUri} onChange={(value) => updateAction(action.id, { closeOutPhotoUri: value })} />
      </SectionCard>

      {message ? <View style={[styles.messageCard, message.includes('requires') || message.includes('Add') ? styles.messageError : styles.messageSuccess]}><Text style={styles.messageText}>{message}</Text></View> : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  backButton: { alignSelf: 'flex-start', paddingVertical: 7 },
  backButtonText: { color: '#2563eb', fontWeight: '900', fontSize: 14 },
  storyButton: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#bfdbfe', backgroundColor: '#eff6ff', borderRadius: 11, paddingHorizontal: 11, paddingVertical: 8 },
  storyButtonText: { color: '#1d4ed8', fontWeight: '900', fontSize: 12 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 21, padding: 19, flexWrap: 'wrap' },
  heroIcon: { width: 54, height: 54, borderRadius: 17, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center' },
  heroMain: { flex: 1, minWidth: 220 },
  kicker: { color: '#dc2626', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  title: { color: '#0f172a', fontSize: 25, fontWeight: '900', marginTop: 2 },
  subtitle: { color: '#64748b', fontSize: 12, fontWeight: '700', marginTop: 3 },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  detailCard: { flex: 1, minWidth: 220, backgroundColor: '#f8fafc', borderRadius: 13, padding: 12, gap: 4 },
  detailLabel: { color: '#94a3b8', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  detailValue: { color: '#0f172a', fontSize: 13, fontWeight: '800', lineHeight: 19 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, backgroundColor: '#ffffff', color: '#0f172a', paddingHorizontal: 12, paddingVertical: 10, fontWeight: '700' },
  notesInput: { minHeight: 88, textAlignVertical: 'top' },
  field: { gap: 6 },
  fieldLabel: { color: '#475569', fontSize: 12, fontWeight: '900' },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusButton: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 999, backgroundColor: '#ffffff', paddingHorizontal: 13, paddingVertical: 9 },
  statusButtonActive: { borderColor: '#2563eb', backgroundColor: '#2563eb' },
  statusButtonVerified: { borderColor: '#16a34a', backgroundColor: '#16a34a' },
  statusButtonText: { color: '#64748b', fontSize: 12, fontWeight: '900' },
  statusButtonTextActive: { color: '#ffffff' },
  messageCard: { borderRadius: 13, borderWidth: 1, padding: 12 },
  messageError: { backgroundColor: '#fee2e2', borderColor: '#fecaca' },
  messageSuccess: { backgroundColor: '#dcfce7', borderColor: '#86efac' },
  messageText: { color: '#0f172a', fontWeight: '900' },
});
