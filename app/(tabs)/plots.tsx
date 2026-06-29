import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { SectionCard } from '../../components/SectionCard';
import { useSitePlanner } from '../../data/sitePlannerStore';
import { DAY_NAMES, WEEK_NUMBERS } from '../../utils/siteProgrammeEngine';
import { getPlotBreakdownTemplateText, getStage1StartWeekForPlot, getTemplateForPlot } from '../../utils/templateProgramme';

export default function PlotsScreen() {
  const { sitePlots, activityDelays, plotTemplates } = useSitePlanner();

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.title}>Plot Breakdown</Text>
        <Text style={styles.subtitle}>Daily plot programme using the selected template for each plot. Different plot types can now use different task durations.</Text>
      </View>

      <SectionCard title="Daily Plot Breakdown" subtitle="One row per plot. Cells show specific activity codes such as FND, DNG, SLAB and 1ST BWK.">
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View>
            <View style={styles.weekHeaderRow}>
              <Text style={[styles.weekHeaderBlank, styles.plotCell]} />
              <Text style={[styles.weekHeaderBlank, styles.templateCell]} />
              <Text style={[styles.weekHeaderBlank, styles.stageCell]} />
              <Text style={[styles.weekHeaderBlank, styles.stageCell]} />
              {WEEK_NUMBERS.map((week) => <Text key={week} style={styles.weekGroup}>WK{String(week).padStart(2, '0')}</Text>)}
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.headerCell, styles.plotCell]}>Plot</Text>
              <Text style={[styles.headerCell, styles.templateCell]}>Template</Text>
              <Text style={[styles.headerCell, styles.stageCell]}>Stage 9 Week</Text>
              <Text style={[styles.headerCell, styles.stageCell]}>Stage 1 Start</Text>
              {WEEK_NUMBERS.flatMap((week) => DAY_NAMES.map((day) => <Text key={`${week}-${day}`} style={styles.dayHeader}>{day}</Text>))}
            </View>

            {sitePlots.map((plot, rowIndex) => {
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
      </SectionCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 4 },
  title: { color: '#0f172a', fontSize: 30, fontWeight: '900' },
  subtitle: { color: '#64748b', fontSize: 14, lineHeight: 20 },
  weekHeaderRow: { flexDirection: 'row' },
  tableRow: { flexDirection: 'row', alignItems: 'stretch' },
  altRow: { backgroundColor: '#eaf2fb' },
  weekHeaderBlank: { backgroundColor: '#173b5f', borderWidth: 1, borderColor: '#9fb6ce', minHeight: 28 },
  weekGroup: { width: 400, backgroundColor: '#173b5f', color: '#ffffff', fontWeight: '900', fontSize: 12, padding: 7, borderWidth: 1, borderColor: '#9fb6ce', textAlign: 'center' },
  headerCell: { backgroundColor: '#173b5f', color: '#ffffff', fontWeight: '900', fontSize: 12, padding: 8, borderWidth: 1, borderColor: '#9fb6ce', textAlign: 'center' },
  plotCell: { width: 92 },
  templateCell: { width: 112 },
  stageCell: { width: 106 },
  dayHeader: { width: 80, backgroundColor: '#173b5f', color: '#ffffff', fontWeight: '900', fontSize: 12, padding: 8, borderWidth: 1, borderColor: '#9fb6ce', textAlign: 'center' },
  bodyCell: { color: '#0f172a', padding: 8, borderWidth: 1, borderColor: '#c8d7e6', textAlign: 'center', fontWeight: '800' },
  stageStartCell: { color: '#0f172a', padding: 8, borderWidth: 1, borderColor: '#c8d7e6', textAlign: 'center', fontWeight: '900', backgroundColor: '#e3f3d8' },
  dayCell: { width: 80, minHeight: 58, color: '#0f172a', padding: 6, borderWidth: 1, borderColor: '#c8d7e6', textAlign: 'center', fontSize: 11, fontWeight: '900' },
  activeDayCell: { backgroundColor: '#dff0ff' },
});
