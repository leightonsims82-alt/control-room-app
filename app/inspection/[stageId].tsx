import { Link, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { SectionCard } from '../../components/SectionCard';
import { getInspectionTemplateForStage } from '../../data/keyStageInspectionTemplates';
import { useProgrammeData } from '../../data/programmeStore';
import { ChecklistAnswer, InspectionChecklistItem } from '../../types/models';

const answers: ChecklistAnswer[] = ['Yes', 'No', 'N/A'];

export default function StageInspectionScreen() {
  const { stageId } = useLocalSearchParams<{ stageId: string }>();
  const store = useProgrammeData();
  const stage = store.plotStages.find((item) => item.id === stageId);
  const plot = stage ? store.plotProgrammes.find((item) => item.id === stage.plotProgrammeId) : undefined;
  const template = stage ? getInspectionTemplateForStage(stage.stageName) : undefined;
  const inspection = store.inspections.find((item) => item.plotStageId === stageId);

  useEffect(() => {
    if (stageId && !inspection) store.startInspectionForStage(stageId);
  }, [stageId, inspection, store]);

  const progress = useMemo(() => {
    const items = inspection?.items ?? [];
    return {
      checked: items.filter((item) => item.compliant !== 'Not checked').length,
      failed: items.filter((item) => item.compliant === 'No').length,
      total: items.length,
    };
  }, [inspection]);

  if (!stage || !plot) {
    return (
      <AppScreen>
        <Text style={styles.titleDark}>Inspection not found</Text>
        <Link href="/(tabs)/plots" style={styles.backLink}>Back to plots</Link>
      </AppScreen>
    );
  }

  if (!template) {
    return (
      <AppScreen>
        <Link href={`/plot/${stage.plotProgrammeId}`} style={styles.backLink}>Back to plot</Link>
        <SectionCard title="No checklist" subtitle={stage.stageName}>
          <Text style={styles.muted}>This stage does not have a checklist yet.</Text>
        </SectionCard>
      </AppScreen>
    );
  }

  async function complete() {
    if (!inspection) return;
    await store.completeInspection(inspection.id);
    router.replace(`/plot/${stage.plotProgrammeId}`);
  }

  return (
    <AppScreen>
      <Link href={`/plot/${stage.plotProgrammeId}`} style={styles.backLink}>Back to {plot.plotName}</Link>

      <View style={styles.hero}>
        <View>
          <Text style={styles.eyebrow}>Stage Inspection</Text>
          <Text style={styles.title}>{template.keyStageName}</Text>
          <Text style={styles.subtitle}>{plot.plotName} · {stage.stageName} · {stage.trade}</Text>
        </View>
        <View style={styles.counter}>
          <Text style={styles.counterValue}>{progress.checked}/{progress.total}</Text>
          <Text style={styles.counterLabel}>checked</Text>
        </View>
      </View>

      <SectionCard title="Checklist" subtitle={template.description}>
        {!inspection ? <Text style={styles.muted}>Starting checklist...</Text> : null}
        {inspection?.items.map((item) => (
          <ChecklistRow key={item.id} item={item} inspectionId={inspection.id} update={store.updateInspectionItem} />
        ))}
      </SectionCard>

      <SectionCard title="Inspection summary" subtitle="Failed checks create trade actions when completed">
        <Text style={styles.summary}>Failed checks: {progress.failed}</Text>
        <Text style={styles.summary}>Open actions on this stage: {store.defects.filter((item) => item.plotStageId === stage.id && item.status !== 'Verified fixed').length}</Text>
      </SectionCard>

      <Pressable style={styles.completeButton} onPress={complete} disabled={!inspection}>
        <Text style={styles.completeButtonText}>Complete Inspection</Text>
      </Pressable>
    </AppScreen>
  );
}

function ChecklistRow({
  item,
  inspectionId,
  update,
}: {
  item: InspectionChecklistItem;
  inspectionId: string;
  update: (inspectionId: string, itemId: string, input: Partial<InspectionChecklistItem>) => Promise<void>;
}) {
  return (
    <View style={[styles.itemCard, item.compliant === 'No' ? styles.itemCardFailed : null]}>
      <Text style={styles.trade}>{item.trade}</Text>
      <Text style={styles.check}>{item.check}</Text>
      <View style={styles.optionRow}>
        {answers.map((answer) => (
          <Pressable key={answer} style={[styles.option, item.compliant === answer ? styles.optionActive : null]} onPress={() => update(inspectionId, item.id, { compliant: answer })}>
            <Text style={[styles.optionText, item.compliant === answer ? styles.optionTextActive : null]}>{answer}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput style={styles.input} placeholder="Description" defaultValue={item.description} onBlur={(event) => update(inspectionId, item.id, { description: event.nativeEvent.text })} />
      <TextInput style={styles.input} placeholder="Image or photo reference" defaultValue={item.imageUri} onBlur={(event) => update(inspectionId, item.id, { imageUri: event.nativeEvent.text })} />
      <View style={styles.fixedRow}>
        <Text style={styles.fixedLabel}>Fixed?</Text>
        {answers.map((answer) => (
          <Pressable key={answer} style={[styles.smallOption, item.fixed === answer ? styles.optionActive : null]} onPress={() => update(inspectionId, item.id, { fixed: answer })}>
            <Text style={[styles.optionText, item.fixed === answer ? styles.optionTextActive : null]}>{answer}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput style={styles.input} placeholder="Fixed image or close-out photo reference" defaultValue={item.fixedImageUri} onBlur={(event) => update(inspectionId, item.id, { fixedImageUri: event.nativeEvent.text })} />
    </View>
  );
}

const styles = StyleSheet.create({
  backLink: { color: '#2563eb', fontWeight: '900', fontSize: 14 },
  hero: { backgroundColor: '#0f172a', borderRadius: 24, padding: 22, flexDirection: 'row', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap' },
  eyebrow: { color: '#93c5fd', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  title: { color: '#ffffff', fontSize: 30, fontWeight: '900' },
  titleDark: { color: '#0f172a', fontSize: 30, fontWeight: '900' },
  subtitle: { color: '#cbd5e1', marginTop: 4 },
  counter: { backgroundColor: '#ffffff', borderRadius: 18, paddingHorizontal: 18, paddingVertical: 14, alignItems: 'center' },
  counterValue: { color: '#2563eb', fontSize: 22, fontWeight: '900' },
  counterLabel: { color: '#64748b', fontSize: 11, fontWeight: '800' },
  muted: { color: '#64748b' },
  itemCard: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, padding: 14, gap: 10, backgroundColor: '#ffffff' },
  itemCardFailed: { borderColor: '#fecaca', backgroundColor: '#fff7f7' },
  trade: { color: '#2563eb', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  check: { color: '#0f172a', fontSize: 15, fontWeight: '900' },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#ffffff' },
  smallOption: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#ffffff' },
  optionActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  optionText: { color: '#64748b', fontSize: 12, fontWeight: '900' },
  optionTextActive: { color: '#ffffff' },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: '#0f172a', backgroundColor: '#ffffff' },
  fixedRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  fixedLabel: { color: '#475569', fontSize: 13, fontWeight: '900' },
  summary: { color: '#0f172a', fontWeight: '800' },
  completeButton: { backgroundColor: '#0f172a', borderRadius: 16, paddingHorizontal: 18, paddingVertical: 15, alignItems: 'center' },
  completeButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '900' },
});
