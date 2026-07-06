import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { useSitePlanner } from '../../data/sitePlannerStore';
import { getEffectiveProgrammeWeeks, TemplateActivity } from '../../utils/templateProgramme';

export default function SiteSetupScreen() {
  const { siteSetup, plotTemplates, sitePlots, resetPlotData, updateSiteSetup, updatePlotTemplate, updateTemplateActivityDuration } = useSitePlanner();
  const [selectedTemplateId, setSelectedTemplateId] = useState(plotTemplates[2]?.id ?? plotTemplates[0]?.id ?? 'threeBed');
  const selectedTemplate = plotTemplates.find((template) => template.id === selectedTemplateId) ?? plotTemplates[0];

  const updateActivity = (activityCode: string, changes: Partial<TemplateActivity>) => {
    if (!selectedTemplate) return;
    updatePlotTemplate({
      ...selectedTemplate,
      activities: selectedTemplate.activities.map((activity) => (activity.code === activityCode ? { ...activity, ...changes } : activity)),
    });
  };

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Site Setup</Text>
        <Text style={styles.title}>Programme & Plot Templates</Text>
        <Text style={styles.subtitle}>Set site defaults, reset test data and edit task names, trades, stages, durations and overlap rules by plot type.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Site programme defaults</Text>
        <View style={styles.formGrid}>
          <Field label="Site name"><TextInput value={siteSetup.siteName} onChangeText={(siteName) => updateSiteSetup({ siteName })} placeholder="Site name" style={styles.input} /></Field>
          <Field label="Default programme weeks"><TextInput value={String(siteSetup.defaultProgrammeWeeks)} onChangeText={(value) => updateSiteSetup({ defaultProgrammeWeeks: Number(value) || 0 })} keyboardType="number-pad" style={styles.input} /></Field>
          <Field label="Default stage count"><TextInput value={String(siteSetup.stageCount)} onChangeText={(value) => updateSiteSetup({ stageCount: Number(value) || 0 })} keyboardType="number-pad" style={styles.input} /></Field>
          <Field label="Working week"><TextInput value={siteSetup.workingWeek} onChangeText={(workingWeek) => updateSiteSetup({ workingWeek })} placeholder="Monday to Friday" style={styles.input} /></Field>
        </View>
      </View>

      <View style={styles.warningCard}><View style={styles.warningTextWrap}><Text style={styles.warningTitle}>Plot data reset</Text><Text style={styles.warningText}>Clears all current plots and plot delays so you can add your own site data and test for glitches from a clean start.</Text><Text style={styles.warningMeta}>Current plots: {sitePlots.length}</Text></View><Pressable style={styles.dangerButton} onPress={resetPlotData}><Text style={styles.dangerButtonText}>Reset plot data</Text></Pressable></View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Plot type templates</Text>
        <Text style={styles.helpText}>Each plot type has its own durations. The live programme now runs in strict sequence from this setup and uses the saved working week.</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}><View style={styles.templateChips}>{plotTemplates.map((template) => { const active = template.id === selectedTemplateId; return <Pressable key={template.id} style={[styles.templateChip, active ? styles.templateChipActive : null]} onPress={() => setSelectedTemplateId(template.id)}><Text style={[styles.templateChipText, active ? styles.templateChipTextActive : null]}>{template.name}</Text></Pressable>; })}</View></ScrollView>

        {selectedTemplate ? (
          <View style={styles.templatePanel}>
            <View style={styles.formGrid}>
              <Field label="Template name"><TextInput value={selectedTemplate.name} onChangeText={(name) => updatePlotTemplate({ ...selectedTemplate, name })} style={styles.input} /></Field>
              <Field label="Target weeks"><TextInput value={String(selectedTemplate.programmeWeeks)} onChangeText={(value) => updatePlotTemplate({ ...selectedTemplate, programmeWeeks: Number(value) || 0 })} keyboardType="number-pad" style={styles.input} /></Field>
              <Field label="Stage count"><TextInput value={String(selectedTemplate.stageCount)} onChangeText={(value) => updatePlotTemplate({ ...selectedTemplate, stageCount: Number(value) || 0 })} keyboardType="number-pad" style={styles.input} /></Field>
              <View style={styles.summaryBox}><Text style={styles.summaryLabel}>Calculated weeks</Text><Text style={styles.summaryValue}>{getEffectiveProgrammeWeeks(selectedTemplate, siteSetup)}</Text></View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator><View><View style={styles.tableRow}><Text style={[styles.headerCell, styles.orderCell]}>Seq</Text><Text style={[styles.headerCell, styles.taskCell]}>Task</Text><Text style={[styles.headerCell, styles.tradeCell]}>Trade</Text><Text style={[styles.headerCell, styles.displayCell]}>Display</Text><Text style={[styles.headerCell, styles.stageCell]}>Stage</Text><Text style={[styles.headerCell, styles.durationCell]}>Days</Text><Text style={[styles.headerCell, styles.overlapCell]}>Overlap</Text></View>{selectedTemplate.activities.map((activity, index) => <View key={`${activity.order}-${activity.code}`} style={[styles.tableRow, index % 2 ? styles.altRow : null]}><Text style={[styles.bodyCell, styles.orderCell]}>{activity.order}</Text><TextInput defaultValue={activity.code} onEndEditing={(event) => updateActivity(activity.code, { code: event.nativeEvent.text })} style={[styles.bodyInput, styles.taskCell]} /><TextInput defaultValue={activity.trade} onEndEditing={(event) => updateActivity(activity.code, { trade: event.nativeEvent.text })} style={[styles.bodyInput, styles.tradeCell]} /><TextInput defaultValue={activity.displayText} onEndEditing={(event) => updateActivity(activity.code, { displayText: event.nativeEvent.text })} style={[styles.bodyInput, styles.displayCell]} /><TextInput defaultValue={String(activity.stage)} keyboardType="number-pad" onEndEditing={(event) => updateActivity(activity.code, { stage: Number(event.nativeEvent.text) || activity.stage })} style={[styles.bodyInput, styles.stageCell]} /><TextInput defaultValue={String(activity.durationDays)} keyboardType="number-pad" onEndEditing={(event) => updateTemplateActivityDuration(selectedTemplate.id, activity.code, Number(event.nativeEvent.text) || 0)} style={[styles.durationInput, styles.durationCell]} /><Pressable style={[styles.overlapButton, activity.overlapAllowed ? styles.overlapButtonActive : null]} onPress={() => updateActivity(activity.code, { overlapAllowed: !activity.overlapAllowed })}><Text style={[styles.overlapText, activity.overlapAllowed ? styles.overlapTextActive : null]}>{activity.overlapAllowed ? 'Yes' : 'No'}</Text></Pressable></View>)}</View></ScrollView>
          </View>
        ) : null}
        <Pressable style={styles.primaryButton} onPress={() => router.back()}><Text style={styles.primaryButtonText}>Done</Text></Pressable>
      </View>
    </AppScreen>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <View style={styles.field}><Text style={styles.label}>{label}</Text>{children}</View>; }

