import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { PlotProgramme, PlotStage } from '../types/models';

type TradeWorkItem = {
  plot: PlotProgramme;
  stage: PlotStage;
};

type DayTask = {
  stageName: string;
  status: PlotStage['status'];
  plots: PlotProgramme[];
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateValue: string, days: number) {
  const date = new Date(`${dateValue}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatDayHeader(dateValue: string) {
  const date = new Date(`${dateValue}T00:00:00`);
  const today = todayStr();
  const tomorrow = addDays(today, 1);

  if (dateValue === today) {
    return { label: 'Today', sub: date.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short' }), highlight: true };
  }
  if (dateValue === tomorrow) {
    return { label: 'Tomorrow', sub: date.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short' }), highlight: false };
  }
  return {
    label: date.toLocaleDateString('en-GB', { weekday: 'long' }),
    sub: date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
    highlight: false,
  };
}

function plotRef(plot: PlotProgramme) {
  const phase = plot.phase || 'PH1';
  const number = (plot.plotName || '').replace(/\D/g, '');
  return `${phase}-${number ? number.padStart(2, '0') : plot.plotName}`;
}

function buildDayWorkList(items: TradeWorkItem[]) {
  const today = todayStr();
  const result: Array<{ day: string; tasks: DayTask[] }> = [];

  for (let i = 0; i < 14; i += 1) {
    const day = addDays(today, i);
    const activeOnDay = items.filter(({ stage }) => stage.startDate <= day && stage.endDate >= day);
    if (activeOnDay.length === 0) continue;

    const grouped = new Map<string, DayTask>();
    activeOnDay.forEach(({ stage, plot }) => {
      const current = grouped.get(stage.stageName) ?? { stageName: stage.stageName, status: stage.status, plots: [] };
      current.plots.push(plot);
      grouped.set(stage.stageName, current);
    });

    result.push({ day, tasks: Array.from(grouped.values()) });
  }

  return result;
}

export function TradeWorkList({ items, trade }: { items: TradeWorkItem[]; trade: string }) {
  const dayList = buildDayWorkList(items);

  if (dayList.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No active work in the next 14 days.</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      {dayList.map(({ day, tasks }) => {
        const dayHeader = formatDayHeader(day);
        return (
          <View key={day} style={styles.dayBlock}>
            <View style={styles.dayHeader}>
              <Text style={[styles.dayLabel, dayHeader.highlight ? styles.dayLabelHighlight : null]}>{dayHeader.label}</Text>
              <Text style={styles.daySub}>{dayHeader.sub}</Text>
            </View>

            <View style={styles.taskList}>
              {tasks.map((task) => {
                const allDone = task.status === 'Complete';
                const plotNames = task.plots
                  .slice()
                  .sort((a, b) => plotRef(a).localeCompare(plotRef(b)))
                  .map(plotRef)
                  .join(', ');

                return (
                  <View key={`${day}-${task.stageName}`} style={[styles.taskRow, dayHeader.highlight ? styles.taskRowHighlight : null, allDone ? styles.taskRowDone : null]}>
                    <View style={styles.tradeDot} />
                    <View style={styles.taskMain}>
                      <Text style={[styles.taskTitle, allDone ? styles.taskTitleDone : null]}>{task.stageName}</Text>
                      <Text style={styles.taskText}>{task.plots.length === 1 ? 'Plot ' : 'Plots '}{plotNames}</Text>
                    </View>
                    <Text style={[styles.countBadge, dayHeader.highlight ? styles.countBadgeHighlight : null]}>{task.plots.length}</Text>
                    {allDone ? <Ionicons name="checkmark-circle-outline" size={16} color="#16a34a" /> : null}
                  </View>
                );
              })}
            </View>
          </View>
        );
      })}
      <Text style={styles.footer}>Trade: {trade}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 18 },
  empty: { paddingVertical: 42, alignItems: 'center' },
  emptyText: { color: '#94a3b8', fontSize: 14 },
  dayBlock: { gap: 8 },
  dayHeader: { flexDirection: 'row', gap: 8, alignItems: 'baseline' },
  dayLabel: { color: '#475569', fontWeight: '900', fontSize: 13, textTransform: 'uppercase' },
  dayLabelHighlight: { color: '#2563eb' },
  daySub: { color: '#94a3b8', fontSize: 12 },
  taskList: { gap: 8 },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#ffffff', paddingHorizontal: 14, paddingVertical: 12 },
  taskRowHighlight: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  taskRowDone: { opacity: 0.65 },
  tradeDot: { width: 10, height: 10, borderRadius: 3, backgroundColor: '#2563eb' },
  taskMain: { flex: 1, minWidth: 0 },
  taskTitle: { color: '#0f172a', fontWeight: '900', fontSize: 14 },
  taskTitleDone: { color: '#94a3b8', textDecorationLine: 'line-through' },
  taskText: { color: '#64748b', fontSize: 12, marginTop: 3 },
  countBadge: { overflow: 'hidden', borderRadius: 999, backgroundColor: '#f1f5f9', color: '#64748b', fontSize: 12, fontWeight: '900', paddingHorizontal: 9, paddingVertical: 3 },
  countBadgeHighlight: { backgroundColor: '#dbeafe', color: '#2563eb' },
  footer: { color: '#94a3b8', fontSize: 12, fontWeight: '700' },
});
