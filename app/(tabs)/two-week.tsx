import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { SectionCard } from '../../components/SectionCard';
import { useSitePlanner } from '../../data/sitePlannerStore';
import { DAY_NAMES, getActiveTradesForWindow, getTradeCellText, plotHasTradeWorkInWindow, TRADE_ORDER } from '../../utils/siteProgrammeEngine';

export default function TwoWeekProgrammeScreen() {
  const { sitePlots, activityDelays } = useSitePlanner();
  const [startWeek, setStartWeek] = useState(1);
  const activeTrades = useMemo(() => getActiveTradesForWindow(sitePlots, startWeek, activityDelays), [sitePlots, startWeek, activityDelays]);
  const tradesToShow = activeTrades.length ? activeTrades : TRADE_ORDER;

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.title}>2-Week Trade Programme</Text>
        <Text style={styles.subtitle}>Trade call-off view generated from the daily plot breakdown. Day headings stay as Mon-Fri because the selected week identifies the period.</Text>
      </View>

      <SectionCard title="Week selector" subtitle={`Currently showing WK${String(startWeek).padStart(2, '0')} and WK${String(startWeek + 1).padStart(2, '0')}`}>
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

      {tradesToShow.map((trade) => {
        const visiblePlots = sitePlots.filter((plot) => plotHasTradeWorkInWindow(plot, trade, startWeek, activityDelays));
        return (
          <SectionCard key={trade} title={trade} subtitle={visiblePlots.length ? `${visiblePlots.length} plot${visiblePlots.length === 1 ? '' : 's'} in this 2-week window` : 'No activity in this 2-week window'}>
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View>
                <View style={styles.weekHeaderRow}>
                  <Text style={[styles.weekHeaderBlank, styles.plotCell]} />
                  <Text style={styles.weekGroup}>Week 1</Text>
                  <Text style={styles.weekGroup}>Week 2</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={[styles.headerCell, styles.plotCell]}>Plot</Text>
                  {[startWeek, startWeek + 1].flatMap((week) => DAY_NAMES.map((day) => <Text key={`${week}-${day}`} style={styles.dayHeader}>{day}</Text>))}
                </View>
                {visiblePlots.length === 0 ? (
                  <View style={styles.tableRow}>
                    <Text style={[styles.emptyCell, styles.plotCell]}>-</Text>
                    {Array.from({ length: 10 }).map((_, index) => <Text key={index} style={styles.emptyDayCell} />)}
                  </View>
                ) : null}
                {visiblePlots.map((plot, rowIndex) => (
                  <View key={plot.id} style={[styles.tableRow, rowIndex % 2 ? styles.altRow : null]}>
                    <Text style={[styles.bodyCell, styles.plotCell]}>{plot.plotNo}</Text>
                    {[startWeek, startWeek + 1].flatMap((week) =>
                      DAY_NAMES.map((_, dayIndex) => {
                        const text = getTradeCellText(plot, trade, week, dayIndex + 1, activityDelays);
                        return <Text key={`${plot.id}-${trade}-${week}-${dayIndex}`} style={[styles.dayCell, text ? styles.activeDayCell : null]}>{text}</Text>;
                      }),
                    )}
                  </View>
                ))}
              </View>
            </ScrollView>
          </SectionCard>
        );
      })}
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
  altRow: { backgroundColor: '#eaf2fb' },
  weekHeaderBlank: { backgroundColor: '#173b5f', borderWidth: 1, borderColor: '#9fb6ce', minHeight: 28 },
  weekGroup: { width: 400, backgroundColor: '#173b5f', color: '#ffffff', fontWeight: '900', fontSize: 12, padding: 7, borderWidth: 1, borderColor: '#9fb6ce', textAlign: 'center' },
  headerCell: { backgroundColor: '#173b5f', color: '#ffffff', fontWeight: '900', fontSize: 12, padding: 8, borderWidth: 1, borderColor: '#9fb6ce', textAlign: 'center' },
  plotCell: { width: 92 },
  dayHeader: { width: 80, backgroundColor: '#173b5f', color: '#ffffff', fontWeight: '900', fontSize: 12, padding: 8, borderWidth: 1, borderColor: '#9fb6ce', textAlign: 'center' },
  bodyCell: { color: '#0f172a', padding: 8, borderWidth: 1, borderColor: '#c8d7e6', textAlign: 'center', fontWeight: '800' },
  dayCell: { width: 80, minHeight: 58, color: '#0f172a', padding: 6, borderWidth: 1, borderColor: '#c8d7e6', textAlign: 'center', fontSize: 11, fontWeight: '900' },
  activeDayCell: { backgroundColor: '#dff0ff' },
  emptyCell: { color: '#94a3b8', padding: 8, borderWidth: 1, borderColor: '#c8d7e6', textAlign: 'center' },
  emptyDayCell: { width: 80, minHeight: 42, borderWidth: 1, borderColor: '#c8d7e6' },
});
