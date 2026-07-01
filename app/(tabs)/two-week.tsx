import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { SectionCard } from '../../components/SectionCard';
import { useSitePlanner } from '../../data/sitePlannerStore';
import { DAY_NAMES, PROGRAMME_STAGE_SEQUENCE } from '../../utils/siteProgrammeEngine';
import { getStageNumberForPlotWeek, getTemplateForPlot } from '../../utils/templateProgramme';

export default function TwoWeekProgrammeScreen() {
  const { sitePlots, plotTemplates } = useSitePlanner();
  const [startWeek, setStartWeek] = useState(1);

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.title}>Rolling 2-Week Programme</Text>
        <Text style={styles.subtitle}>One row per plot. Scroll the week selector to issue the current two-week block. Cells show stage numbers only.</Text>
      </View>

      <SectionCard title="2-week selector" subtitle={`Currently showing WK${String(startWeek).padStart(2, '0')} and WK${String(startWeek + 1).padStart(2, '0')}`}>
        <View style={styles.weekControls}>
          <Pressable style={styles.weekButton} onPress={() => setStartWeek((week) => Math.max(1, week - 1))}>
            <Text style={styles.weekButtonText}>Previous</Text>
          </Pressable>
          <Text style={styles.weekLabel}>WK{String(startWeek).padStart(2, '0')} + WK{String(startWeek + 1).padStart(2, '0')}</Text>
          <Pressable style={styles.weekButton} onPress={() => setStartWeek((week) => Math.min(51, week + 1))}>
            <Text style={styles.weekButtonText}>Next</Text>
          </Pressable>
        </View>
      </SectionCard>

      <SectionCard title="Rolling programme" subtitle="This is the app version of the Excel rolling programme: Plot No | House Type | dates across the top | stage numbers only.">
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View>
            <View style={styles.weekHeaderRow}>
              <Text style={[styles.weekHeaderBlank, styles.plotCell]} />
              <Text style={[styles.weekHeaderBlank, styles.templateCell]} />
              <Text style={styles.weekGroup}>Week 1</Text>
              <Text style={styles.weekGroup}>Week 2</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.headerCell, styles.plotCell]}>Plot No</Text>
              <Text style={[styles.headerCell, styles.templateCell]}>House Type</Text>
              {[startWeek, startWeek + 1].flatMap((week) => DAY_NAMES.map((day) => <Text key={`${week}-${day}`} style={styles.dayHeader}>WK{String(week).padStart(2, '0')} {day}</Text>))}
            </View>

            {sitePlots.map((plot, rowIndex) => {
              const template = getTemplateForPlot(plot, plotTemplates);
              return (
                <View key={plot.id} style={[styles.tableRow, rowIndex % 2 ? styles.altRow : null]}>
                  <Text style={[styles.bodyCell, styles.plotCell]}>{plot.plotNo}</Text>
                  <Text style={[styles.bodyCell, styles.templateCell]}>{template.name}</Text>
                  {[startWeek, startWeek + 1].flatMap((week) =>
                    DAY_NAMES.map((_, dayIndex) => {
                      const stage = getStageNumberForPlotWeek(plot, week, plotTemplates);
                      return <Text key={`${plot.id}-${week}-${dayIndex}`} style={[styles.dayCell, stage ? styles.activeDayCell : null]}>{stage}</Text>;
                    }),
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </SectionCard>

      <SectionCard title="Stage key" subtitle="Use this key to read the stage numbers shown in the programme cells.">
        <View style={styles.stageKeyGrid}>
          {PROGRAMME_STAGE_SEQUENCE.map((stage) => (
            <View key={stage.stage} style={styles.stageKeyItem}>
              <Text style={styles.stageKeyNumber}>{stage.stage}</Text>
              <Text style={styles.stageKeyLabel}>{stage.label}</Text>
            </View>
          ))}
        </View>
      </SectionCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 4 },
  title: { color: '#0f172a', fontSize: 30, fontWeight: '900' },
  subtitle: { color: '#64748b', fontSize: 14, lineHeight: 20 },
  weekControls: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  weekButton: { backgroundColor: '#0f172a', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  weekButtonText: { color: '#ffffff', fontWeight: '900' },
  weekLabel: { color: '#0f172a', fontWeight: '900', fontSize: 16 },
  weekHeaderRow: { flexDirection: 'row' },
  tableRow: { flexDirection: 'row', alignItems: 'stretch' },
  altRow: { backgroundColor: '#f8fbff' },
  weekHeaderBlank: { backgroundColor: '#173b5f', borderWidth: 1, borderColor: '#9fb6ce', minHeight: 28 },
  weekGroup: { width: 700, backgroundColor: '#173b5f', color: '#ffffff', fontWeight: '900', fontSize: 12, padding: 7, borderWidth: 1, borderColor: '#9fb6ce', textAlign: 'center' },
  headerCell: { backgroundColor: '#173b5f', color: '#ffffff', fontWeight: '900', fontSize: 12, padding: 8, borderWidth: 1, borderColor: '#9fb6ce', textAlign: 'center' },
  plotCell: { width: 94 },
  templateCell: { width: 130 },
  dayHeader: { width: 140, backgroundColor: '#173b5f', color: '#ffffff', fontWeight: '900', fontSize: 12, padding: 8, borderWidth: 1, borderColor: '#9fb6ce', textAlign: 'center' },
  bodyCell: { color: '#0f172a', padding: 8, borderWidth: 1, borderColor: '#c8d7e6', textAlign: 'center', fontWeight: '800' },
  dayCell: { width: 140, minHeight: 48, color: '#0f172a', padding: 8, borderWidth: 1, borderColor: '#c8d7e6', textAlign: 'center', fontSize: 16, fontWeight: '900' },
  activeDayCell: { backgroundColor: '#dff0ff' },
  stageKeyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stageKeyItem: { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 210, flex: 1, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 10 },
  stageKeyNumber: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#173b5f', color: '#ffffff', textAlign: 'center', lineHeight: 30, fontWeight: '900' },
  stageKeyLabel: { flex: 1, color: '#0f172a', fontWeight: '900' },
});
