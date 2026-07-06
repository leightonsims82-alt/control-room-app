import { useMemo, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { SectionCard } from '../../components/SectionCard';
import { useSitePlanner } from '../../data/sitePlannerStore';
import { getActivitiesForTemplateDay } from '../../utils/templateProgramme';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_W = 82;
const LEFT_W = 184;
const WEEK_W = DAY_W * 7;

function nw(w: number) { return ((((Math.round(w) - 1) % 52) + 52) % 52) + 1; }
function wkDate(week: number, day: number) {
  const d = new Date(new Date().getFullYear(), 0, 4);
  d.setDate(d.getDate() - ((d.getDay() || 7) - 1) + (week - 1) * 7 + day);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function makeDays(start: number) { return Array.from({ length: 14 }, (_, i) => ({ key: `${i}`, week: nw(start + Math.floor(i / 7)), day: (i % 7) + 1, name: DAYS[i % 7], date: wkDate(nw(start + Math.floor(i / 7)), i % 7), weekend: i % 7 >= 5 })); }
function slug(t: string) { return t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
function liveLink(trade: string) { return Platform.OS === 'web' && typeof window !== 'undefined' ? `${window.location.origin}/supervisor?trade=${slug(trade)}` : `/supervisor?trade=${slug(trade)}`; }

export default function TradesNoFixScreen() {
  const { sitePlots, activityDelays, tradeContacts, plotTemplates, setActivityDelay, recordIssue } = useSitePlanner();
  const [tradeId, setTradeId] = useState(tradeContacts[0]?.id ?? '');
  const [weekText, setWeekText] = useState('1');
  const [message, setMessage] = useState('');
  const trade = tradeContacts.find((item) => item.id === tradeId)?.trade ?? tradeContacts[0]?.trade ?? 'Trade';
  const startWeek = nw(Number(weekText) || 1);
  const days = useMemo(() => makeDays(startWeek), [startWeek]);
  const link = liveLink(trade);

  const rows = useMemo(() => sitePlots.map((plot) => {
    const cells = days.map((day) => day.weekend ? '' : getActivitiesForTemplateDay(plot, day.week, day.day, activityDelays, plotTemplates).filter((a) => a.trade === trade).map((a) => a.displayText).join('\n'));
    const active = days.flatMap((day) => getActivitiesForTemplateDay(plot, day.week, day.day, activityDelays, plotTemplates)).find((a) => a.trade === trade);
    const delay = active ? activityDelays.find((d) => d.plotId === plot.id && d.activityCode === active.code)?.delayDays ?? 0 : 0;
    const last = cells.reduce((prev, cell, index) => cell ? index : prev, -1);
    return { plot, cells, active, delay, last };
  }).filter((row) => row.cells.some(Boolean)), [sitePlots, days, activityDelays, plotTemplates, trade]);

  const move = async (row: any, change: number) => {
    if (!row.active) return;
    await setActivityDelay({ plotId: row.plot.id, activityCode: row.active.code, delayDays: row.delay + change });
    setMessage(`Plot ${row.plot.plotNo} moved by ${change > 0 ? '+' : '-'}1 day`);
  };
  const openLive = () => { Linking.openURL(link); setMessage(`Live supervisor view opened for ${trade}.`); };
  const copyLive = async () => { if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) await navigator.clipboard.writeText(link); setMessage(`Live supervisor link copied for ${trade}.`); };
  const pdf = async () => { await recordIssue({ startWeek, recipientCount: 1, note: `${trade} PDF record generated for WK${String(startWeek).padStart(2, '0')}` }); setMessage(`${trade} PDF record logged. Use the live view to save the trade-only table as PDF.`); };

  return (
    <AppScreen>
      <View style={styles.header}><Text style={styles.title}>2-Week Trade Programme</Text><Text style={styles.subtitle}>Live trade programme view for supervisors. PDF is only a formal record.</Text></View>
      <SectionCard title="2-week trade programme" subtitle="The Fix / Stage column has been removed. Supervisors see the live read-only table from their link.">
        <View style={styles.top}><View style={styles.weekInput}><Text style={styles.label}>Start week</Text><TextInput value={weekText} onChangeText={setWeekText} style={styles.input} keyboardType="number-pad" /></View><View style={styles.summary}><Text style={styles.summaryTitle}>{trade} Programme</Text><Text style={styles.summaryMeta}>WK{String(startWeek).padStart(2, '0')} + WK{String(nw(startWeek + 1)).padStart(2, '0')}</Text></View></View>
        {message ? <Text style={styles.notice}>{message}</Text> : null}
        <ScrollView horizontal showsHorizontalScrollIndicator><View style={styles.chips}>{tradeContacts.map((item) => <Pressable key={item.id} style={[styles.chip, item.id === tradeId && styles.chipActive]} onPress={() => setTradeId(item.id)}><Text style={[styles.chipText, item.id === tradeId && styles.chipTextActive]}>{item.trade}</Text></Pressable>)}</View></ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator><View style={styles.table}>
          <View style={styles.row}><Text style={[styles.head, styles.plot]} /><Text style={[styles.head, styles.trade]} />{[startWeek, nw(startWeek + 1)].map((w) => <Text key={w} style={styles.week}>WK{String(w).padStart(2, '0')}</Text>)}</View>
          <View style={styles.row}><Text style={[styles.head, styles.plot]}>Plot No</Text><Text style={[styles.head, styles.trade]}>Trade</Text>{days.map((d) => <Text key={d.key} style={[styles.dayHead, d.weekend && styles.weekendHead]}>{d.name}</Text>)}</View>
          <View style={styles.row}><Text style={[styles.dateBlank, styles.plot]} /><Text style={[styles.dateBlank, styles.trade]} />{days.map((d) => <Text key={`date-${d.key}`} style={[styles.dateHead, d.weekend && styles.weekendDate]}>{d.date}</Text>)}</View>
          {rows.length === 0 ? <View style={styles.row}><Text style={[styles.cell, styles.empty]}>No planned {trade} activity in this 2-week window.</Text></View> : null}
          {rows.map((row, ri) => <View key={row.plot.id} style={[styles.row, ri % 2 ? styles.alt : null]}><Text style={[styles.cell, styles.plot]}>{row.plot.plotNo}</Text><Text style={[styles.cell, styles.trade]}>{trade}</Text>{row.cells.map((cell, index) => <View key={`${row.plot.id}-${index}`} style={[styles.dayCell, days[index].weekend && styles.weekendCell, cell && styles.activeCell, index === row.last && styles.finalCell]}><Text style={styles.dayText}>{cell}</Text>{index === row.last ? <View style={styles.moveBtns}><Pressable style={styles.minus} onPress={() => move(row, -1)}><Text style={styles.moveText}>-</Text></Pressable><Pressable style={styles.plus} onPress={() => move(row, 1)}><Text style={styles.moveText}>+</Text></Pressable></View> : null}</View>)}</View>)}
        </View></ScrollView>
        <View style={styles.livePanel}><View style={{ flex: 1, minWidth: 220 }}><Text style={styles.liveTitle}>Live Supervisor Programme</Text><Text style={styles.liveText}>Supervisors can use this link to see the live {trade} programme at any time.</Text><Text style={styles.liveLink}>{link}</Text></View><View style={styles.buttons}><Pressable style={styles.primary} onPress={openLive}><Text style={styles.primaryText}>Open Live View</Text></Pressable><Pressable style={styles.secondary} onPress={copyLive}><Text style={styles.secondaryText}>Copy Live Link</Text></Pressable><Pressable style={styles.secondary} onPress={pdf}><Text style={styles.secondaryText}>Generate PDF Record</Text></Pressable></View></View>
      </SectionCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 4 }, title: { color: '#0f172a', fontSize: 30, fontWeight: '900' }, subtitle: { color: '#64748b', fontSize: 14, lineHeight: 20 }, top: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }, weekInput: { gap: 6, width: 120 }, label: { color: '#334155', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' }, input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontWeight: '800' }, summary: { flex: 1, minWidth: 220, backgroundColor: '#eff6ff', borderRadius: 12, padding: 12 }, summaryTitle: { color: '#0f172a', fontWeight: '900', fontSize: 18 }, summaryMeta: { color: '#64748b', fontSize: 12, marginTop: 3 }, notice: { backgroundColor: '#dcfce7', borderColor: '#86efac', borderWidth: 1, color: '#166534', fontWeight: '900', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 }, chips: { flexDirection: 'row', gap: 8, paddingVertical: 4 }, chip: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff' }, chipActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' }, chipText: { color: '#64748b', fontSize: 12, fontWeight: '900' }, chipTextActive: { color: '#fff' }, table: { minWidth: LEFT_W + DAY_W * 14 }, row: { flexDirection: 'row', alignItems: 'stretch' }, alt: { backgroundColor: '#eef6ff' }, head: { backgroundColor: '#173b5f', color: '#fff', fontWeight: '900', fontSize: 11, padding: 7, borderWidth: 1, borderColor: '#9fb6ce', textAlign: 'center' }, plot: { width: 74 }, trade: { width: 110 }, week: { width: WEEK_W, backgroundColor: '#173b5f', color: '#fff', borderWidth: 1, borderColor: '#9fb6ce', textAlign: 'center', paddingVertical: 5, fontSize: 11, fontWeight: '900' }, dayHead: { width: DAY_W, backgroundColor: '#173b5f', color: '#fff', borderWidth: 1, borderColor: '#9fb6ce', textAlign: 'center', paddingVertical: 5, fontSize: 10, fontWeight: '900' }, weekendHead: { backgroundColor: '#214c75' }, dateBlank: { backgroundColor: '#214c75', borderWidth: 1, borderColor: '#9fb6ce' }, dateHead: { width: DAY_W, backgroundColor: '#214c75', color: '#dbeafe', borderWidth: 1, borderColor: '#9fb6ce', textAlign: 'center', paddingVertical: 4, fontSize: 9, fontWeight: '900' }, weekendDate: { backgroundColor: '#2b587f' }, cell: { color: '#0f172a', padding: 7, borderWidth: 1, borderColor: '#c8d7e6', textAlign: 'center', fontWeight: '800', fontSize: 11 }, empty: { width: LEFT_W + WEEK_W * 2, textAlign: 'left', color: '#64748b' }, dayCell: { width: DAY_W, minHeight: 48, borderWidth: 1, borderColor: '#c8d7e6', paddingHorizontal: 4, paddingVertical: 5, alignItems: 'center', justifyContent: 'center', gap: 4 }, dayText: { color: '#0f172a', textAlign: 'center', fontWeight: '900', fontSize: 10, lineHeight: 12 }, weekendCell: { backgroundColor: '#f8fafc' }, activeCell: { backgroundColor: '#fff4cc' }, finalCell: { borderColor: '#16a34a', borderWidth: 2 }, moveBtns: { flexDirection: 'row', gap: 4 }, minus: { backgroundColor: '#7f1d1d', borderRadius: 8, width: 24, height: 22, alignItems: 'center', justifyContent: 'center' }, plus: { backgroundColor: '#166534', borderRadius: 8, width: 24, height: 22, alignItems: 'center', justifyContent: 'center' }, moveText: { color: '#fff', fontWeight: '900', fontSize: 12 }, livePanel: { marginTop: 12, backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', borderWidth: 1, borderRadius: 14, padding: 12, gap: 10, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }, liveTitle: { color: '#166534', fontWeight: '900', fontSize: 14 }, liveText: { color: '#166534', fontWeight: '800', fontSize: 12 }, liveLink: { color: '#166534', fontWeight: '900', fontSize: 11 }, buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }, primary: { backgroundColor: '#166534', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 }, primaryText: { color: '#fff', fontWeight: '900' }, secondary: { backgroundColor: '#fff', borderColor: '#86efac', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 }, secondaryText: { color: '#166534', fontWeight: '900' }
});