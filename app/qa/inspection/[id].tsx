import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppScreen } from '../../../components/AppScreen';
import { PhotoEvidenceField, QAStatusPill } from '../../../components/qa/QAUI';
import { SectionCard } from '../../../components/SectionCard';
import { getQATemplateForActivity } from '../../../data/qaTemplates';
import { useQAData } from '../../../data/qaStore';
import { QAAnswer } from '../../../types/qa';

const ANSWERS: QAAnswer[] = ['Yes', 'No', 'N/A'];

export default function QAInspectionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const {
    inspections,
    actions,
    updateInspectionMeta,
    updateInspectionItem,
    completeInspection,
    startReinspection,
  } = useQAData();
  const inspection = inspections.find((item) => item.id === id);
  const [validationMessage, setValidationMessage] = useState('');
  const [completing, setCompleting] = useState(false);

  const inspectionActions = useMemo(() => actions.filter((action) => action.inspectionId === id), [actions, id]);

  if (!inspection) {
    return (
      <AppScreen>
        <Pressable onPress={() => router.replace('/qa')} style={styles.backButton}><Text style={styles.backButtonText}>‹ Back to QA</Text></Pressable>
        <Text style={styles.title}>Inspection not found</Text>
      </AppScreen>
    );
  }

  const template = getQATemplateForActivity(inspection.activityCode, inspection.templateId);
  const checked = inspection.items.filter((item) => item.answer !== 'Not checked').length;
  const failed = inspection.items.filter((item) => item.answer === 'No').length;
  const openFailedItems = inspection.items.filter((item) => item.answer === 'No' && item.fixed !== 'Yes').length;
  const isComplete = Boolean(inspection.completedAt);

  const submitInspection = async () => {
    const failedWithoutDescription = inspection.items.find((item) => item.answer === 'No' && !item.comment?.trim());
    if (failedWithoutDescription) {
      setValidationMessage('Every failed check needs a clear defect description before the inspection can be completed.');
      return;
    }
    setCompleting(true);
    try {
      const result = await completeInspection(inspection.id);
      setValidationMessage(result?.status === 'Passed'
        ? 'Inspection passed and added to the plot story.'
        : result?.status === 'Failed'
          ? 'Inspection failed. Trade actions have been created automatically.'
          : 'Inspection saved as incomplete. Unchecked items remain open.');
    } finally {
      setCompleting(false);
    }
  };

  const recheck = async () => {
    const next = await startReinspection(inspection.id);
    if (next) router.replace(`/qa/inspection/${next.id}`);
  };

  return (
    <AppScreen>
      <View style={styles.topRow}>
        <Pressable onPress={() => router.back()} style={styles.backButton}><Text style={styles.backButtonText}>‹ Back</Text></Pressable>
        <Pressable onPress={() => router.push(`/qa/plot/${inspection.plotId}`)} style={styles.storyButton}><Ionicons name="time-outline" size={16} color="#1d4ed8" /><Text style={styles.storyButtonText}>Plot story</Text></Pressable>
      </View>

      <View style={styles.hero}>
        <View style={styles.heroMain}>
          <Text style={styles.kicker}>Stage {inspection.stage} inspection</Text>
          <Text style={styles.title}>{template.title}</Text>
          <Text style={styles.subtitle}>Plot {inspection.plotNo} · {inspection.activityName} · Inspection {inspection.sequence}</Text>
        </View>
        <View style={styles.progressCard}><Text style={styles.progressValue}>{checked}/{inspection.items.length}</Text><Text style={styles.progressLabel}>checked</Text></View>
      </View>

      <View style={styles.summaryGrid}>
        <View style={styles.summaryTile}><Text style={styles.summaryValue}>{failed}</Text><Text style={styles.summaryLabel}>Failed checks</Text></View>
        <View style={styles.summaryTile}><Text style={styles.summaryValue}>{openFailedItems}</Text><Text style={styles.summaryLabel}>Open failures</Text></View>
        <View style={styles.summaryTile}><QAStatusPill status={inspection.status} /><Text style={styles.summaryLabel}>Current result</Text></View>
      </View>

      <SectionCard title="Inspection details" subtitle={template.description}>
        <View style={styles.inputGrid}>
          <View style={styles.field}><Text style={styles.fieldLabel}>Inspector</Text><TextInput editable={!isComplete} value={inspection.inspectorName || ''} onChangeText={(value) => updateInspectionMeta(inspection.id, { inspectorName: value })} placeholder="Inspector name" placeholderTextColor="#94a3b8" style={styles.input} /></View>
          <View style={styles.field}><Text style={styles.fieldLabel}>General notes</Text><TextInput editable={!isComplete} value={inspection.generalNotes || ''} onChangeText={(value) => updateInspectionMeta(inspection.id, { generalNotes: value })} placeholder="Overall inspection notes" placeholderTextColor="#94a3b8" multiline style={[styles.input, styles.notesInput]} /></View>
        </View>
      </SectionCard>

      <SectionCard title="Checklist" subtitle="Answer every check. A failed item requires a defect description and automatically creates a trade action.">
        {inspection.items.map((item, index) => (
          <View key={item.id} style={[styles.checkCard, item.answer === 'No' ? styles.checkCardFailed : null]}>
            <View style={styles.checkHeader}>
              <View style={styles.checkNumber}><Text style={styles.checkNumberText}>{index + 1}</Text></View>
              <View style={styles.checkTitleWrap}><Text style={styles.tradeLabel}>{item.trade}</Text><Text style={styles.checkTitle}>{item.check}</Text></View>
            </View>

            <View style={styles.answerRow}>
              {ANSWERS.map((answer) => {
                const active = item.answer === answer;
                return (
                  <Pressable key={answer} disabled={isComplete} onPress={() => updateInspectionItem(inspection.id, item.id, { answer })} style={[styles.answerButton, active ? styles.answerButtonActive : null, answer === 'No' && active ? styles.answerButtonFailed : null]}>
                    <Text style={[styles.answerText, active ? styles.answerTextActive : null]}>{answer}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.field}><Text style={styles.fieldLabel}>Responsible trade</Text><TextInput editable={!isComplete} value={item.trade} onChangeText={(value) => updateInspectionItem(inspection.id, item.id, { trade: value })} placeholder="Trade" placeholderTextColor="#94a3b8" style={styles.input} /></View>
            <View style={styles.field}><Text style={styles.fieldLabel}>{item.answer === 'No' ? 'Defect description — required' : 'Comment'}</Text><TextInput editable={!isComplete} value={item.comment || ''} onChangeText={(value) => updateInspectionItem(inspection.id, item.id, { comment: value })} placeholder={item.answer === 'No' ? 'Describe exactly what has failed and where' : 'Optional note or observation'} placeholderTextColor="#94a3b8" multiline style={[styles.input, styles.notesInput, item.answer === 'No' && !item.comment?.trim() ? styles.requiredInput : null]} /></View>
            <PhotoEvidenceField label="Inspection photo evidence" value={item.photoUri} onChange={(value) => updateInspectionItem(inspection.id, item.id, { photoUri: value })} />
          </View>
        ))}
      </SectionCard>

      {validationMessage ? <View style={[styles.messageCard, validationMessage.includes('failed') || validationMessage.includes('needs') ? styles.messageError : styles.messageSuccess]}><Text style={styles.messageText}>{validationMessage}</Text></View> : null}

      {!isComplete ? (
        <Pressable disabled={completing} onPress={submitInspection} style={[styles.completeButton, completing ? styles.completeButtonDisabled : null]}>
          <Ionicons name="checkmark-circle-outline" size={21} color="#ffffff" />
          <Text style={styles.completeButtonText}>{completing ? 'Completing…' : 'Complete inspection'}</Text>
        </Pressable>
      ) : (
        <SectionCard title="Inspection result" subtitle={`${inspectionActions.length} trade action${inspectionActions.length === 1 ? '' : 's'} created from this inspection.`}>
          <View style={styles.resultRow}><QAStatusPill status={inspection.status} /><Text style={styles.resultDate}>Completed {new Date(inspection.completedAt || inspection.startedAt).toLocaleString('en-GB')}</Text></View>
          {inspection.status !== 'Passed' ? <Pressable onPress={recheck} style={styles.recheckButton}><Ionicons name="refresh-outline" size={18} color="#ffffff" /><Text style={styles.recheckButtonText}>Start reinspection</Text></Pressable> : null}
        </SectionCard>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  backButton: { alignSelf: 'flex-start', paddingVertical: 7 },
  backButtonText: { color: '#2563eb', fontWeight: '900', fontSize: 14 },
  storyButton: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#bfdbfe', backgroundColor: '#eff6ff', borderRadius: 11, paddingHorizontal: 11, paddingVertical: 8 },
  storyButtonText: { color: '#1d4ed8', fontWeight: '900', fontSize: 12 },
  hero: { backgroundColor: '#0f172a', borderRadius: 24, padding: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap' },
  heroMain: { flex: 1, minWidth: 240 },
  kicker: { color: '#c4b5fd', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  title: { color: '#ffffff', fontSize: 29, fontWeight: '900', marginTop: 4 },
  subtitle: { color: '#cbd5e1', fontSize: 13, fontWeight: '700', marginTop: 5 },
  progressCard: { width: 92, height: 92, borderRadius: 46, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' },
  progressValue: { color: '#7c3aed', fontSize: 24, fontWeight: '900' },
  progressLabel: { color: '#64748b', fontSize: 10, fontWeight: '900' },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  summaryTile: { flex: 1, minWidth: 150, minHeight: 76, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#ffffff', padding: 14, justifyContent: 'center', gap: 5 },
  summaryValue: { color: '#0f172a', fontSize: 22, fontWeight: '900' },
  summaryLabel: { color: '#64748b', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  inputGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  field: { flex: 1, minWidth: 230, gap: 6 },
  fieldLabel: { color: '#475569', fontSize: 12, fontWeight: '900' },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, backgroundColor: '#ffffff', color: '#0f172a', paddingHorizontal: 12, paddingVertical: 10, fontWeight: '700' },
  notesInput: { minHeight: 76, textAlignVertical: 'top' },
  requiredInput: { borderColor: '#ef4444', backgroundColor: '#fff7f7' },
  checkCard: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 17, backgroundColor: '#ffffff', padding: 15, gap: 12 },
  checkCardFailed: { borderColor: '#fecaca', backgroundColor: '#fffafa' },
  checkHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  checkNumber: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f3e8ff', alignItems: 'center', justifyContent: 'center' },
  checkNumberText: { color: '#7c3aed', fontWeight: '900' },
  checkTitleWrap: { flex: 1 },
  tradeLabel: { color: '#7c3aed', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  checkTitle: { color: '#0f172a', fontSize: 15, fontWeight: '900', lineHeight: 21, marginTop: 2 },
  answerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  answerButton: { borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#ffffff', borderRadius: 999, paddingHorizontal: 15, paddingVertical: 8 },
  answerButtonActive: { borderColor: '#2563eb', backgroundColor: '#2563eb' },
  answerButtonFailed: { borderColor: '#dc2626', backgroundColor: '#dc2626' },
  answerText: { color: '#64748b', fontWeight: '900', fontSize: 12 },
  answerTextActive: { color: '#ffffff' },
  completeButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#0f172a', borderRadius: 15, paddingHorizontal: 18, paddingVertical: 15 },
  completeButtonDisabled: { opacity: 0.55 },
  completeButtonText: { color: '#ffffff', fontWeight: '900', fontSize: 15 },
  messageCard: { borderRadius: 13, borderWidth: 1, padding: 12 },
  messageError: { backgroundColor: '#fee2e2', borderColor: '#fecaca' },
  messageSuccess: { backgroundColor: '#dcfce7', borderColor: '#86efac' },
  messageText: { color: '#0f172a', fontWeight: '900' },
  resultRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  resultDate: { color: '#64748b', fontSize: 12, fontWeight: '700' },
  recheckButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#7c3aed', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  recheckButtonText: { color: '#ffffff', fontWeight: '900' },
});
