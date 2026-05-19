import { StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { SectionCard } from '../../components/SectionCard';
import { StageStatusPill } from '../../components/StageStatusPill';
import { plotProgrammes, plotStages } from '../../data/demoData';

const visibleStages = plotStages
  .slice()
  .sort((a, b) => a.startDate.localeCompare(b.startDate))
  .slice(0, 12);

export default function TwoWeekProgrammeScreen() {
  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.title}>2-Week Programme</Text>
        <Text style={styles.subtitle}>Short-term site focus by plot, stage and trade</Text>
      </View>

      <SectionCard title="Next priority stages" subtitle="Demo view based on the current programme data">
        {visibleStages.map((stage) => {
          const plot = plotProgrammes.find((item) => item.id === stage.plotProgrammeId);
          return (
            <View key={stage.id} style={styles.row}>
              <View style={styles.dateBox}>
                <Text style={styles.dateMonth}>{stage.startDate.slice(5, 7)}</Text>
                <Text style={styles.dateDay}>{stage.startDate.slice(8, 10)}</Text>
              </View>
              <View style={styles.main}>
                <Text style={styles.plot}>{plot?.plotName ?? 'Plot'}</Text>
                <Text style={styles.stage}>{stage.stageName}</Text>
                <Text style={styles.meta}>{stage.trade} · {stage.durationDays} working days</Text>
              </View>
              <StageStatusPill status={stage.status} />
            </View>
          );
        })}
      </SectionCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 4 },
  title: { color: '#0f172a', fontSize: 30, fontWeight: '900' },
  subtitle: { color: '#64748b', fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },
  dateBox: { width: 52, height: 52, borderRadius: 14, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  dateMonth: { color: '#2563eb', fontSize: 11, fontWeight: '900' },
  dateDay: { color: '#0f172a', fontSize: 18, fontWeight: '900' },
  main: { flex: 1 },
  plot: { color: '#2563eb', fontWeight: '900', fontSize: 12 },
  stage: { color: '#0f172a', fontWeight: '800', marginTop: 2 },
  meta: { color: '#64748b', fontSize: 12, marginTop: 3 },
});
