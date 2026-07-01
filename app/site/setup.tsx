import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { useSitePlanner } from '../../data/sitePlannerStore';
import { PROGRAMME_STAGE_SEQUENCE, ProgrammeStageNumber } from '../../utils/siteProgrammeEngine';
import { getEffectiveProgrammeWeeks, getHouseTypeLabel, TemplateActivity } from '../../utils/templateProgramme';

export default function SiteSetupScreen() {
  const { siteSetup, plotTemplates, updateSiteSetup, addPlotTemplate, updatePlotTemplate, updateTemplateActivityDuration } = useSitePlanner();
  const [selectedTemplateId, setSelectedTemplateId] = useState(plotTemplates[2]?.id ?? plotTemplates[0]?.id ?? 'threeBed');
  const [newHouseTypeCode, setNewHouseTypeCode] = useState('');
  const [newHouseTypeName, setNewHouseTypeName] = useState('');
  const selectedTemplate = plotTemplates.find((template) => template.id === selectedTemplateId) ?? plotTemplates[0];

  const updateActivity = (activityCode: string, changes: Partial<TemplateActivity>) => {
    if (!selectedTemplate) return;
    updatePlotTemplate({
      ...selectedTemplate,
      activities: selectedTemplate.activities.map((activity) => (activity.code === activityCode ? { ...activity, ...changes } : activity)),
    });
  };

  const saveNewHouseType = async () => {
    if (!newHouseTypeCode.trim() && !newHouseTypeName.trim()) return;
    await addPlotTemplate({ name: newHouseTypeName, houseTypeCode: newHouseTypeCode, baseTemplateId: selectedTemplate?.id });
    setNewHouseTypeCode('');
    setNewHouseTypeName('');
  };

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Programme Buddy Setup</Text>
        <Text style={styles.title}>Build Sequence Key</Text>
        <Text style={styles.subtitle}>This is the source data behind the master stage matrix, plot breakdown and 2-week trade programme.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Site programme defaults</Text>
        <View style={styles.formGrid}>
          <Field label="Site name">
            <TextInput value={siteSetup.siteName} onChangeText={(siteName) => updateSiteSetup({ siteName })} placeholder="Site name" style={styles.input} />
          </Field>
          <Field label="Default programme weeks">
            <TextInput value={String(siteSetup.defaultProgrammeWeeks)} onChangeText={(value) => updateSiteSetup({ defaultProgrammeWeeks: Number(value) || 0 })} keyboardType="number-pad" style={styles.input} />
          </Field>
          <Field label="Stage count">
            <TextInput value={String(siteSetup.stageCount)} onChangeText={(value) => updateSiteSetup({ stageCount: Number(value) || 0 })} keyboardType="number-pad" style={styles.input} />
          </Field>
          <Field label="Working week">
            <TextInput value={siteSetup.workingWeek} onChangeText={(workingWeek) => updateSiteSetup({ workingWeek })} placeholder="Monday to Friday" style={styles.input} />
          </Field>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Stage key</Text>
        <Text style={styles.helpText}>The master programme shows stage numbers only. This key explains what each number means.</Text>
        <View style={styles.stageGrid}>
          {PROGRAMME_STAGE_SEQUENCE.map((stage) => (
            <View key={stage.stage} style={styles.stageItem}>
              <Text style={styles.stageNumber}>{stage.stage}</Text>
              <View style={styles.stageMain}>
                <Text style={styles.stageLabel}>{stage.label}</Text>
                <Text style={styles.stageMeta}>{stage.durationWeeks} week{stage.durationWeeks === 1 ? '' : 's'}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>House type templates</Text>
        <Text style={styles.helpText}>Enter the house type names or codes used by your organisation. These labels feed the Master, Plot Breakdown and Rolling 2-Week views.</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.templateChips}>
            {plotTemplates.map((template) => {
              const active = template.id === selectedTemplateId;
              return (
                <Pressable key={template.id} style={[styles.templateChip, active ? styles.templateChipActive : null]} onPress={() => setSelectedTemplateId(template.id)}>
                  <Text style={[styles.templateChipText, active ? styles.templateChipTextActive : null]}>{getHouseTypeLabel(template)}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.addPanel}>
          <Text style={styles.panelTitle}>Add organisation house type</Text>
          <Text style={styles.helpText}>Use this for codes such as HT-A, B3, The Ash, SA-31 or whatever your business uses.</Text>
          <View style={styles.formGrid}>
            <Field label="House type code">
              <TextInput value={newHouseTypeCode} onChangeText={setNewHouseTypeCode} placeholder="e.g. HT-A" style={styles.input} />
            </Field>
            <Field label="House type name">
              <TextInput value={newHouseTypeName} onChangeText={setNewHouseTypeName} placeholder="e.g. The Ash" style={styles.input} />
            </Field>
            <Pressable style={styles.secondaryButton} onPress={saveNewHouseType}>
              <Text style={styles.secondaryButtonText}>Add House Type</Text>
            </Pressable>
          </View>
        </View>

        {selectedTemplate ? (
          <View style={styles.templatePanel}>
            <View style={styles.formGrid}>
              <Field label="House type code">
                <TextInput value={selectedTemplate.houseTypeCode} onChangeText={(houseTypeCode) => updatePlotTemplate({ ...selectedTemplate, houseTypeCode })} style={styles.input} />
              </Field>
              <Field label="House type name">
                <TextInput value={selectedTemplate.name} onChangeText={(name) => updatePlotTemplate({ ...selectedTemplate, name })} style={styles.input} />
              </Field>
              <Field label="Programme weeks">
                <TextInput value={String(selectedTemplate.programmeWeeks)} onChangeText={(value) => updatePlotTemplate({ ...selectedTemplate, programmeWeeks: Number(value) || 0 })} keyboardType="number-pad" style={styles.input} />
              </Field>
              <Field label="Stage count">
                <TextInput value={String(selectedTemplate.stageCount)} onChangeText={(value) => updatePlotTemplate({ ...selectedTemplate, stageCount: Number(value) || 0 })} keyboardType="number-pad" style={styles.input} />
              </Field>
              <View style={styles.summaryBox}>
                <Text style={styles.summaryLabel}>Shown as</Text>
                <Text style={styles.summaryValueSmall}>{getHouseTypeLabel(selectedTemplate)}</Text>
              </View>
              <View style={styles.summaryBox}>
                <Text style={styles.summaryLabel}>Weeks</Text>
                <Text style={styles.summaryValue}>{getEffectiveProgrammeWeeks(selectedTemplate)}</Text>
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View>
                <View style={styles.tableRow}>
                  <Text style={[styles.headerCell, styles.orderCell]}>Seq</Text>
                  <Text style={[styles.headerCell, styles.taskCell]}>Activity Code</Text>
                  <Text style={[styles.headerCell, styles.tradeCell]}>Trade</Text>
                  <Text style={[styles.headerCell, styles.displayCell]}>Trade Display</Text>
                  <Text style={[styles.headerCell, styles.stageCell]}>Stage</Text>
                  <Text style={[styles.headerCell, styles.durationCell]}>Days</Text>
                </View>
                {selectedTemplate.activities.map((activity, index) => (
                  <View key={`${activity.order}-${activity.code}`} style={[styles.tableRow, index % 2 ? styles.altRow : null]}>
                    <Text style={[styles.bodyCell, styles.orderCell]}>{activity.order}</Text>
                    <TextInput defaultValue={activity.code} onEndEditing={(event) => updateActivity(activity.code, { code: event.nativeEvent.text })} style={[styles.bodyInput, styles.taskCell]} />
                    <TextInput defaultValue={activity.trade} onEndEditing={(event) => updateActivity(activity.code, { trade: event.nativeEvent.text })} style={[styles.bodyInput, styles.tradeCell]} />
                    <TextInput defaultValue={activity.displayText} onEndEditing={(event) => updateActivity(activity.code, { displayText: event.nativeEvent.text })} style={[styles.bodyInput, styles.displayCell]} />
                    <TextInput defaultValue={String(activity.stage)} keyboardType="number-pad" onEndEditing={(event) => updateActivity(activity.code, { stage: toStageNumber(event.nativeEvent.text, activity.stage) })} style={[styles.bodyInput, styles.stageCell]} />
                    <TextInput defaultValue={String(activity.durationDays)} keyboardType="number-pad" onEndEditing={(event) => updateTemplateActivityDuration(selectedTemplate.id, activity.code, Number(event.nativeEvent.text) || 0)} style={[styles.durationInput, styles.durationCell]} />
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        ) : null}

        <Pressable style={styles.primaryButton} onPress={() => router.back()}>
          <Text style={styles.primaryButtonText}>Done</Text>
        </Pressable>
      </View>
    </AppScreen>
  );
}

function toStageNumber(value: string, fallback: ProgrammeStageNumber): ProgrammeStageNumber {
  const parsed = Number(value);
  return PROGRAMME_STAGE_SEQUENCE.some((stage) => stage.stage === parsed) ? (parsed as ProgrammeStageNumber) : fallback;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: 4 },
  eyebrow: { color: '#2563eb', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  title: { color: '#0f172a', fontSize: 30, fontWeight: '900' },
  subtitle: { color: '#64748b', fontSize: 14, lineHeight: 20 },
  card: { backgroundColor: '#ffffff', borderRadius: 18, borderWidth: 1, borderColor: '#e2e8f0', padding: 18, gap: 16 },
  cardTitle: { color: '#0f172a', fontSize: 18, fontWeight: '900' },
  panelTitle: { color: '#0f172a', fontSize: 15, fontWeight: '900' },
  addPanel: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, padding: 14, gap: 10 },
  formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' },
  field: { gap: 8, minWidth: 180, flex: 1 },
  label: { color: '#475569', fontSize: 13, fontWeight: '900' },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: '#0f172a', backgroundColor: '#ffffff', fontWeight: '800' },
  helpText: { color: '#64748b', fontSize: 12, lineHeight: 18 },
  summaryBox: { minWidth: 150, backgroundColor: '#eff6ff', borderRadius: 12, padding: 12 },
  summaryLabel: { color: '#2563eb', fontSize: 12, fontWeight: '900' },
  summaryValue: { color: '#0f172a', fontSize: 24, fontWeight: '900' },
  summaryValueSmall: { color: '#0f172a', fontSize: 16, fontWeight: '900', marginTop: 4 },
  templateChips: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  templateChip: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#ffffff' },
  templateChipActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  templateChipText: { color: '#64748b', fontSize: 12, fontWeight: '900' },
  templateChipTextActive: { color: '#ffffff' },
  templatePanel: { gap: 14 },
  tableRow: { flexDirection: 'row', alignItems: 'stretch' },
  altRow: { backgroundColor: '#f8fafc' },
  headerCell: { backgroundColor: '#173b5f', color: '#ffffff', fontWeight: '900', fontSize: 12, padding: 8, borderWidth: 1, borderColor: '#9fb6ce', textAlign: 'center' },
  bodyCell: { color: '#0f172a', padding: 8, borderWidth: 1, borderColor: '#c8d7e6', fontWeight: '800' },
  bodyInput: { color: '#0f172a', padding: 8, borderWidth: 1, borderColor: '#c8d7e6', backgroundColor: '#ffffff', fontWeight: '800' },
  orderCell: { width: 54, textAlign: 'center' },
  taskCell: { width: 160 },
  tradeCell: { width: 150 },
  displayCell: { width: 140 },
  stageCell: { width: 70, textAlign: 'center' },
  durationCell: { width: 80, textAlign: 'center' },
  durationInput: { color: '#0f172a', padding: 8, borderWidth: 1, borderColor: '#c8d7e6', backgroundColor: '#fff4cc', fontWeight: '900' },
  primaryButton: { alignSelf: 'flex-start', backgroundColor: '#0f172a', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  primaryButtonText: { color: '#ffffff', fontWeight: '900' },
  secondaryButton: { alignSelf: 'flex-end', backgroundColor: '#2563eb', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  secondaryButtonText: { color: '#ffffff', fontWeight: '900' },
  stageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stageItem: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 250, flex: 1, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 10 },
  stageNumber: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#173b5f', color: '#ffffff', textAlign: 'center', lineHeight: 34, fontWeight: '900' },
  stageMain: { flex: 1 },
  stageLabel: { color: '#0f172a', fontWeight: '900' },
  stageMeta: { color: '#64748b', fontSize: 12, marginTop: 2 },
});
