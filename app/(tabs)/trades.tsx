import { useMemo, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { SectionCard } from '../../components/SectionCard';
import { useSitePlanner } from '../../data/sitePlannerStore';
import { formatProgrammeDate, getCurrentProgrammeWeek } from '../../utils/programmeDates';
import { getActivitiesForTemplateDay } from '../../utils/templateProgramme';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_WIDTH = 82;
const PLOT_WIDTH = 74;
const TRADE_WIDTH = 110;
const WEEK_WIDTH = DAY_WIDTH * 7;
const TABLE_WIDTH = PLOT_WIDTH + TRADE_WIDTH + DAY_WIDTH * 14;

function normaliseWeek(week: number) {
  return ((((Math.round(week) - 1) % 52) + 52) % 52) + 1;
}

function buildDays(startWeek: number, programmeStartDate: string) {
  return Array.from({ length: 14 }, (_, index) => {
    const programmeWeek = normaliseWeek(startWeek + Math.floor(index / 7));
    const day = (index % 7) + 1;
    return {
      key: `${programmeWeek}-${day}-${index}`,
      programmeWeek,
      day,
      name: DAYS[index % 7],
      date: formatProgrammeDate(programmeStartDate, programmeWeek, day),
      weekend: day >= 6,
    };
  });
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function supervisorLink(trade: string, print = false) {
  const path = `/supervisor?trade=${slug(trade)}${print ? '&print=1' : ''}`;
  return Platform.OS === 'web' && typeof window !== 'undefined'
    ? `${window.location.origin}${path}`
    : path;
}

export default function TradesScreen() {
  const {
    sitePlots,
    activityDelays,
    tradeContacts,
    plotTemplates,
    siteSetup,
    setActivityDelay,
    recordIssue,
  } = useSitePlanner();

  const [tradeId, setTradeId] = useState(tradeContacts[0]?.id ?? '');
  const [message, setMessage] = useState('');
  const selectedTrade = tradeContacts.find((item) => item.id === tradeId)?.trade
    ?? tradeContacts[0]?.trade
    ?? 'Trade';

  // This is deliberately the same first week used by the Main 2 Week Programme.
  const firstProgrammeWeek = normaliseWeek(getCurrentProgrammeWeek(siteSetup.programmeStartDate));
  const days = useMemo(
    () => buildDays(firstProgrammeWeek, siteSetup.programmeStartDate),
    [firstProgrammeWeek, siteSetup.programmeStartDate],
  );
  const dateRange = `${days[0]?.date ?? ''} - ${days[13]?.date ?? ''}`;

  const rows = useMemo(() => sitePlots.map((plot) => {
    const activitiesByDay = days.map((day) => getActivitiesForTemplateDay(
      plot,
      day.programmeWeek,
      day.day,
      activityDelays,
      plotTemplates,
      siteSetup,
    ).filter((activity) => activity.trade.toLowerCase() === selectedTrade.toLowerCase()));

    const cells = activitiesByDay.map((activities) => activities.map((activity) => activity.displayText).join('\n'));
    const active = activitiesByDay.flat()[0];
    const delay = active
      ? activityDelays.find((item) => item.plotId === plot.id && item.activityCode === active.code)?.delayDays ?? 0
      : 0;
    const last = cells.reduce((previous, cell, index) => cell ? index : previous, -1);
    return { plot, cells, active, delay, last };
  }).filter((row) => row.cells.some(Boolean)), [
    sitePlots,
    days,
    activityDelays,
    plotTemplates,
    siteSetup,
    selectedTrade,
  ]);

  const move = async (row: (typeof rows)[number], change: number) => {
    if (!row.active) return;
    await setActivityDelay({
      plotId: row.plot.id,
      activityCode: row.active.code,
      delayDays: row.delay + change,
    });
    setMessage(`Plot ${row.plot.plotNo} moved by ${change > 0 ? '+' : '-'}1 day`);
  };

  const openLive = () => {
    Linking.openURL(supervisorLink(selectedTrade));
    setMessage(`Live supervisor view opened for ${selectedTrade}.`);
  };

  const copyLive = async () => {
    const link = supervisorLink(selectedTrade);
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(link);
    }
    setMessage(`Live supervisor link copied for ${selectedTrade}.`);
  };

  const generatePdf = async () => {
    await recordIssue({
      startWeek: firstProgrammeWeek,
      recipientCount: 1,
      note: `${selectedTrade} Week 1 and Week 2 PDF record opened for ${dateRange}`,
    });
    const link = supervisorLink(selectedTrade, true);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(link, '_blank');
      setMessage(`${selectedTrade} PDF record opened in a new tab.`);
      return;
    }
    Linking.openURL(link);
  };

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.title}>2-Week Trade Programme</Text>
        <Text style={styles.subtitle}>The same two weeks shown on the Main 2 Week Programme, filtered by trade.</Text>
      </View>

      <SectionCard
        title="2-week trade programme"
        subtitle="Week 1 matches the first week on the Main 2 Week Programme. Week 2 is the following week. There is no manual week selector."
      >
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>{selectedTrade} Programme</Text>
          <Text style={styles.summaryMeta}>Week 1 and Week 2: {dateRange}</Text>
        </View>

        {message ? <Text style={styles.notice}>{message}</Text> : null}

        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={styles.chips}>
            {tradeContacts.map((item) => (
              <Pressable
                key={item.id}
                style={[styles.chip, item.id === tradeId ? styles.chipActive : null]}
                onPress={() => setTradeId(item.id)}
              >
                <Text style={[styles.chipText, item.id === tradeId ? styles.chipTextActive : null]}>{item.trade}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={styles.table}>
            <View style={styles.row}>
              <Text style={[styles.headerCell, styles.plot]} />
              <Text style={[styles.headerCell, styles.trade]} />
              <Text style={styles.weekHeader}>Week 1</Text>
              <Text style={styles.weekHeader}>Week 2</Text>
            </View>

            <View style={styles.row}>
              <Text style={[styles.headerCell, styles.plot]}>Plot No</Text>
              <Text style={[styles.headerCell, styles.trade]}>Trade</Text>
              {days.map((day) => (
                <Text key={day.key} style={[styles.dayHeader, day.weekend ? styles.weekendHeader : null]}>{day.name}</Text>
              ))}
            </View>

            <View style={styles.row}>
              <Text style={[styles.dateBlank, styles.plot]} />
              <Text style={[styles.dateBlank, styles.trade]} />
              {days.map((day) => (
                <Text key={`date-${day.key}`} style={[styles.dateHeader, day.weekend ? styles.weekendDate : null]}>{day.date}</Text>
              ))}
            </View>

            {rows.length === 0 ? (
              <View style={styles.row}>
                <Text style={styles.empty}>No planned {selectedTrade} activity in this Week 1 and Week 2 window.</Text>
              </View>
            ) : null}

            {rows.map((row, rowIndex) => (
              <View key={row.plot.id} style={[styles.row, rowIndex % 2 ? styles.altRow : null]}>
                <Text style={[styles.bodyCell, styles.plot]}>{row.plot.plotNo}</Text>
                <Text style={[styles.bodyCell, styles.trade]}>{selectedTrade}</Text>
                {row.cells.map((cell, index) => (
                  <View
                    key={`${row.plot.id}-${days[index].key}`}
                    style={[
                      styles.dayCell,
                      days[index].weekend ? styles.weekendCell : null,
                      cell ? styles.activeCell : null,
                      index === row.last ? styles.finalCell : null,
                    ]}
                  >
                    <Text style={styles.dayText}>{cell}</Text>
                    {index === row.last ? (
                      <View style={styles.moveButtons}>
                        <Pressable style={styles.minus} onPress={() => move(row, -1)}><Text style={styles.moveText}>-</Text></Pressable>
                        <Pressable style={styles.plus} onPress={() => move(row, 1)}><Text style={styles.moveText}>+</Text></Pressable>
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={styles.livePanel}>
          <View style={styles.liveCopy}>
            <Text style={styles.liveTitle}>Live Supervisor Programme</Text>
            <Text style={styles.liveText}>Supervisors see the live {selectedTrade} Week 1 and Week 2 programme.</Text>
            <Text style={styles.liveLink}>{supervisorLink(selectedTrade)}</Text>
          </View>
          <View style={styles.buttons}>
            <Pressable style={styles.primary} onPress={openLive}><Text style={styles.primaryText}>Open Live View</Text></Pressable>
            <Pressable style={styles.secondary} onPress={copyLive}><Text style={styles.secondaryText}>Copy Live Link</Text></Pressable>
            <Pressable style={styles.secondary} onPress={generatePdf}><Text style={styles.secondaryText}>Generate PDF Record</Text></Pressable>
          </View>
        </View>
      </SectionCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 4 },
  title: { color: '#0f172a', fontSize: 30, fontWeight: '900' },
  subtitle: { color: '#64748b', fontSize: 14, lineHeight: 20 },
  summary: { backgroundColor: '#eff6ff', borderRadius: 12, padding: 12 },
  summaryTitle: { color: '#0f172a', fontSize: 18, fontWeight: '900' },
  summaryMeta: { color: '#64748b', fontSize: 12, marginTop: 3 },
  notice: { backgroundColor: '#dcfce7', borderColor: '#86efac', borderWidth: 1, color: '#166534', fontWeight: '900', padding: 10, borderRadius: 12 },
  chips: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  chip: { backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  chipActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  chipText: { color: '#64748b', fontSize: 12, fontWeight: '900' },
  chipTextActive: { color: '#ffffff' },
  table: { minWidth: TABLE_WIDTH },
  row: { flexDirection: 'row', alignItems: 'stretch' },
  altRow: { backgroundColor: '#eef6ff' },
  headerCell: { backgroundColor: '#173b5f', color: '#ffffff', borderWidth: 1, borderColor: '#9fb6ce', padding: 7, textAlign: 'center', fontSize: 11, fontWeight: '900' },
  plot: { width: PLOT_WIDTH },
  trade: { width: TRADE_WIDTH },
  weekHeader: { width: WEEK_WIDTH, backgroundColor: '#173b5f', color: '#ffffff', borderWidth: 1, borderColor: '#9fb6ce', paddingVertical: 5, textAlign: 'center', fontSize: 11, fontWeight: '900' },
  dayHeader: { width: DAY_WIDTH, backgroundColor: '#173b5f', color: '#ffffff', borderWidth: 1, borderColor: '#9fb6ce', paddingVertical: 5, textAlign: 'center', fontSize: 10, fontWeight: '900' },
  weekendHeader: { backgroundColor: '#214c75' },
  dateBlank: { backgroundColor: '#214c75', borderWidth: 1, borderColor: '#9fb6ce' },
  dateHeader: { width: DAY_WIDTH, backgroundColor: '#214c75', color: '#dbeafe', borderWidth: 1, borderColor: '#9fb6ce', paddingVertical: 4, textAlign: 'center', fontSize: 9, fontWeight: '900' },
  weekendDate: { backgroundColor: '#2b587f' },
  bodyCell: { color: '#0f172a', borderWidth: 1, borderColor: '#c8d7e6', padding: 7, textAlign: 'center', fontSize: 11, fontWeight: '800' },
  dayCell: { width: DAY_WIDTH, minHeight: 48, borderWidth: 1, borderColor: '#c8d7e6', padding: 4, alignItems: 'center', justifyContent: 'center', gap: 4 },
  weekendCell: { backgroundColor: '#f8fafc' },
  activeCell: { backgroundColor: '#fff4cc' },
  finalCell: { borderColor: '#16a34a', borderWidth: 2 },
  dayText: { color: '#0f172a', textAlign: 'center', fontSize: 10, lineHeight: 12, fontWeight: '900' },
  empty: { width: TABLE_WIDTH, color: '#64748b', borderWidth: 1, borderColor: '#c8d7e6', padding: 9, fontWeight: '800' },
  moveButtons: { flexDirection: 'row', gap: 4 },
  minus: { width: 24, height: 22, borderRadius: 8, backgroundColor: '#7f1d1d', alignItems: 'center', justifyContent: 'center' },
  plus: { width: 24, height: 22, borderRadius: 8, backgroundColor: '#166534', alignItems: 'center', justifyContent: 'center' },
  moveText: { color: '#ffffff', fontWeight: '900' },
  livePanel: { marginTop: 12, backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', borderWidth: 1, borderRadius: 14, padding: 12, gap: 10, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' },
  liveCopy: { flex: 1, minWidth: 220 },
  liveTitle: { color: '#166534', fontSize: 14, fontWeight: '900' },
  liveText: { color: '#166534', fontSize: 12, fontWeight: '800' },
  liveLink: { color: '#166534', fontSize: 11, fontWeight: '900' },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  primary: { backgroundColor: '#166534', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  primaryText: { color: '#ffffff', fontWeight: '900' },
  secondary: { backgroundColor: '#ffffff', borderColor: '#86efac', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  secondaryText: { color: '#166534', fontWeight: '900' },
});
