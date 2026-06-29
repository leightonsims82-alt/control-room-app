import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { useSitePlanner } from '../../data/sitePlannerStore';

export default function SiteSetupScreen() {
  const { siteSetup, plotTemplates, updateSiteSetup, updatePlotTemplate, updateTemplateActivityDuration } = useSitePlanner();
  const [selectedTemplateId, setSelectedTemplateId] = useState(plotTemplates[2]?.id ?? plotTemplates[0]?.id ?? 'threeBed');
  const selectedTemplate = plotTemplates.find((template) => template.id === selectedTemplateId) ?? plotTemplates[0];

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Site Setup</Text>
        <Text style={styles.title}>Programme & Plot Templates</Text>
        <Text style={styles.subtitle}>Set site defaults and edit task durations by plot type, so apartments, 2 beds, 3 beds, 4 beds and 5 beds can all run differently.</Text>
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
          <Field label="Default stage count">
            <TextInput value={String(siteSetup.stageCount)} onChangeText={(value) => updateSiteSetup({ stageCount: Number(value) || 0 })} keyboardType="number-pad" style={styles.input} />
          </Field>
          <Field label="Working week">
            <TextInput value={siteSetup.workingWeek} onChangeText={(workingWeek) => updateSiteSetup({ workingWeek })} placeholder="Monday to Friday" style={styles.input} />
          </Field>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Plot type templates</Text>
        <Text style={styles.helpText}>Choose a template, then edit the programme weeks, number of stages and task durations. These values are used when plots are assigned to that template.</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.templateChips}>
            {plotTemplates.map((template) => {
              const active = template.id === selectedTemplateId;
              return (
                <Pressable key={template.id} style={[styles.templateChip, active ? styles.templateChipActive : null]} onPress={() => setSelectedTemplateId(template.id)}>
                  <Text style={[styles.templateChipText, active ? styles.templateChipTextActive : null]}>{template.name}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        {selectedTemplate ? (
          <View style={styles.templatePanel}>
            <View style={styles.formGrid}>
              <Field label="Template name">
                <TextInput value={selectedTemplate.name} onChangeText={(name) => updatePlotTemplate({ ...selectedTemplate, name })} style={styles.input} />
              </Field>
              <Field label="Template programme weeks">
                <TextInput value={String(selectedTemplate.programmeWeeks)} onChangeText={(value) => updatePlotTemplate({ ...selectedTemplate, programmeWeeks: Number(value) || 0 })} keyboardType="number-pad" style={styles.input} />
              </Field>
              <Field label="Template stage count">
                <TextInput value={String(selectedTemplate.stageCount)} onChangeText={(value) => updatePlotTemplate({ ...selectedTemplate, stageCount: Number(value) || 0 })} keyboardType="number-pad" style={styles.input} />
              </Field>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View>
                <View style={styles.tableRow}>
                  <Text style={[styles.headerCell, styles.orderCell]}>Seq</Text>
                  <Text style={[styles.headerCell, styles.taskCell]}>Task</Text>
                  <Text style={[styles.headerCell, styles.tradeCell]}>Trade</Text>
                  <Text style={[styles.headerCell, styles.stageCell]}>Stage</Text>
                  <Text style={[styles.headerCell, styles.durationCell]}>Days</Text>
                </View>
                {selectedTemplate.activities.map((activity, index) => (
                  <View key={activity.code} style={[styles.tableRow, index % 2 ? styles.altRow : null]}>
                    <Text style={[styles.bodyCell, styles.orderCell]}>{activity.order}</Text>
                    <Text style={[styles.bodyCell, styles.taskCell]}>{activity.code}</Text>
                    <Text style={[styles.bodyCell, styles.tradeCell]}>{activity.trade}</Text>
                    <Text style={[styles.bodyCell, styles.stageCell]}>{activity.stage}</Text>
                    <TextInput
                      defaultValue={String(activity.durationDays)}
                      keyboardType="number-pad"
                      onEndEditing={(event) => updateTemplateActivityDuration(selectedTemplate.id, activity.code, Number(event.nativeEvent.text) || 0)}
                      style={[styles.durationInput, styles.durationCell]}
                    />
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
  formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  field: { gap: 8, minWidth: 180, flex: 1 },
  label: { color: '#475569', fontSize: 13, fontWeight: '900' },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: '#0f172a', backgroundColor: '#ffffff', fontWeight: '800' },
  helpText: { color: '#64748b', fontSize: 12, lineHeight: 18 },
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
  orderCell: { width: 54, textAlign: 'center' },
  taskCell: { width: 150 },
  tradeCell: { width: 150 },
  stageCell: { width: 70, textAlign: 'center' },
  durationCell: { width: 80, textAlign: 'center' },
  durationInput: { color: '#0f172a', padding: 8, borderWidth: 1, borderColor: '#c8d7e6', backgroundColor: '#fff4cc', fontWeight: '900' },
  primaryButton: { alignSelf: 'flex-start', backgroundColor: '#0f172a', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  primaryButtonText: { color: '#ffffff', fontWeight: '900' },
});
