import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { SectionCard } from '../../components/SectionCard';
import { TradeContact, useSitePlanner } from '../../data/sitePlannerStore';
import { siteprogTheme } from '../../theme/siteprogTheme';
import { formatCalendarWeek, formatProgrammeDate, getCurrentProgrammeWeek } from '../../utils/programmeDates';
import { getActivitiesForTemplateDay } from '../../utils/templateProgramme';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_WIDTH = 82;
const PLOT_WIDTH = 74;
const TRADE_WIDTH = 110;
const WEEK_WIDTH = DAY_WIDTH * 7;
const TABLE_WIDTH = PLOT_WIDTH + TRADE_WIDTH + DAY_WIDTH * 14;
const TRADE_COLOURS = ['#334155', '#B45309', '#15803D', '#9A3412', '#7C3AED', '#1D4ED8', '#DC2626', '#0891B2', '#9333EA', '#CA8A04', '#475569', '#0F766E'];

type TradeMode = 'setup' | 'programme';

function normaliseWeek(week: number) {
  return Number.isFinite(week) ? Math.max(1, Math.round(week)) : 1;
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
    activityMoves,
    tradeContacts,
    plotTemplates,
    siteSetup,
    setActivityDelay,
    recordIssue,
    upsertTradeContact,
  } = useSitePlanner();

  const [mode, setMode] = useState<TradeMode>('setup');
  const [tradeId, setTradeId] = useState(tradeContacts[0]?.id ?? '');
  const [message, setMessage] = useState('');

  const selectedTrade = tradeContacts.find((item) => item.id === tradeId)?.trade
    ?? tradeContacts[0]?.trade
    ?? 'Trade';

  const configuredCount = tradeContacts.filter((item) => item.supervisorName.trim() || item.supervisorEmail.trim()).length;

  const firstProgrammeWeek = normaliseWeek(getCurrentProgrammeWeek(siteSetup.programmeStartDate));
  const days = useMemo(
    () => buildDays(firstProgrammeWeek, siteSetup.programmeStartDate),
    [firstProgrammeWeek, siteSetup.programmeStartDate],
  );
  const dateRange = `${days[0]?.date ?? ''} - ${days[13]?.date ?? ''}`;
  const firstCalendarWeek = formatCalendarWeek(siteSetup.programmeStartDate, days[0]?.programmeWeek ?? firstProgrammeWeek, siteSetup.calendarWeekOne);
  const secondCalendarWeek = formatCalendarWeek(siteSetup.programmeStartDate, days[7]?.programmeWeek ?? normaliseWeek(firstProgrammeWeek + 1), siteSetup.calendarWeekOne);

  const rows = useMemo(() => sitePlots.map((plot) => {
    const activitiesByDay = days.map((day) => getActivitiesForTemplateDay(
      plot,
      day.programmeWeek,
      day.day,
      activityDelays,
      plotTemplates,
      siteSetup,
      activityMoves,
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
    activityMoves,
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
        <Text style={styles.eyebrow}>Trades</Text>
        <Text style={styles.title}>Trade control</Text>
        <Text style={styles.subtitle}>Keep supervisor details simple, then open the same live 2-week programme filtered by trade.</Text>
      </View>

      <View style={styles.modeSwitch}>
        <Pressable onPress={() => setMode('setup')} style={[styles.modeButton, mode === 'setup' && styles.modeButtonActive]}>
          <Ionicons name="people-outline" size={17} color={mode === 'setup' ? '#ffffff' : siteprogTheme.colors.muted} />
          <Text style={[styles.modeText, mode === 'setup' && styles.modeTextActive]}>Trade Setup</Text>
        </Pressable>
        <Pressable onPress={() => setMode('programme')} style={[styles.modeButton, mode === 'programme' && styles.modeButtonActive]}>
          <Ionicons name="calendar-outline" size={17} color={mode === 'programme' ? '#ffffff' : siteprogTheme.colors.muted} />
          <Text style={[styles.modeText, mode === 'programme' && styles.modeTextActive]}>2-Week Trade Programme</Text>
        </Pressable>
      </View>

      {mode === 'setup' ? (
        <TradeSetup
          tradeContacts={tradeContacts}
          configuredCount={configuredCount}
          onSave={upsertTradeContact}
          onOpenProgramme={(id) => {
            setTradeId(id);
            setMode('programme');
          }}
        />
      ) : (
        <SectionCard
          title="2-week trade programme"
          subtitle="Week 1 matches the first week on the Main 2 Week Programme. Week 2 is the following week."
        >
          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>{selectedTrade} Programme</Text>
            <Text style={styles.summaryMeta}>{firstCalendarWeek} + {secondCalendarWeek}: {dateRange}</Text>
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
                <Text style={styles.weekHeader}>{firstCalendarWeek}</Text>
                <Text style={styles.weekHeader}>{secondCalendarWeek}</Text>
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
      )}
    </AppScreen>
  );
}

function TradeSetup({
  tradeContacts,
  configuredCount,
  onSave,
  onOpenProgramme,
}: {
  tradeContacts: TradeContact[];
  configuredCount: number;
  onSave: (input: TradeContact) => Promise<void>;
  onOpenProgramme: (tradeId: string) => void;
}) {
  return (
    <>
      <View style={styles.setupSummary}>
        <View style={styles.setupSummaryIcon}><Ionicons name="people-outline" size={22} color={siteprogTheme.colors.blue} /></View>
        <View style={styles.setupSummaryCopy}>
          <Text style={styles.setupSummaryTitle}>Trade supervisors</Text>
          <Text style={styles.setupSummaryText}>Assign one main contact to each trade. These details feed the live trade programme and issue workflow.</Text>
        </View>
        <View style={styles.configuredBadge}>
          <Text style={styles.configuredValue}>{configuredCount}/{tradeContacts.length}</Text>
          <Text style={styles.configuredLabel}>configured</Text>
        </View>
      </View>

      <View style={styles.guideBox}>
        <Ionicons name="information-circle-outline" size={18} color={siteprogTheme.colors.blueDark} />
        <View style={styles.guideCopy}>
          <Text style={styles.guideTitle}>Keep this simple</Text>
          <Text style={styles.guideText}>Add the contractor and supervisor once. The 2-week trade programme then uses the same trade automatically.</Text>
        </View>
      </View>

      <View style={styles.tradeList}>
        {tradeContacts.map((contact, index) => (
          <TradeSetupCard
            key={contact.id}
            contact={contact}
            colour={TRADE_COLOURS[index % TRADE_COLOURS.length]}
            onSave={onSave}
            onOpenProgramme={() => onOpenProgramme(contact.id)}
          />
        ))}
      </View>
    </>
  );
}

function TradeSetupCard({
  contact,
  colour,
  onSave,
  onOpenProgramme,
}: {
  contact: TradeContact;
  colour: string;
  onSave: (input: TradeContact) => Promise<void>;
  onOpenProgramme: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(contact);
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const configured = Boolean(contact.supervisorName.trim() || contact.supervisorEmail.trim());

  const save = async () => {
    setSaving(true);
    setStatus('');
    try {
      await onSave({
        ...draft,
        contractor: draft.contractor.trim(),
        supervisorName: draft.supervisorName.trim(),
        supervisorEmail: draft.supervisorEmail.trim(),
        supervisorPhone: draft.supervisorPhone.trim(),
      });
      setStatus('Saved');
      setEditing(false);
      setTimeout(() => setStatus(''), 1600);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.tradeCard}>
      <View style={styles.tradeCardHeader}>
        <View style={styles.tradeIdentity}>
          <View style={[styles.tradeDot, { backgroundColor: colour }]} />
          <View>
            <Text style={styles.tradeName}>{contact.trade}</Text>
            <Text style={styles.tradeMeta}>
              {configured
                ? [contact.supervisorName, contact.contractor].filter(Boolean).join(' · ')
                : 'No supervisor assigned'}
            </Text>
          </View>
        </View>
        <View style={styles.tradeHeaderActions}>
          {status ? <Text style={styles.savedText}>{status}</Text> : null}
          <Pressable onPress={onOpenProgramme} style={styles.smallOutlineButton}>
            <Ionicons name="calendar-outline" size={14} color={siteprogTheme.colors.blueDark} />
            <Text style={styles.smallOutlineText}>2 Week</Text>
          </Pressable>
          <Pressable onPress={() => setEditing((value) => !value)} style={styles.editButton}>
            <Ionicons name={editing ? 'close' : 'create-outline'} size={15} color={siteprogTheme.colors.text} />
            <Text style={styles.editText}>{editing ? 'Close' : configured ? 'Edit' : 'Assign'}</Text>
          </Pressable>
        </View>
      </View>

      {configured && !editing ? (
        <View style={styles.contactStrip}>
          {contact.supervisorEmail ? <ContactItem icon="mail-outline" text={contact.supervisorEmail} /> : null}
          {contact.supervisorPhone ? <ContactItem icon="call-outline" text={contact.supervisorPhone} /> : null}
        </View>
      ) : null}

      {editing ? (
        <View style={styles.editor}>
          <Field label="Contractor" value={draft.contractor} onChangeText={(value) => setDraft((current) => ({ ...current, contractor: value }))} placeholder="e.g. ABC Groundworks" />
          <Field label="Supervisor" value={draft.supervisorName} onChangeText={(value) => setDraft((current) => ({ ...current, supervisorName: value }))} placeholder="Name" />
          <Field label="Email" value={draft.supervisorEmail} onChangeText={(value) => setDraft((current) => ({ ...current, supervisorEmail: value }))} placeholder="supervisor@example.com" keyboardType="email-address" />
          <Field label="Phone" value={draft.supervisorPhone} onChangeText={(value) => setDraft((current) => ({ ...current, supervisorPhone: value }))} placeholder="07..." keyboardType="phone-pad" />
          <View style={styles.editorActions}>
            <Pressable onPress={() => { setDraft(contact); setEditing(false); }} style={styles.cancelButton}><Text style={styles.cancelText}>Cancel</Text></Pressable>
            <Pressable onPress={save} disabled={saving} style={[styles.saveButton, saving && styles.disabled]}>
              <Ionicons name="save-outline" size={15} color="#ffffff" />
              <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save supervisor'}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function ContactItem({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.contactItem}>
      <Ionicons name={icon} size={14} color={siteprogTheme.colors.muted} />
      <Text style={styles.contactText}>{text}</Text>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#98A2B3"
        keyboardType={keyboardType}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: 3 },
  eyebrow: { color: siteprogTheme.colors.blue, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.7 },
  title: { color: siteprogTheme.colors.text, fontSize: 30, fontWeight: '900' },
  subtitle: { color: siteprogTheme.colors.muted, fontSize: 14, lineHeight: 20, maxWidth: 760 },
  modeSwitch: { alignSelf: 'flex-start', flexDirection: 'row', backgroundColor: '#ffffff', borderWidth: 1, borderColor: siteprogTheme.colors.border, borderRadius: 14, padding: 4, gap: 4, flexWrap: 'wrap' },
  modeButton: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 7 },
  modeButtonActive: { backgroundColor: siteprogTheme.colors.navy },
  modeText: { color: siteprogTheme.colors.muted, fontSize: 12, fontWeight: '900' },
  modeTextActive: { color: '#ffffff' },
  setupSummary: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: siteprogTheme.colors.border, borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  setupSummaryIcon: { width: 44, height: 44, borderRadius: 13, backgroundColor: siteprogTheme.colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
  setupSummaryCopy: { flex: 1, minWidth: 230 },
  setupSummaryTitle: { color: siteprogTheme.colors.text, fontSize: 17, fontWeight: '900' },
  setupSummaryText: { color: siteprogTheme.colors.muted, fontSize: 12, lineHeight: 18, marginTop: 3 },
  configuredBadge: { minWidth: 86, borderRadius: 14, backgroundColor: siteprogTheme.colors.blueSoft, paddingHorizontal: 13, paddingVertical: 10, alignItems: 'center' },
  configuredValue: { color: siteprogTheme.colors.blueDark, fontSize: 18, fontWeight: '900' },
  configuredLabel: { color: siteprogTheme.colors.blueDark, fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  guideBox: { backgroundColor: siteprogTheme.colors.blueSoft, borderColor: '#D8DEFF', borderWidth: 1, borderRadius: 14, padding: 13, flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  guideCopy: { flex: 1 },
  guideTitle: { color: siteprogTheme.colors.blueDark, fontWeight: '900', fontSize: 12 },
  guideText: { color: siteprogTheme.colors.blueDark, fontSize: 11, lineHeight: 17, marginTop: 2 },
  tradeList: { gap: 9 },
  tradeCard: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: siteprogTheme.colors.border, borderRadius: 15, overflow: 'hidden' },
  tradeCardHeader: { paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  tradeIdentity: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 190 },
  tradeDot: { width: 10, height: 10, borderRadius: 3 },
  tradeName: { color: siteprogTheme.colors.text, fontSize: 13, fontWeight: '900' },
  tradeMeta: { color: siteprogTheme.colors.muted, fontSize: 10, marginTop: 2 },
  tradeHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' },
  savedText: { color: siteprogTheme.colors.success, fontSize: 10, fontWeight: '900' },
  smallOutlineButton: { borderWidth: 1, borderColor: '#D8DEFF', backgroundColor: siteprogTheme.colors.blueSoft, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 5 },
  smallOutlineText: { color: siteprogTheme.colors.blueDark, fontSize: 10, fontWeight: '900' },
  editButton: { borderWidth: 1, borderColor: siteprogTheme.colors.border, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 5 },
  editText: { color: siteprogTheme.colors.text, fontSize: 10, fontWeight: '900' },
  contactStrip: { borderTopWidth: 1, borderTopColor: '#F0F2F6', paddingHorizontal: 14, paddingVertical: 9, flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  contactItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  contactText: { color: siteprogTheme.colors.muted, fontSize: 10, fontWeight: '700' },
  editor: { borderTopWidth: 1, borderTopColor: '#F0F2F6', backgroundColor: '#FBFCFF', padding: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  field: { flex: 1, minWidth: 210, gap: 5 },
  fieldLabel: { color: siteprogTheme.colors.muted, fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  input: { borderWidth: 1, borderColor: '#D5DBE7', borderRadius: 10, backgroundColor: '#ffffff', color: siteprogTheme.colors.text, paddingHorizontal: 11, paddingVertical: 9, fontSize: 12 },
  editorActions: { width: '100%', flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 2 },
  cancelButton: { borderWidth: 1, borderColor: siteprogTheme.colors.border, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 9 },
  cancelText: { color: siteprogTheme.colors.muted, fontSize: 11, fontWeight: '900' },
  saveButton: { backgroundColor: siteprogTheme.colors.navy, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 6 },
  saveText: { color: '#ffffff', fontSize: 11, fontWeight: '900' },
  disabled: { opacity: 0.55 },
  summary: { backgroundColor: siteprogTheme.colors.blueSoft, borderRadius: 12, padding: 12 },
  summaryTitle: { color: siteprogTheme.colors.text, fontSize: 18, fontWeight: '900' },
  summaryMeta: { color: siteprogTheme.colors.muted, fontSize: 12, marginTop: 3 },
  notice: { backgroundColor: siteprogTheme.colors.successSoft, borderColor: '#A6E6CB', borderWidth: 1, color: '#11724D', fontWeight: '900', padding: 10, borderRadius: 12 },
  chips: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  chip: { backgroundColor: '#ffffff', borderColor: '#D5DBE7', borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  chipActive: { backgroundColor: siteprogTheme.colors.navy, borderColor: siteprogTheme.colors.navy },
  chipText: { color: siteprogTheme.colors.muted, fontSize: 12, fontWeight: '900' },
  chipTextActive: { color: '#ffffff' },
  table: { minWidth: TABLE_WIDTH },
  row: { flexDirection: 'row', alignItems: 'stretch' },
  altRow: { backgroundColor: '#F8FAFD' },
  headerCell: { backgroundColor: '#173B5F', color: '#ffffff', borderWidth: 1, borderColor: '#9FB6CE', padding: 7, textAlign: 'center', fontSize: 11, fontWeight: '900' },
  plot: { width: PLOT_WIDTH },
  trade: { width: TRADE_WIDTH },
  weekHeader: { width: WEEK_WIDTH, backgroundColor: '#173B5F', color: '#ffffff', borderWidth: 1, borderColor: '#9FB6CE', paddingVertical: 5, textAlign: 'center', fontSize: 11, fontWeight: '900' },
  dayHeader: { width: DAY_WIDTH, backgroundColor: '#173B5F', color: '#ffffff', borderWidth: 1, borderColor: '#9FB6CE', paddingVertical: 5, textAlign: 'center', fontSize: 10, fontWeight: '900' },
  weekendHeader: { backgroundColor: '#214C75' },
  dateBlank: { backgroundColor: '#214C75', borderWidth: 1, borderColor: '#9FB6CE' },
  dateHeader: { width: DAY_WIDTH, backgroundColor: '#214C75', color: '#DBEAFE', borderWidth: 1, borderColor: '#9FB6CE', paddingVertical: 4, textAlign: 'center', fontSize: 9, fontWeight: '900' },
  weekendDate: { backgroundColor: '#2B587F' },
  bodyCell: { color: siteprogTheme.colors.text, borderWidth: 1, borderColor: '#C8D7E6', padding: 7, textAlign: 'center', fontSize: 11, fontWeight: '800' },
  dayCell: { width: DAY_WIDTH, minHeight: 48, borderWidth: 1, borderColor: '#C8D7E6', padding: 4, alignItems: 'center', justifyContent: 'center', gap: 4 },
  weekendCell: { backgroundColor: '#F8FAFC' },
  activeCell: { backgroundColor: '#FFF4CC' },
  finalCell: { borderColor: siteprogTheme.colors.success, borderWidth: 2 },
  dayText: { color: siteprogTheme.colors.text, textAlign: 'center', fontSize: 10, lineHeight: 12, fontWeight: '900' },
  empty: { width: TABLE_WIDTH, color: siteprogTheme.colors.muted, borderWidth: 1, borderColor: '#C8D7E6', padding: 9, fontWeight: '800' },
  moveButtons: { flexDirection: 'row', gap: 4 },
  minus: { width: 24, height: 22, borderRadius: 8, backgroundColor: '#7F1D1D', alignItems: 'center', justifyContent: 'center' },
  plus: { width: 24, height: 22, borderRadius: 8, backgroundColor: '#166534', alignItems: 'center', justifyContent: 'center' },
  moveText: { color: '#ffffff', fontWeight: '900' },
  livePanel: { marginTop: 12, backgroundColor: siteprogTheme.colors.successSoft, borderColor: '#A6E6CB', borderWidth: 1, borderRadius: 14, padding: 12, gap: 10, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' },
  liveCopy: { flex: 1, minWidth: 220 },
  liveTitle: { color: '#11724D', fontSize: 14, fontWeight: '900' },
  liveText: { color: '#11724D', fontSize: 12, fontWeight: '800' },
  liveLink: { color: '#11724D', fontSize: 11, fontWeight: '900' },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  primary: { backgroundColor: '#166534', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  primaryText: { color: '#ffffff', fontWeight: '900' },
  secondary: { backgroundColor: '#ffffff', borderColor: '#86EFAC', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  secondaryText: { color: '#166534', fontWeight: '900' },
});
