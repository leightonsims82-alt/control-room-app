import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { SectionCard } from '../../components/SectionCard';
import { TradeWorkList } from '../../components/TradeWorkList';
import { supervisors } from '../../data/demoData';
import { useProgrammeData } from '../../data/programmeStore';
import { getTradePerformance } from '../../utils/programmeLogic';

export default function TradesScreen() {
  const { plotProgrammes, plotStages, defects, updateDefect } = useProgrammeData();
  const performance = getTradePerformance(plotStages);
  const defectTrades = Array.from(new Set(defects.map((defect) => defect.trade))).filter(Boolean);
  const tradeOptions = Array.from(new Set([...performance.map((item) => item.trade), ...defectTrades]));
  const [selectedTrade, setSelectedTrade] = useState(tradeOptions[0] ?? '');

  const activeTrade = selectedTrade || tradeOptions[0] || '';
  const workItems = useMemo(() => {
    return plotStages
      .filter((stage) => stage.trade === activeTrade)
      .map((stage) => ({
        stage,
        plot: plotProgrammes.find((plot) => plot.id === stage.plotProgrammeId),
      }))
      .filter((item): item is { stage: typeof plotStages[number]; plot: typeof plotProgrammes[number] } => Boolean(item.plot));
  }, [activeTrade, plotProgrammes, plotStages]);

  const activeDefects = defects.filter((defect) => defect.trade === activeTrade && defect.status !== 'Verified fixed');

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.title}>Trades</Text>
        <Text style={styles.subtitle}>Performance, 14-day work list and open inspection actions</Text>
      </View>

      <SectionCard title="Trade Selector" subtitle="Choose a trade to view work and actions">
        <View style={styles.tradeChips}>
          {tradeOptions.map((trade) => {
            const active = trade === activeTrade;
            const actionCount = defects.filter((defect) => defect.trade === trade && defect.status !== 'Verified fixed').length;
            return (
              <Pressable key={trade} style={[styles.tradeChip, active ? styles.tradeChipActive : null]} onPress={() => setSelectedTrade(trade)}>
                <Text style={[styles.tradeChipText, active ? styles.tradeChipTextActive : null]}>{trade} {actionCount > 0 ? `(${actionCount})` : ''}</Text>
              </Pressable>
            );
          })}
        </View>
      </SectionCard>

      <SectionCard title="Open Trade Actions" subtitle={activeTrade ? `Inspection defects assigned to ${activeTrade}` : 'Select a trade'}>
        {activeDefects.length === 0 ? <Text style={styles.empty}>No open actions for this trade.</Text> : null}
        {activeDefects.map((defect) => {
          const plot = plotProgrammes.find((item) => item.id === defect.plotProgrammeId);
          return (
            <View key={defect.id} style={styles.actionRow}>
              <View style={styles.main}>
                <Text style={styles.actionPlot}>{plot?.plotName ?? 'Plot'} · {defect.stage}</Text>
                <Text style={styles.actionText}>{defect.description}</Text>
                <Text style={styles.actionMeta}>Required action: {defect.requiredAction}</Text>
                {defect.imageUri ? <Text style={styles.imageText}>Image: {defect.imageUri}</Text> : null}
                <Text style={styles.statusText}>Status: {defect.status}</Text>
              </View>
              <View style={styles.actionButtons}>
                <Pressable style={styles.smallButton} onPress={() => updateDefect(defect.id, { sentToTrade: true, status: 'Sent to trade' })}>
                  <Text style={styles.smallButtonText}>Mark sent</Text>
                </Pressable>
                <Pressable style={styles.smallButtonLight} onPress={() => updateDefect(defect.id, { fixed: 'Yes', status: 'Fixed awaiting verification' })}>
                  <Text style={styles.smallButtonLightText}>Fixed?</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </SectionCard>

      <SectionCard title="14-Day Trade Work List" subtitle={activeTrade ? `Active work for ${activeTrade}` : 'Select a trade to view upcoming work'}>
        <TradeWorkList items={workItems} trade={activeTrade || 'Unassigned'} />
      </SectionCard>

      <SectionCard title="Trade Performance" subtitle="Scored from completed stages minus delay impact">
        {performance.map((trade, index) => (
          <View key={trade.trade} style={styles.tradeRow}>
            <View style={styles.rank}><Text style={styles.rankText}>{index + 1}</Text></View>
            <View style={styles.main}>
              <Text style={styles.tradeName}>{trade.trade}</Text>
              <Text style={styles.tradeMeta}>{trade.complete} complete · {trade.total} total · {trade.delayed} delayed</Text>
            </View>
            <Text style={styles.score}>{trade.score}%</Text>
          </View>
        ))}
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
  tradeChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tradeChip: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#ffffff' },
  tradeChipActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  tradeChipText: { color: '#64748b', fontSize: 12, fontWeight: '900' },
  tradeChipTextActive: { color: '#ffffff' },
  empty: { color: '#64748b' },
  actionRow: { borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12, gap: 10 },
  main: { flex: 1 },
  actionPlot: { color: '#2563eb', fontSize: 12, fontWeight: '900' },
  actionText: { color: '#0f172a', fontWeight: '900', marginTop: 3 },
  actionMeta: { color: '#475569', fontSize: 12, marginTop: 3 },
  imageText: { color: '#64748b', fontSize: 12, marginTop: 3 },
  statusText: { color: '#dc2626', fontSize: 12, fontWeight: '900', marginTop: 3 },
  actionButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  smallButton: { backgroundColor: '#0f172a', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  smallButtonText: { color: '#ffffff', fontSize: 12, fontWeight: '900' },
  smallButtonLight: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#ffffff' },
  smallButtonLightText: { color: '#475569', fontSize: 12, fontWeight: '900' },
  tradeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12, paddingBottom: 2 },
  rank: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  rankText: { color: '#2563eb', fontWeight: '900' },
  tradeName: { color: '#0f172a', fontWeight: '900' },
  tradeMeta: { color: '#64748b', fontSize: 12, marginTop: 3 },
  score: { color: '#2563eb', fontWeight: '900', fontSize: 18 },
  supervisorRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },
  supervisorName: { color: '#0f172a', fontWeight: '900' },
  supervisorTrade: { color: '#64748b', marginTop: 3 },
  contact: { color: '#94a3b8', fontWeight: '700', fontSize: 12 },
});
