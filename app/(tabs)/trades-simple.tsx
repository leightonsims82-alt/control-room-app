import { useMemo, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { SectionCard } from '../../components/SectionCard';
import { useSitePlanner } from '../../data/sitePlannerStore';
import { getActivitiesForTemplateDay } from '../../utils/templateProgramme';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_WIDTH = 82;
const LEFT_WIDTH = 302;
const WEEK_WIDTH = DAY_WIDTH * 7;

function normaliseWeek(week: number) {
  return ((((Math.round(week) - 1) % 52) + 52) % 52) + 1;
}

function getShortWeekDate(week: number, dayIndex: number) {
  const year = new Date().getFullYear();
  const firstThursday = new Date(year, 0, 4);
  const firstMonday = new Date(firstThursday);
  const day = firstThursday.getDay() || 7;
  firstMonday.setDate(firstThursday.getDate() - day + 1);
  const target = new Date(firstMonday);
  target.setDate(firstMonday.getDate() + (week - 1) * 7 + dayIndex);
  return `${String(target.getDate()).padStart(2, '0')}/${String(target.getMonth() + 1).padStart(2, '0')}`;
}

function buildDays(startWeek: number) {
  return Array.from({ length: 14 }, (_, i) => {
    const week = normaliseWeek(startWeek + Math.floor(i / 7));
    const dayIndex = i % 7;
    return { key: `${week}-${dayIndex}`, week, day: dayIndex + 1, dayIndex, dayName: DAYS[dayIndex], date: getShortWeekDate(week, dayIndex), weekend: dayIndex >= 5 };
  });
}

function slug(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function makeLink(trade: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') return `${window.location.origin}/supervisor?trade=${slug(trade)}`;
  return `/supervisor?trade=${slug(trade)}`;
}

export default function TradesSimpleScreen() {
  const { sitePlots, activityDelays, tradeContacts, plotTemplates, setActivityDelay, recordIssue } = useSitePlanner();
  const [selectedTradeId, setSelectedTradeId] = useState(tradeContacts[0]?.id ?? '');
  const [startWeekText, setStartWeekText] = useState('1');
  const [message, setMessage] = useState('');
  const activeTrade = tradeContacts.find((trade) => trade.id === selectedTradeId)?.trade ?? tradeContacts[0]?.trade ?? 'Trade';
  const startWeek = normaliseWeek(Number(startWeekText) || 1);
  const days = useMemo(() => buildDays(startWeek), [startWeek]);
  const link = makeLink(activeTrade);

  const rows = useMemo(() => sitePlots.map((plot) => {
    const cells = days.map((day) => {
      if (day.weekend) return '';
      return getActivitiesForTemplateDay(plot, day.week, day.day, activityDelays, plotTemplates)
        .filter((activity) => activity.trade === activeTrade)
        .map((activity) => activity.displayText)
        .join('\n');
    });
    const firstCell = cells.find(Boolean) ?? '';
    const activeActivity = days.flatMap((day) => getActivitiesForTemplateDay(plot, day.week, day.day, activityDelays, plotTemplates)).find((activity) => activity.trade === activeTrade);
    const delayDays = activeActivity ? activityDelays.find((delay) => delay.plotId === plot.id && delay.activityCode === activeActivity.code)?.delayDays ?? 0 : 0;
    const lastActiveIndex = cells.reduce((last, cell, index) => cell ? index : last, -1);
    return { plot, cells, fix: firstCell || '-', activeActivity, delayDays, lastActiveIndex };
  }).filter((row) => row.cells.some(Boolean)), [sitePlots, days, activityDelays, plotTemplates, activeTrade]);

  const moveFix = async (row: any, change: number) => {
    if (!row.activeActivity) return;
    await setActivityDelay({ plotId: row.plot.id, activityCode: row.activeActivity.code, delayDays: row.delayDays + change });
    setMessage(`Plot ${row.plot.plotNo} moved by ${change > 0 ? '+' : '-'}1 day`);
  };

  const openLive = () => { Linking.openURL(link); setMessage(`Live supervisor view opened for ${activeTrade}.`); };
  const copyLive = async () => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) await navigator.clipboard.writeText(link);
    setMessage(`Live supervisor link copied for ${activeTrade}.`);
  };
  const pdfRecord = async () => {
    await recordIssue({ startWeek, recipientCount: 1, note: `${activeTrade} PDF record generated for WK${String(startWeek).padStart(2, '0')}` });
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.print();
    setMessage(`${activeTrade} PDF record generated.`);
  };

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.title}>2-Week Trade Programme</Text>
        <Text style={styles.subtitle}>Live trade programme view for supervisors. PDF is only a formal record.</Text>
      </View>
      <SectionCard title="2-week trade programme" subtitle="Use +/- to move a fix. Supervisors see the live read-only table from their link.">
        <View style={styles.topRow}>
          <View style={styles.weekInput}><Text style={styles.label}>Start week</Text><TextInput value={startWeekText} onChangeText={setStartWeekText} style={styles.input} keyboardType="number-pad" /></View>
          <View style={styles.summary}><Text style={styles.summaryTitle}>{activeTrade} Programme</Text><Text style={styles.summaryMeta}>WK{String(startWeek).padStart(2, '0')} + WK{String(normaliseWeek(startWeek + 1)).padStart(2, '0')}</Text></View>
        </View>
        {message ? <Text style={styles.notice}>{message}</Text> : null}
        <ScrollView horizontal showsHorizontalScrollIndicator><View style={styles.chips}>{tradeContacts.map((trade) => <Pressable key={trade.id} style={[styles.chip, trade.id === selectedTradeId && styles.chipActive]} onPress={() => setSelectedTradeId(trade.id)}><Text style={[styles.chipText, trade.id === selectedTradeId && styles.chipTextActive]}>{trade.trade}</Text></Pressable>)}</View></ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator><View style={styles.table}>
          <View style={styles.row}><Text style={[styles.head, styles.plot]} /><Text style={[styles.head, styles.trade]} /><Text style={[styles.head, styles.fix]} />{[startWeek, normaliseWeek(startWeek + 1)].map((week) => <Text key={week} style={styles.week}>WK{String(week).padStart(2, '0')}</Text>)}</View>
          <View style={styles.row}><Text style={[styles.head, styles.plot]}>Plot No</Text><Text style={[styles.head, styles.trade]}>Trade</Text><Text style={[styles.head, styles.fix]}>Fix / Stage</Text>{days.map((day) => <Text key={day.key} style={[styles.dayHead, day.weekend && styles.weekendHead]}>{day.dayName}</Text>)}</View>
          <View style={styles.row}><Text style={[styles.dateBlank, styles.plot]} /><Text style={[styles.dateBlank, styles.trade]} /><Text style={[styles.dateBlank, styles.fix]} />{days.map((day) => <Text key={`date-${day.key}`} style={[styles.dateHead, day.weekend && styles.weekendDate]}>{day.date}</Text>)}</View>
          {rows.length === 0 ? <View style={styles.row}><Text style={[styles.cell, styles.empty]}>No planned {activeTrade} activity in this 2-week window.</Text></View> : null}
          {rows.map((row, rowIndex) => <View key={row.plot.id} style={[styles.row, rowIndex % 2 ? styles.alt : null]}><Text style={[styles.cell, styles.plot]}>{row.plot.plotNo}</Text><Text style={[styles.cell, styles.trade]}>{activeTrade}</Text><Text style={[styles.cell, styles.fix]}>{row.fix}</Text>{row.cells.map((cell, index) => <View key={`${row.plot.id}-${days[index].key}`} style={[styles.dayCell, days[index].weekend && styles.weekendCell, cell && styles.activeCell, index === row.lastActiveIndex && styles.finalCell]}><Text style={styles.dayText}>{cell}</Text>{index === row.lastActiveIndex ? <View style={styles.moveBtns}><Pressable style={styles.minus} onPress={() => moveFix(row, -1)}><Text style={styles.moveText}>-</Text></Pressable><Pressable style={styles.plus} onPress={() => moveFix(row, 1)}><Text style={styles.moveText}>+</Text></Pressable></View> : null}</View>)}</View>)}
        </View></ScrollView>
        <View style={styles.livePanel}><View style={{ flex: 1, minWidth: 220 }}><Text style={styles.liveTitle}>Live Supervisor Programme</Text><Text style={styles.liveText}>Supervisors can use this link to see the live {activeTrade} programme at any time.</Text><Text style={styles.liveLink}>{link}</Text></View><View style={styles.buttons}><Pressable style={styles.primary} onPress={openLive}><Text style={styles.primaryText}>Open Live View</Text></Pressable><Pressable style={styles.secondary} onPress={copyLive}><Text style={styles.secondaryText}>Copy Live Link</Text></Pressable><Pressable style={styles.secondary} onPress={pdfRecord}><Text style={styles.secondaryText}>Generate PDF Record</Text></Pressable></View></View>
      </SectionCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 4 }, title: { color: '#0f172a', fontSize: 30, fontWeight: '900' }, subtitle: { color: '#64748b', fontSize: 14, lineHeight: 20 }, topRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }, weekInput: { gap: 6, width: 120 }, label: { color: '#334155', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' }, input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontWeight: '800' }, summary: { flex: 1, minWidth: 220, backgroundColor: '#eff6ff', borderRadius: 12, padding: 12 }, summaryTitle: { color: '#0f172a', fontWeight: '900', fontSize: 18 }, summaryMeta: { color: '#64748b', fontSize: 12, marginTop: 3 }, notice: { backgroundColor: '#dcfce7', borderColor: '#86efac', borderWidth: 1, color: '#166534', fontWeight: '900', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 }, chips: { flexDirection: 'row', gap: 8, paddingVertical: 4 }, chip: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff' }, chipActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' }, chipText: { color: '#64748b', fontSize: 12, fontWeight: '900' }, chipTextActive: { color: '#fff' }, table: { minWidth: LEFT_WIDTH + DAY_WIDTH * 14 }, row: { flexDirection: 'row', alignItems: 'stretch' }, alt: { backgroundColor: '#eef6ff' }, head: { backgroundColor: '#173b5f', color: '#fff', fontWeight: '900', fontSize: 11, padding: 7, borderWidth: 1, borderColor: '#9fb6ce', textAlign: 'center' }, plot: { width: 74 }, trade: { width: 110 }, fix: { width: 118 }, week: { width: WEEK_WIDTH, backgroundColor: '#173b5f', color: '#fff', borderWidth: 1, borderColor: '#9fb6ce', textAlign: 'center', paddingVertical: 5, fontSize: 11, fontWeight: '900' }, dayHead: { width: DAY_WIDTH, backgroundColor: '#173b5f', color: '#fff', borderWidth: 1, borderColor: '#9fb6ce', textAlign: 'center', paddingVertical: 5, fontSize: 10, fontWeight: '900' }, weekendHead: { backgroundColor: '#214c75' }, dateBlank: { backgroundColor: '#214c75', borderWidth: 1, borderColor: '#9fb6ce' }, dateHead: { width: DAY_WIDTH, backgroundColor: '#214c75', color: '#dbeafe', borderWidth: 1, borderColor: '#9fb6ce', textAlign: 'center', paddingVertical: 4, fontSize: 9, fontWeight: '900' }, weekendDate: { backgroundColor: '#2b587f' }, cell: { color: '#0f172a', padding: 7, borderWidth: 1, borderColor: '#c8d7e6', textAlign: 'center', fontWeight: '800', fontSize: 11 }, empty: { width: LEFT_WIDTH + WEEK_WIDTH * 2, textAlign: 'left', color: '#64748b' }, dayCell: { width: DAY_WIDTH, minHeight: 48, borderWidth: 1, borderColor: '#c8d7e6', paddingHorizontal: 4, paddingVertical: 5, alignItems: 'center', justifyContent: 'center', gap: 4 }, dayText: { color: '#0f172a', textAlign: 'center', fontWeight: '900', fontSize: 10, lineHeight: 12 }, weekendCell: { backgroundColor: '#f8fafc' }, activeCell: { backgroundColor: '#fff4cc' }, finalCell: { borderColor: '#16a34a', borderWidth: 2 }, moveBtns: { flexDirection: 'row', gap: 4 }, minus: { backgroundColor: '#7f1d1d', borderRadius: 8, width: 24, height: 22, alignItems: 'center', justifyContent: 'center' }, plus: { backgroundColor: '#166534', borderRadius: 8, width: 24, height: 22, alignItems: 'center', justifyContent: 'center' }, moveText: { color: '#fff', fontWeight: '900', fontSize: 12 }, livePanel: { marginTop: 12, backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', borderWidth: 1, borderRadius: 14, padding: 12, gap: 10, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }, liveTitle: { color: '#166534', fontWeight: '900', fontSize: 14 }, liveText: { color: '#166534', fontWeight: '800', fontSize: 12 }, liveLink: { color: '#166534', fontWeight: '900', fontSize: 11 }, buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }, primary: { backgroundColor: '#166534', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 }, primaryText: { color: '#fff', fontWeight: '900' }, secondary: { backgroundColor: '#fff', borderColor: '#86efac', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 }, secondaryText: { color: '#166534', fontWeight: '900' }
});