import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { SectionCard } from '../../components/SectionCard';
import { useSitePlanner } from '../../data/sitePlannerStore';
import { DAY_NAMES, WEEK_NUMBERS } from '../../utils/siteProgrammeEngine';
import { getPlotBreakdownTemplateText, getStage1StartWeekForPlot, getTemplateForPlot } from '../../utils/templateProgramme';

const ALL_TYPES = 'All plot types';
const DAY_WIDTH = 82;
const WEEK_WIDTH = DAY_WIDTH * 5;

export default function PlotsScreen() {
  const { sitePlots, activityDelays, plotTemplates } = useSitePlanner();
  const [selectedTemplateId, setSelectedTemplateId] = useState(ALL_TYPES);
  const filteredPlots = selectedTemplateId === ALL_TYPES ? sitePlots : sitePlots.filter((plot) => plot.templateId === selectedTemplateId);
  const templateFilters = [ALL_TYPES, ...plotTemplates.map((template) => template.id)];

  return (
    <AppScreen>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>Full programme</Text>
          <Text style={styles.title}>Plot Breakdown</Text>
          <Text style={styles.subtitle}>One row per plot with daily activity codes across the full programme.</Text>
        </View>
        <View style={styles.badge}><Text style={styles.badgeText}>{filteredPlots.length} plot{filteredPlots.length === 1 ? '' : 's'}</Text></View>
      </View>

      <View style={styles.controlCard}>
        <Text style={styles.controlTitle}>Filter by plot type</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterRow}>
            {templateFilters.map((filter) => {
              const active = selectedTemplateId === filter;
              const label = filter === ALL_TYPES ? ALL_TYPES : plotTemplates.find((template) => template.id === filter)?.name ?? filter;
              return (
                <Pressable key={filter} style={[styles.filterPill, active && styles.filterPillActive]} onPress={() => setSelectedTemplateId(filter)}>
                  <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>

      <SectionCard title="Daily Plot Breakdown" subtitle="Cells show short activity codes such as FND, DNG, SLAB and 1ST BWK.">
        {sitePlots.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No plots added yet</Text>
            <Text style={styles.emptyText}>Add your own plot numbers in the plot setup area. Once plots are added, this screen will generate the full daily breakdown automatically.</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View style={styles.tableWrap}>
              <View style={styles.weekHeaderRow}>
                <Text style={[styles.weekHeaderBlank, styles.plotCell]} />
                <Text style={[styles.weekHeaderBlank, styles.templateCell]} />
                <Text style={[styles.weekHeaderBlank, styles.stageCell]} />
                <Text style={[styles.weekHeaderBlank, styles.stageCell]} />
                {WEEK_NUMBERS.map((week) => <Text key={week} style={styles.weekGroup}>WK{String(week).padStart(2, '0')}</Text>)}
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.headerCell, styles.plotCell]}>Plot</Text>
                <Text style={[styles.headerCell, styles.templateCell]}>Type</Text>
                <Text style={[styles.headerCell, styles.stageCell]}>Stage 9</Text>
                <Text style={[styles.headerCell, styles.stageCell]}>Stage 1</Text>
                {WEEK_NUMBERS.flatMap((week) => DAY_NAMES.map((day) => <Text key={`${week}-${day}`} style={styles.dayHeader}>{day}</Text>))}
              </View>

              {filteredPlots.map((plot, rowIndex) => {
                const template = getTemplateForPlot(plot, plotTemplates);
                return (
                  <View key={plot.id} style={[styles.tableRow, rowIndex % 2 ? styles.altRow : null]}>
                    <Text style={[styles.bodyCell, styles.plotCell]}>{plot.plotNo}</Text>
                    <Text style={[styles.bodyCell, styles.templateCell]}>{template.name}</Text>
                    <Text style={[styles.bodyCell, styles.stageCell]}>{plot.stage9CompleteWeek}</Text>
                    <Text style={[styles.stageStartCell, styles.stageCell]}>{getStage1StartWeekForPlot(plot, plotTemplates)}</Text>
                    {WEEK_NUMBERS.flatMap((week) =>
                      DAY_NAMES.map((_, dayIndex) => {
                        const text = getPlotBreakdownTemplateText(plot, week, dayIndex + 1, activityDelays, plotTemplates);
                        return <Text key={`${plot.id}-${week}-${dayIndex}`} style={[styles.dayCell, text ? styles.activeDayCell : null]}>{text}</Text>;
                      }),
                    )}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        )}
      </SectionCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' },
  kicker: { color: '#2563eb', fontSize: 13, fontWeight: '900', textTransform: 'uppercase' },
  title: { color: '#0f172a', fontSize: 32, fontWeight: '900', marginTop: 4 },
  subtitle: { color: '#64748b', fontSize: 15, lineHeight: 22, marginTop: 6 },
  badge: { backgroundColor: '#eff6ff', borderRadius: 999, borderWidth: 1, borderColor: '#bfdbfe', paddingHorizontal: 12, paddingVertical: 8 },
  badgeText: { color: '#1d4ed8', fontWeight: '900', fontSize: 12 },
  controlCard: { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#e2e8f0', padding: 16, gap: 10 },
  controlTitle: { color: '#0f172a', fontSize: 15, fontWeight: '900' },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterPill: { backgroundColor: '#f8fafc', borderRadius: 999, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 13, paddingVertical: 9 },
  filterPillActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  filterPillText: { color: '#64748b', fontSize: 12, fontWeight: '900' },
  filterPillTextActive: { color: '#fff' },
  emptyCard: { backgroundColor: '#f8fafc', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', padding: 18 },
  emptyTitle: { color: '#0f172a', fontSize: 18, fontWeight: '900' },
  emptyText: { color: '#64748b', fontSize: 14, lineHeight: 21, marginTop: 6 },
  tableWrap: { borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#9fb6ce' },
  weekHeaderRow: { flexDirection: 'row' },
  tableRow: { flexDirection: 'row', alignItems: 'stretch' },
  altRow: { backgroundColor: '#f8fbff' },
  weekHeaderBlank: { backgroundColor: '#173b5f', borderRightWidth: 1, borderRightColor: '#9fb6ce', minHeight: 30 },
  weekGroup: { width: WEEK_WIDTH, backgroundColor: '#173b5f', color: '#ffffff', fontWeight: '900', fontSize: 12, padding: 8, borderRightWidth: 1, borderRightColor: '#9fb6ce', textAlign: 'center' },
  headerCell: { backgroundColor: '#173b5f', color: '#ffffff', fontWeight: '900', fontSize: 12, padding: 9, borderTopWidth: 1, borderTopColor: '#9fb6ce', borderRightWidth: 1, borderRightColor: '#9fb6ce', textAlign: 'center' },
  plotCell: { width: 92 },
  templateCell: { width: 118 },
  stageCell: { width: 88 },
  dayHeader: { width: DAY_WIDTH, backgroundColor: '#173b5f', color: '#ffffff', fontWeight: '900', fontSize: 12, padding: 9, borderTopWidth: 1, borderTopColor: '#9fb6ce', borderRightWidth: 1, borderRightColor: '#9fb6ce', textAlign: 'center' },
  bodyCell: { color: '#0f172a', padding: 8, borderTopWidth: 1, borderTopColor: '#c8d7e6', borderRightWidth: 1, borderRightColor: '#c8d7e6', textAlign: 'center', fontWeight: '900', backgroundColor: '#fff' },
  stageStartCell: { color: '#0f172a', padding: 8, borderTopWidth: 1, borderTopColor: '#c8d7e6', borderRightWidth: 1, borderRightColor: '#c8d7e6', textAlign: 'center', fontWeight: '900', backgroundColor: '#dcfce7' },
  dayCell: { width: DAY_WIDTH, minHeight: 54, color: '#0f172a', padding: 6, borderTopWidth: 1, borderTopColor: '#c8d7e6', borderRightWidth: 1, borderRightColor: '#c8d7e6', textAlign: 'center', fontSize: 10, fontWeight: '900', textAlignVertical: 'center' },
  activeDayCell: { backgroundColor: '#dbeafe' },
});
