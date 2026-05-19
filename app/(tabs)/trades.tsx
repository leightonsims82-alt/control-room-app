import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { SectionCard } from '../../components/SectionCard';
import { TradeWorkList } from '../../components/TradeWorkList';
import { supervisors } from '../../data/demoData';
import { useProgrammeData } from '../../data/programmeStore';
import { getTradePerformance } from '../../utils/programmeLogic';

export default function TradesScreen() {
  const { plotProgrammes, plotStages } = useProgrammeData();
  const performance = getTradePerformance(plotStages);
  const [selectedTrade, setSelectedTrade] = useState(performance[0]?.trade ?? '');

  const activeTrade = selectedTrade || performance[0]?.trade || '';
  const workItems = useMemo(() => {
    return plotStages
      .filter((stage) => stage.trade === activeTrade)
      .map((stage) => ({
        stage,
        plot: plotProgrammes.find((plot) => plot.id === stage.plotProgrammeId),
      }))
      .filter((item): item is { stage: typeof plotStages[number]; plot: typeof plotProgrammes[number] } => Boolean(item.plot));
  }, [activeTrade, plotProgrammes, plotStages]);

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.title}>Trades</Text>
        <Text style={styles.subtitle}>Performance, 14-day work list and supervisor overview</Text>
      </View>

      <SectionCard title="Trade Performance" subtitle="Scored from completed stages minus delay impact">
        {performance.map((trade, index) => {
          const active = trade.trade === activeTrade;
          return (
            <Pressable key={trade.trade} style={[styles.tradeRow, active ? styles.tradeRowActive : null]} onPress={() => setSelectedTrade(trade.trade)}>
              <View style={styles.rank}><Text style={styles.rankText}>{index + 1}</Text></View>
              <View style={styles.main}>
                <Text style={styles.tradeName}>{trade.trade}</Text>
                <Text style={styles.tradeMeta}>{trade.complete} complete · {trade.total} total · {trade.delayed} delayed</Text>
              </View>
              <Text style={styles.score}>{trade.score}%</Text>
            </Pressable>
          );
        })}
      </SectionCard>

      <SectionCard title="14-Day Trade Work List" subtitle={activeTrade ? `Active work for ${activeTrade}` : 'Select a trade to view upcoming work'}>
        <TradeWorkList items={workItems} trade={activeTrade || 'Unassigned'} />
      </SectionCard>

      <SectionCard title="Supervisors" subtitle="Initial contact list for trade accountability">
        {supervisors.map((supervisor) => (
          <View key={supervisor.id} style={styles.supervisorRow}>
            <View>
              <Text style={styles.supervisorName}>{supervisor.supervisorName}</Text>
              <Text style={styles.supervisorTrade}>{supervisor.trade}</Text>
            </View>
            <Text style={styles.contact}>Details pending</Text>
          </View>
        ))}
      </SectionCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 4 },
  title: { color: '#0f172a', fontSize: 30, fontWeight: '900' },
  subtitle: { color: '#64748b', fontSize: 14 },
  tradeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12, paddingBottom: 2 },
  tradeRowActive: { backgroundColor: '#f8fafc', borderRadius: 12, paddingHorizontal: 8, paddingBottom: 10, borderTopColor: '#dbeafe' },
  rank: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  rankText: { color: '#2563eb', fontWeight: '900' },
  main: { flex: 1 },
  tradeName: { color: '#0f172a', fontWeight: '900' },
  tradeMeta: { color: '#64748b', fontSize: 12, marginTop: 3 },
  score: { color: '#2563eb', fontWeight: '900', fontSize: 18 },
  supervisorRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },
  supervisorName: { color: '#0f172a', fontWeight: '900' },
  supervisorTrade: { color: '#64748b', marginTop: 3 },
  contact: { color: '#94a3b8', fontWeight: '700', fontSize: 12 },
});
