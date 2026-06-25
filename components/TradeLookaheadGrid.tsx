import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { DefectAction, PlotProgramme, PlotStage } from '../types/models';
import { getInspectionTemplateForStage } from '../utils/inspectionTemplateResolver';

type TradeLookaheadGridProps = {
  trade: string;
  plotProgrammes: PlotProgramme[];
  plotStages: PlotStage[];
  defects: DefectAction[];
};

export function TradeLookaheadGrid({ trade, plotProgrammes, plotStages, defects }: TradeLookaheadGridProps) {
  const rows = plotStages
    .filter((stage) => stage.trade === trade)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .slice(0, 20)
    .map((stage) => {
      const plot = plotProgrammes.find((item) => item.id === stage.plotProgrammeId);
      const openActions = defects.filter((item) => item.plotStageId === stage.id && item.status !== 'Verified fixed');
      return {
        stage,
        plot,
        inspection: getInspectionTemplateForStage(stage.stageName),
        openActions,
      };
    });

  if (rows.length === 0) {
    return <Text style={styles.empty}>No programme items found for this trade.</Text>;
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator>
      <View style={styles.table}>
        <View style={[styles.row, styles.headerRow]}>
          <Cell text="Date" header width={92} />
          <Cell text="Plot" header width={90} />
          <Cell text="Stage / activity" header width={190} />
          <Cell text="Trade" header width={120} />
          <Cell text="Inspection" header width={130} />
          <Cell text="Open actions" header width={120} />
          <Cell text="Notes" header width={220} />
        </View>
        {rows.map(({ stage, plot, inspection, openActions }, index) => (
          <View key={stage.id} style={[styles.row, index % 2 === 0 ? styles.altRow : null]}>
            <Cell text={stage.startDate} width={92} />
            <Cell text={plot?.plotName ?? 'Plot'} width={90} strong />
            <Cell text={stage.stageName} width={190} />
            <Cell text={stage.trade} width={120} />
            <Cell text={inspection ? inspection.keyStageName : 'None'} width={130} tone={inspection ? 'blue' : undefined} />
            <Cell text={String(openActions.length)} width={120} tone={openActions.length > 0 ? 'red' : undefined} />
            <Cell text={openActions.map((item) => item.description).join('; ') || 'Confirm labour, materials and access'} width={220} />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function Cell({ text, header, width, strong, tone }: { text: string; header?: boolean; width: number; strong?: boolean; tone?: 'blue' | 'red' }) {
  return (
    <View style={[styles.cell, { width }, header ? styles.headerCell : null]}>
      <Text style={[styles.cellText, header ? styles.headerText : null, strong ? styles.strongText : null, tone === 'blue' ? styles.blueText : null, tone === 'red' ? styles.redText : null]} numberOfLines={3}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { color: '#64748b', fontWeight: '700' },
  table: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, overflow: 'hidden' },
  row: { flexDirection: 'row', backgroundColor: '#ffffff' },
  altRow: { backgroundColor: '#f8fafc' },
  headerRow: { backgroundColor: '#0f172a' },
  cell: { minHeight: 48, borderRightWidth: 1, borderRightColor: '#e2e8f0', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingHorizontal: 10, paddingVertical: 9, justifyContent: 'center' },
  headerCell: { borderRightColor: '#334155', borderBottomColor: '#334155' },
  cellText: { color: '#334155', fontSize: 12, fontWeight: '700' },
  headerText: { color: '#ffffff', fontWeight: '900' },
  strongText: { color: '#0f172a', fontWeight: '900' },
  blueText: { color: '#2563eb', fontWeight: '900' },
  redText: { color: '#dc2626', fontWeight: '900' },
});
