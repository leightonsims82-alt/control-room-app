import { useMemo, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { SectionCard } from '../../components/SectionCard';
import { useSitePlanner } from '../../data/sitePlannerStore';
import { formatProgrammeDate, getCurrentProgrammeWeek } from '../../utils/programmeDates';
import { getActivitiesForTemplateDay } from '../../utils/templateProgramme';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_WIDTH = 82;
const LEFT_WIDTH = 184;
const WEEK_WIDTH = DAY_WIDTH * 7;

function normaliseWeek(week: number) {
  return ((((Math.round(week) - 1) % 52) + 52) % 52) + 1;
}

function buildLookaheadDays(startWeek: number, programmeStartDate: string) {
  return Array.from({ length: 14 }, (_, index) => {
    const lookaheadWeekIndex = Math.floor(index / 7);
    const programmeWeek = normaliseWeek(startWeek + lookaheadWeekIndex);
    const day = (index % 7) + 1;
    return {
      key: `${lookaheadWeekIndex}-${day}`,
      programmeWeek,
      day,
      dayName: DAYS[index % 7],
      date: formatProgrammeDate(programmeStartDate, programmeWeek, day),
      weekend: day >= 6,
    };
  });
}

function tradeSlug(trade: string) {
  return trade.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function liveLink(trade: string) {
  const path = `/supervisor?trade=${tradeSlug(trade)}`;
  return Platform.OS === 'web' && typeof window !== 'undefined' ? `${window.location.origin}${path}` : path;
}

function printLink(trade: string) {
  const path = `/supervisor?trade=${tradeSlug(trade)}&print=1`;
  return Platform.OS === 'web' && typeof window !== 'undefined' ? `${window.location.origin}${path}` : path;
}

export default function TradesNoFixScreen() {
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
  const trade = tradeContacts.find((item) => item.id === tradeId)?.trade ?? tradeContacts[0]?.trade ?? 'Trade';

  // Week 1 is always the next full programme week. Week 2 is the week after.
  const startWeek = normaliseWeek(getCurrentProgrammeWeek(siteSetup.programmeStartDate) + 1);
  const days = useMemo(
    () => buildLookaheadDays(startWeek, siteSetup.programmeStartDate),
    [startWeek, siteSetup.programmeStartDate],
  );
  const dateRange = `${days[0]?.date ?? ''} - ${days[13]?.date ?? ''}`;
  const link = liveLink(trade);
  const pdfUrl = printLink(trade);

  const rows = useMemo(
    () =>
      sitePlots
        .map((plot) => {
          const cells = days.map((day) =>
            getActivitiesForTemplateDay(
              plot,
              day.programmeWeek,
              day.day,
              activityDelays,
              plotTemplates,
              siteSetup,
            )
              .filter((activity) => activity.trade === trade)
              .map((activity) => activity.displayText)
              .join('\n'),
          );

          const active = days
            .flatMap((day) =>
              getActivitiesForTemplateDay(
                plot,
                day.programmeWeek,
                day.day,
                activityDelays,
                plotTemplates,
                siteSetup,
              ),
            )
            .find((activity) => activity.trade === trade);

          const delay = active
            ? activityDelays.find(
                (item) => item.plotId === plot.id && item.activityCode === active.code,
              )?.delayDays ?? 0
            : 0;
          const last = cells.reduce((previous, cell, index) => (cell ? index : previous), -1);
          return { plot, cells, active, delay, last };
        })
        .filter((row) => row.cells.some(Boolean)),
    [sitePlots, days, activityDelays, plotTemplates, siteSetup, trade],
  );

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
    Linking.openURL(link);
    setMessage(`Live supervisor view opened for ${trade}.`);
  };

  const copyLive = async () => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(link);
    }
    setMessage(`Live supervisor link copied for ${trade}.`);
  };

  const generatePdf = async () => {
    await recordIssue({
      startWeek,
      recipientCount: 1,
      note: `${trade} Week 1 and Week 2 PDF record opened for ${dateRange}`,
    });
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(pdfUrl, '_blank');
      setMessage(`${trade} PDF record opened in a new tab. Choose Save as PDF.`);
      return;
    }
    Linking.openURL(pdfUrl);
    setMessage(`${trade} PDF record opened.`);
  };

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.title}>2-Week Trade Programme</Text>
        <Text style={styles.subtitle}>The next two full weeks, filtered for the selected trade.</Text>
      </View>

      <SectionCard
        title="2-week trade programme"
        subtitle="Week 1 is next week and Week 2 is the following week. The dates and workload update automatically."
      >
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>{trade} Programme</Text>
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
                <Text style={[styles.chipText, item.id === tradeId ? styles.chipTextActive : null]}>
                  {item.trade}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={styles.table}>
            <View style={styles.row}>
              <Text style={[styles.head, styles.plot]} />
              <Text style={[styles.head, styles.trade]} />
              <Text style={styles.week}>Week 1</Text>
              <Text style={styles.week}>Week 2</Text>
            </View>

            <View style={styles.row}>
              <Text style={[styles.head, styles.plot]}>Plot No</Text>
              <Text style={[styles.head, styles.trade]}>Trade</Text>
              {days.map((day) => (
                <Text key={day.key} style={[styles.dayHead, day.weekend ? styles.weekendHead : null]}>
                  {day.dayName}
                </Text>
              ))}
            </View>

            <View style={styles.row}>
              <Text style={[styles.dateBlank, styles.plot]} />
              <Text style={[styles.dateBlank, styles.trade]} />
              {days.map((day) => (
                <Text
                  key={`date-${day.key}`}
                  style={[styles.dateHead, day.weekend ? styles.weekendDate : null]}
                >
                  {day.date}
                </Text>
              ))}
            </View>

            {rows.length === 0 ? (
              <View style={styles.row}>
                <Text style={[styles.cell, styles.empty]}>
                  No planned {trade} activity in this Week 1 and Week 2 lookahead.
                </Text>
              </View>
            ) : null}

            {rows.map((row, rowIndex) => (
              <View key={row.plot.id} style={[styles.row, rowIndex % 2 ? styles.alt : null]}>
                <Text style={[styles.cell, styles.plot]}>{row.plot.plotNo}</Text>
                <Text style={[styles.cell, styles.trade]}>{trade}</Text>
                {row.cells.map((cell, index) => (
                  <View
                    key={`${row.plot.id}-${index}`}
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
                        <Pressable style={styles.minus} onPress={() => move(row, -1)}>
                          <Text style={styles.moveText}>-</Text>
                        </Pressable>
                        <Pressable style={styles.plus} onPress={() => move(row, 1)}>
                          <Text style={styles.moveText}>+</Text>
                        </Pressable>
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
            <Text style={styles.liveText}>Supervisors see the live {trade} Week 1 and Week 2 programme.</Text>
            <Text style={styles.liveLink}>{link}</Text>
          </View>
          <View style={styles.buttons}>
            <Pressable style={styles.primary} onPress={openLive}>
              <Text style={styles.primaryText}>Open Live View</Text>
            </Pressable>
            <Pressable style={styles.secondary} onPress={copyLive}>
              <Text style={styles.secondaryText}>Copy Live Link</Text>
            </Pressable>
            <Pressable style={styles.secondary} onPress={generatePdf}>
              <Text style={styles.secondaryText}>Generate PDF Record</Text>
            </Pressable>
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
  summaryTitle: { color: '#0f172a', fontWeight: '900', fontSize: 18 },
  summaryMeta: { color: '#64748b', fontSize: 12, marginTop: 3 },
  notice: { backgroundColor: '#dcfce7', borderColor: '#86efac', borderWidth: 1, color: '#166534', fontWeight: '900', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  chips: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  chip: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#ffffff' },
  chipActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  chipText: { color: '#64748b', fontSize: 12, fontWeight: '900' },
  chipTextActive: { color: '#ffffff' },
  table: { minWidth: LEFT_WIDTH + DAY_WIDTH * 14 },
  row: { flexDirection: 'row', alignItems: 'stretch' },
  alt: { backgroundColor: '#eef6ff' },
  head: { backgroundColor: '#173b5f', color: '#ffffff', fontWeight: '900', fontSize: 11, padding: 7, borderWidth: 1, borderColor: '#9fb6ce', textAlign: 'center' },
  plot: { width: 74 },
  trade: { width: 110 },
  week: { width: WEEK_WIDTH, backgroundColor: '#173b5f', color: '#ffffff', borderWidth: 1, borderColor: '#9fb6ce', textAlign: 'center', paddingVertical: 5, fontSize: 11, fontWeight: '900' },
  dayHead: { width: DAY_WIDTH, backgroundColor: '#173b5f', color: '#ffffff', borderWidth: 1, borderColor: '#9fb6ce', textAlign: 'center', paddingVertical: 5, fontSize: 10, fontWeight: '900' },
  weekendHead: { backgroundColor: '#214c75' },
  dateBlank: { backgroundColor: '#214c75', borderWidth: 1, borderColor: '#9fb6ce' },
  dateHead: { width: DAY_WIDTH, backgroundColor: '#214c75', color: '#dbeafe', borderWidth: 1, borderColor: '#9fb6ce', textAlign: 'center', paddingVertical: 4, fontSize: 9, fontWeight: '900' },
  weekendDate: { backgroundColor: '#2b587f' },
  cell: { color: '#0f172a', padding: 7, borderWidth: 1, borderColor: '#c8d7e6', textAlign: 'center', fontWeight: '800', fontSize: 11 },
  empty: { width: LEFT_WIDTH + WEEK_WIDTH * 2, textAlign: 'left', color: '#64748b' },
  dayCell: { width: DAY_WIDTH, minHeight: 48, borderWidth: 1, borderColor: '#c8d7e6', paddingHorizontal: 4, paddingVertical: 5, alignItems: 'center', justifyContent: 'center', gap: 4 },
  dayText: { color: '#0f172a', textAlign: 'center', fontWeight: '900', fontSize: 10, lineHeight: 12 },
  weekendCell: { backgroundColor: '#f8fafc' },
  activeCell: { backgroundColor: '#fff4cc' },
  finalCell: { borderColor: '#16a34a', borderWidth: 2 },
  moveButtons: { flexDirection: 'row', gap: 4 },
  minus: { backgroundColor: '#7f1d1d', borderRadius: 8, width: 24, height: 22, alignItems: 'center', justifyContent: 'center' },
  plus: { backgroundColor: '#166534', borderRadius: 8, width: 24, height: 22, alignItems: 'center', justifyContent: 'center' },
  moveText: { color: '#ffffff', fontWeight: '900', fontSize: 12 },
  livePanel: { marginTop: 12, backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', borderWidth: 1, borderRadius: 14, padding: 12, gap: 10, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' },
  liveCopy: { flex: 1, minWidth: 220 },
  liveTitle: { color: '#166534', fontWeight: '900', fontSize: 14 },
  liveText: { color: '#166534', fontWeight: '800', fontSize: 12 },
  liveLink: { color: '#166534', fontWeight: '900', fontSize: 11 },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' },
  primary: { backgroundColor: '#166534', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  primaryText: { color: '#ffffff', fontWeight: '900' },
  secondary: { backgroundColor: '#ffffff', borderColor: '#86efac', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  secondaryText: { color: '#166534', fontWeight: '900' },
});