const styles = StyleSheet.create({
  header: { gap: 4 }, eyebrow: { color: '#2563eb', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' }, title: { color: '#0f172a', fontSize: 30, fontWeight: '900' }, subtitle: { color: '#64748b', fontSize: 14, lineHeight: 20 }, card: { backgroundColor: '#ffffff', borderRadius: 18, borderWidth: 1, borderColor: '#e2e8f0', padding: 18, gap: 16 }, warningCard: { backgroundColor: '#fff7ed', borderRadius: 18, borderWidth: 1, borderColor: '#fed7aa', padding: 18, gap: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }, warningTextWrap: { flex: 1, minWidth: 240 }, warningTitle: { color: '#9a3412', fontSize: 18, fontWeight: '900' }, warningText: { color: '#9a3412', fontSize: 13, lineHeight: 19, marginTop: 5 }, warningMeta: { color: '#7c2d12', fontSize: 12, fontWeight: '900', marginTop: 8 }, dangerButton: { backgroundColor: '#c2410c', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11 }, dangerButtonText: { color: '#ffffff', fontWeight: '900', fontSize: 13 }, cardTitle: { color: '#0f172a', fontSize: 18, fontWeight: '900' }, formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }, field: { gap: 8, minWidth: 180, flex: 1 }, label: { color: '#475569', fontSize: 13, fontWeight: '900' }, input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: '#0f172a', backgroundColor: '#ffffff', fontWeight: '800' }, helpText: { color: '#64748b', fontSize: 12, lineHeight: 18 }, summaryBox: { minWidth: 150, backgroundColor: '#eff6ff', borderRadius: 12, padding: 12 }, summaryLabel: { color: '#2563eb', fontSize: 12, fontWeight: '900' }, summaryValue: { color: '#0f172a', fontSize: 24, fontWeight: '900' }, templateChips: { flexDirection: 'row', gap: 8, paddingVertical: 2 }, templateChip: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#ffffff' }, templateChipActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' }, templateChipText: { color: '#64748b', fontSize: 12, fontWeight: '900' }, templateChipTextActive: { color: '#ffffff' }, templatePanel: { gap: 14 }, tableRow: { flexDirection: 'row', alignItems: 'stretch' }, altRow: { backgroundColor: '#f8fafc' }, headerCell: { backgroundColor: '#173b5f', color: '#ffffff', fontWeight: '900', fontSize: 12, padding: 8, borderWidth: 1, borderColor: '#9fb6ce', textAlign: 'center' }, bodyCell: { color: '#0f172a', padding: 8, borderWidth: 1, borderColor: '#c8d7e6', fontWeight: '800' }, bodyInput: { color: '#0f172a', padding: 8, borderWidth: 1, borderColor: '#c8d7e6', backgroundColor: '#ffffff', fontWeight: '800' }, orderCell: { width: 54, textAlign: 'center' }, taskCell: { width: 150 }, tradeCell: { width: 150 }, displayCell: { width: 140 }, stageCell: { width: 70, textAlign: 'center' }, durationCell: { width: 80, textAlign: 'center' }, overlapCell: { width: 90, textAlign: 'center' }, durationInput: { color: '#0f172a', padding: 8, borderWidth: 1, borderColor: '#c8d7e6', backgroundColor: '#fff4cc', fontWeight: '900' }, overlapButton: { width: 90, borderWidth: 1, borderColor: '#c8d7e6', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' }, overlapButtonActive: { backgroundColor: '#dcfce7' }, overlapText: { color: '#64748b', fontWeight: '900' }, overlapTextActive: { color: '#166534' }, primaryButton: { alignSelf: 'flex-start', backgroundColor: '#0f172a', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 }, primaryButtonText: { color: '#ffffff', fontWeight: '900' }
});