import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { SectionCard } from '../../components/SectionCard';
import { useSitePlanner } from '../../data/sitePlannerStore';
import { DAY_NAMES, TRADE_ORDER } from '../../utils/siteProgrammeEngine';
import { getActiveTemplateTrades, getTradeTemplateText, plotHasTradeWorkForTemplate } from '../../utils/templateProgramme';

const PROGRAMME_START_DATE = new Date(2026, 6, 6); // 6 July 2026. Replace later with the site setup start date.
const SHORT_DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const DAY_WIDTH = 92;
const PLOT_WIDTH = 92;
const WEEK_WIDTH = DAY_WIDTH * 5;

function formatWeekLabel(week: number) {
  return `WK${String(week).padStart(2, '0')}`;
}

function getProgrammeDate(week: number, dayIndex: number) {
  const date = new Date(PROGRAMME_START_DATE);
  date.setDate(PROGRAMME_START_DATE.getDate() + (week - 1) * 7 + dayIndex);
  return date;
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function formatDateRange(startWeek: number) {
  const start = getProgrammeDate(startWeek, 0);
  const end = getProgrammeDate(startWeek + 1, 4);
  return `${formatShortDate(start)} - ${formatShortDate(end)}`;
}

function simplifyActivity(text: string) {
  const clean = text.trim();
  if (!clean) return '';

  const replacements: Record<string, string> = {
    foundation: 'FND',
    foundations: 'FND',
    drainage: 'DNG',
    drain: 'DNG',
    slab: 'SLAB',
    scaffold: 'SCAFF',
    scaffolding: 'SCAFF',
    brickwork: 'BWK',
    blockwork: 'BWK',
    roof: 'ROOF',
    roofing: 'ROOF',
    windows: 'WINDOWS',
    window: 'WINDOWS',
    plaster: 'PLASTER',
    plastering: 'PLASTER',
    decoration: 'DEC',
    decorating: 'DEC',
    second: '2ND FIX',
    first: '1ST FIX',
    completion: 'COMP',
    handover: 'HANDOVER',
  };

  const lower = clean.toLowerCase();
  const match = Object.keys(replacements).find((key) => lower.includes(key));
  if (match) return replacements[match];

  return clean.length > 12 ? clean.slice(0, 12).toUpperCase() : clean.toUpperCase();
}

export default function TwoWeekProgrammeScreen() {
  const { sitePlots, activityDelays, plotTemplates } = useSitePlanner();
  const [startWeek, setStartWeek] = useState(1);
  const activeTrades = useMemo(() => getActiveTemplateTrades(sitePlots, startWeek, activityDelays, plotTemplates), [sitePlots, startWeek, activityDelays, plotTemplates]);
  const tradesToShow = activeTrades.length ? activeTrades : TRADE_ORDER;
  const visibleTradeCount = activeTrades.length || TRADE_ORDER.length;
  const twoWeekDates = formatDateRange(startWeek);

  return (
    <AppScreen>
      <View style={styles.header}>
        <View style={styles.headerMain}>
          <Text style={styles.kicker}>Live lookahead</Text>
          <Text style={styles.title}>2-Week Programme</Text>
          <Text style={styles.subtitle}>Excel-style trade lookahead with one row per plot and daily activity control.</Text>
        </View>
        <View style={styles.headerBadge}>
          <Ionicons name="calendar-outline" size={16} color="#2563eb" />
          <Text style={styles.headerBadgeText}>{twoWeekDates}</Text>
        </View>
      </View>

      <View style={styles.controlPanel}>
        <View style={styles.weekControls}>
          <Pressable style={styles.weekButton} onPress={() => setStartWeek((week) => Math.max(1, week - 1))}>
            <Ionicons name="chevron-back" size={16} color="#ffffff" />
            <Text style={styles.weekButtonText}>Previous</Text>
          </Pressable>
          <View style={styles.weekCentre}>
            <Text style={styles.weekLabel}>{formatWeekLabel(startWeek)} + {formatWeekLabel(startWeek + 1)}</Text>
            <Text style={styles.weekDateLabel}>{twoWeekDates}</Text>
          </View>
          <Pressable style={styles.weekButton} onPress={() => setStartWeek((week) => Math.min(51, week + 1))}>
            <Text style={styles.weekButtonText}>Next</Text>
            <Ionicons name="chevron-forward" size={16} color="#ffffff" />
          </Pressable>
        </View>

        <View style={styles.summaryStrip}>
          <MiniStat label="Active plots" value={sitePlots.length || 26} />
          <MiniStat label="Trades shown" value={visibleTradeCount} />
          <MiniStat label="Window" value="10 days" />
        </View>
      </View>

      <View style={styles.legendRow}>
        <View style={styles.legendPill}><View style={styles.legendDot} /><Text style={styles.legendText}>Blue cells = planned work</Text></View>
        <View style={styles.legendPill}><Text style={styles.legendCode}>FND</Text><Text style={styles.legendText}>Short site activity codes</Text></View>
      </View>

      {tradesToShow.map((trade) => {
        const visiblePlots = sitePlots.filter((plot) => plotHasTradeWorkForTemplate(plot, trade, startWeek, activityDelays, plotTemplates));
        const hasWork = visiblePlots.length > 0;

        return (
          <SectionCard key={trade} title={trade} subtitle={hasWork ? `${visiblePlots.length} plot${visiblePlots.length === 1 ? '' : 's'} active between ${twoWeekDates}` : 'No activity in this 2-week window'}>
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View style={styles.tableWrap}>
                <View style={styles.weekHeaderRow}>
                  <Text style={[styles.weekHeaderBlank, styles.plotCell]} />
                  {[startWeek, startWeek + 1].map((week) => (
                    <Text key={week} style={styles.weekGroup}>{formatWeekLabel(week)}</Text>
                  ))}
                </View>

                <View style={styles.dateHeaderRow}>
                  <Text style={[styles.headerCell, styles.plotCell]}>Plot</Text>
                  {[startWeek, startWeek + 1].flatMap((week) =>
                    SHORT_DAY_NAMES.map((day, dayIndex) => (
                      <View key={`${week}-${day}`} style={styles.dayHeader}>
                        <Text style={styles.dayHeaderName}>{day}</Text>
                        <Text style={styles.dayHeaderDate}>{formatShortDate(getProgrammeDate(week, dayIndex))}</Text>
                      </View>
                    )),
                  )}
                </View>

                {!hasWork ? (
                  <View style={styles.emptyStateRow}>
                    <Text style={[styles.emptyCell, styles.plotCell]}>-</Text>
                    <View style={styles.emptyMessageCell}>
                      <Ionicons name="checkmark-circle-outline" size={18} color="#64748b" />
                      <Text style={styles.emptyMessageText}>No planned activity for this trade in the selected 2-week window.</Text>
                    </View>
                  </View>
                ) : null}

                {visiblePlots.map((plot, rowIndex) => (
                  <View key={plot.id} style={[styles.tableRow, rowIndex % 2 ? styles.altRow : null]}>
                    <Text style={[styles.bodyCell, styles.plotCell]}>{plot.plotNo}</Text>
                    {[startWeek, startWeek + 1].flatMap((week) =>
                      DAY_NAMES.map((_, dayIndex) => {
                        const rawText = getTradeTemplateText(plot, trade, week, dayIndex + 1, activityDelays, plotTemplates);
                        const text = simplifyActivity(rawText);
                        return (
                          <Text key={`${plot.id}-${trade}-${week}-${dayIndex}`} style={[styles.dayCell, text ? styles.activeDayCell : null]}>
                            {text}
                          </Text>
                        );
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

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniStatValue}>{value}</Text>
      <Text style={styles.miniStatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' },
  headerMain: { flex: 1, minWidth: 260 },
  kicker: { color: '#2563eb', fontSize: 13, fontWeight: '900', letterSpacing: 0.3, textTransform: 'uppercase' },
  title: { color: '#0f172a', fontSize: 32, fontWeight: '900', letterSpacing: -0.6, marginTop: 4 },
  subtitle: { color: '#64748b', fontSize: 15, lineHeight: 22, marginTop: 6 },
  headerBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#eff6ff', borderColor: '#bfdbfe', borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  headerBadgeText: { color: '#1d4ed8', fontWeight: '900', fontSize: 12 },
  controlPanel: { backgroundColor: '#ffffff', borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', padding: 16, gap: 14 },
  weekControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  weekButton: { backgroundColor: '#0f172a', borderRadius: 13, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  weekButtonText: { color: '#ffffff', fontWeight: '900' },
  weekCentre: { alignItems: 'center', flex: 1, minWidth: 180 },
  weekLabel: { color: '#0f172a', fontWeight: '900', fontSize: 18 },
  weekDateLabel: { color: '#64748b', fontWeight: '800', fontSize: 12, marginTop: 2 },
  summaryStrip: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  miniStat: { flex: 1, minWidth: 120, backgroundColor: '#f8fafc', borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', padding: 12 },
  miniStatValue: { color: '#0f172a', fontSize: 18, fontWeight: '900' },
  miniStatLabel: { color: '#64748b', fontSize: 12, fontWeight: '800', marginTop: 2 },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  legendPill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ffffff', borderRadius: 999, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 12, paddingVertical: 8 },
  legendDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#dbeafe', borderWidth: 1, borderColor: '#93c5fd' },
  legendCode: { backgroundColor: '#173b5f', color: '#ffffff', fontSize: 11, fontWeight: '900', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  legendText: { color: '#64748b', fontSize: 12, fontWeight: '800' },
  tableWrap: { borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#9fb6ce' },
  weekHeaderRow: { flexDirection: 'row' },
  dateHeaderRow: { flexDirection: 'row', alignItems: 'stretch' },
  tableRow: { flexDirection: 'row', alignItems: 'stretch' },
  altRow: { backgroundColor: '#f8fbff' },
  weekHeaderBlank: { backgroundColor: '#173b5f', borderRightWidth: 1, borderRightColor: '#9fb6ce', minHeight: 30 },
  weekGroup: { width: WEEK_WIDTH, backgroundColor: '#173b5f', color: '#ffffff', fontWeight: '900', fontSize: 12, padding: 8, borderRightWidth: 1, borderRightColor: '#9fb6ce', textAlign: 'center' },
  headerCell: { backgroundColor: '#173b5f', color: '#ffffff', fontWeight: '900', fontSize: 12, padding: 9, borderTopWidth: 1, borderTopColor: '#9fb6ce', borderRightWidth: 1, borderRightColor: '#9fb6ce', textAlign: 'center' },
  plotCell: { width: PLOT_WIDTH },
  dayHeader: { width: DAY_WIDTH, backgroundColor: '#173b5f', padding: 7, borderTopWidth: 1, borderTopColor: '#9fb6ce', borderRightWidth: 1, borderRightColor: '#9fb6ce', alignItems: 'center', justifyContent: 'center' },
  dayHeaderName: { color: '#ffffff', fontWeight: '900', fontSize: 12 },
  dayHeaderDate: { color: '#bfdbfe', fontWeight: '800', fontSize: 10, marginTop: 2 },
  bodyCell: { color: '#0f172a', padding: 8, borderTopWidth: 1, borderTopColor: '#c8d7e6', borderRightWidth: 1, borderRightColor: '#c8d7e6', textAlign: 'center', fontWeight: '900', backgroundColor: '#ffffff' },
  dayCell: { width: DAY_WIDTH, minHeight: 54, color: '#0f172a', padding: 7, borderTopWidth: 1, borderTopColor: '#c8d7e6', borderRightWidth: 1, borderRightColor: '#c8d7e6', textAlign: 'center', fontSize: 11, fontWeight: '900', textAlignVertical: 'center' },
  activeDayCell: { backgroundColor: '#dbeafe', color: '#0f172a' },
  emptyStateRow: { flexDirection: 'row', alignItems: 'stretch' },
  emptyCell: { color: '#94a3b8', padding: 8, borderTopWidth: 1, borderTopColor: '#c8d7e6', borderRightWidth: 1, borderRightColor: '#c8d7e6', textAlign: 'center', backgroundColor: '#ffffff' },
  emptyMessageCell: { width: WEEK_WIDTH * 2, minHeight: 48, borderTopWidth: 1, borderTopColor: '#c8d7e6', backgroundColor: '#f8fafc', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14 },
  emptyMessageText: { color: '#64748b', fontSize: 12, fontWeight: '800' },
});
