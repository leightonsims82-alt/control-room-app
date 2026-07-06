import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { SectionCard } from '../../components/SectionCard';
import { TradeContact, useSitePlanner } from '../../data/sitePlannerStore';
import { getSavedSupervisorEmails } from '../../utils/programmeIssue';
import { getTradeTemplateText } from '../../utils/templateProgramme';

const PROGRAMME_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const WORKING_DAY_COUNT = 5;

function getShortWeekDate(week: number, dayIndex: number) {
  const year = new Date().getFullYear();
  const firstThursday = new Date(year, 0, 4);
  const firstMonday = new Date(firstThursday);
  const day = firstThursday.getDay() || 7;
  firstMonday.setDate(firstThursday.getDate() - day + 1);
  const target = new Date(firstMonday);
  target.setDate(firstMonday.getDate() + (week - 1) * 7 + dayIndex);
  const date = String(target.getDate()).padStart(2, '0');
  const month = String(target.getMonth() + 1).padStart(2, '0');
  return `${date}/${month}`;
}

function normaliseWeek(week: number) {
  return ((((Math.round(week) - 1) % 52) + 52) % 52) + 1;
}

function isWeekend(dayIndex: number) {
  return dayIndex >= WORKING_DAY_COUNT;
}

function twoWeekDays(startWeek: number) {
  return [startWeek, normaliseWeek(startWeek + 1)].flatMap((week) =>
    PROGRAMME_DAYS.map((dayName, dayIndex) => ({
      key: `${week}-${dayIndex + 1}`,
      week,
      day: dayIndex + 1,
      dayIndex,
      dayName,
      date: getShortWeekDate(week, dayIndex),
      weekLabel: `WK${String(normaliseWeek(week)).padStart(2, '0')}`,
      weekend: isWeekend(dayIndex),
    })),
  );
}

function makeTradeId(trade: string) {
  return `trade-${trade.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;
}

export default function TradesScreen() {
  const {
    sitePlots,
    activityDelays,
    tradeContacts,
    plotTemplates,
    issueSettings,
    issueLogs,
    upsertTradeContact,
    setIssueSettings,
    recordIssue,
  } = useSitePlanner();
  const [selectedTradeId, setSelectedTradeId] = useState(tradeContacts[0]?.id ?? '');
  const activeContact = tradeContacts.find((contact) => contact.id === selectedTradeId) ?? tradeContacts[0];
  const [draftContact, setDraftContact] = useState<TradeContact | undefined>(activeContact);
  const [managerEmail, setManagerEmail] = useState(issueSettings.managerEmail);
  const [issueDay, setIssueDay] = useState(issueSettings.issueDay);
  const [issueTime, setIssueTime] = useState(issueSettings.issueTime);
  const [autoIssueEnabled, setAutoIssueEnabled] = useState(issueSettings.autoIssueEnabled);
  const [issueStartWeek, setIssueStartWeek] = useState('1');
  const [newTradeName, setNewTradeName] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    setDraftContact(activeContact);
  }, [activeContact]);

  useEffect(() => {
    setManagerEmail(issueSettings.managerEmail);
    setIssueDay(issueSettings.issueDay);
    setIssueTime(issueSettings.issueTime);
    setAutoIssueEnabled(issueSettings.autoIssueEnabled);
  }, [issueSettings]);

  const activeIssueWeek = normaliseWeek(Number(issueStartWeek) || 1);
  const tableDays = useMemo(() => twoWeekDays(activeIssueWeek), [activeIssueWeek]);
  const savedSupervisorEmails = getSavedSupervisorEmails(tradeContacts);
  const recipientCount = savedSupervisorEmails.length + (managerEmail.trim() ? 1 : 0);

  const programmeRows = useMemo(() => {
    if (!activeContact) return [];
    return sitePlots
      .map((plot) => {
        const cells = tableDays.map((item) => {
          if (item.weekend) return '';
          return getTradeTemplateText(plot, activeContact.trade, item.week, item.day, activityDelays, plotTemplates);
        });
        return { plot, cells };
      })
      .filter((row) => row.cells.some(Boolean));
  }, [activeContact, sitePlots, tableDays, activityDelays, plotTemplates]);

  const saveTradeContact = async () => {
    if (!draftContact) return;
    await upsertTradeContact(draftContact);
    setSaveMessage(`${draftContact.trade} saved`);
  };

  const addNewTrade = async () => {
    const trade = newTradeName.trim();
    if (!trade) return;
    const existing = tradeContacts.find((contact) => contact.trade.toLowerCase() === trade.toLowerCase());
    if (existing) {
      setSelectedTradeId(existing.id);
      setSaveMessage(`${existing.trade} already exists`);
      setNewTradeName('');
      return;
    }
    const newContact: TradeContact = {
      id: makeTradeId(trade),
      trade,
      contractor: '',
      supervisorName: '',
      supervisorEmail: '',
      supervisorPhone: '',
    };
    await upsertTradeContact(newContact);
    setSelectedTradeId(newContact.id);
    setNewTradeName('');
    setSaveMessage(`${trade} added`);
  };

  const saveIssueSettings = async () => {
    await setIssueSettings({ managerEmail, issueDay, issueTime, autoIssueEnabled });
    setSaveMessage('Issue settings saved');
  };

  const markIssued = async () => {
    await recordIssue({
      startWeek: activeIssueWeek,
      recipientCount,
      note: `Programme prepared for manager and saved trade contacts for WK${String(activeIssueWeek).padStart(2, '0')} + WK${String(normaliseWeek(activeIssueWeek + 1)).padStart(2, '0')}`,
    });
    setSaveMessage('Programme marked as issued');
  };

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.title}>2-Week Trade Programme</Text>
        <Text style={styles.subtitle}>Site manager table view first. Select the week and trade to see plot-by-plot daily activity.</Text>
      </View>

      {saveMessage ? <Text style={styles.saveMessage}>{saveMessage}</Text> : null}

      <SectionCard title="2-week trade programme" subtitle="One row per plot. Dates sit on their own row, with weekends shown blank unless specifically planned.">
        <View style={styles.viewerHeaderRow}>
          <View style={styles.inputWrapSmall}>
            <Text style={styles.label}>Start week</Text>
            <TextInput value={issueStartWeek} onChangeText={setIssueStartWeek} style={styles.input} keyboardType="number-pad" />
          </View>
          <View style={styles.issueSummary}>
            <Text style={styles.issueTitle}>{activeContact?.trade ?? 'Trade'} Programme</Text>
            <Text style={styles.issueMeta}>WK{String(activeIssueWeek).padStart(2, '0')} + WK{String(normaliseWeek(activeIssueWeek + 1)).padStart(2, '0')}</Text>
          </View>
          <Pressable style={styles.saveButton} onPress={markIssued}>
            <Text style={styles.saveButtonText}>Mark Issued</Text>
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={styles.tradeChipsWide}>
            {tradeContacts.map((contact) => {
              const active = contact.id === activeContact?.id;
              return (
                <Pressable key={contact.id} style={[styles.tradeChip, active ? styles.tradeChipActive : null]} onPress={() => setSelectedTradeId(contact.id)}>
                  <Text style={[styles.tradeChipText, active ? styles.tradeChipTextActive : null]}>{contact.trade}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableHeader, styles.plotNoCell]} />
              <Text style={[styles.tableHeader, styles.tradeCell]} />
              <Text style={[styles.tableHeader, styles.fixCell]} />
              {[activeIssueWeek, normaliseWeek(activeIssueWeek + 1)].map((week) => (
                <Text key={week} style={styles.weekGroupHeader}>WK{String(week).padStart(2, '0')}</Text>
              ))}
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableHeader, styles.plotNoCell]}>Plot No</Text>
              <Text style={[styles.tableHeader, styles.tradeCell]}>Trade</Text>
              <Text style={[styles.tableHeader, styles.fixCell]}>Fix / Stage</Text>
              {tableDays.map((item) => (
                <Text key={item.key} style={[styles.dayHeaderCell, item.weekend ? styles.weekendHeader : null]}>{item.dayName}</Text>
              ))}
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.dateBlankCell, styles.plotNoCell]} />
              <Text style={[styles.dateBlankCell, styles.tradeCell]} />
              <Text style={[styles.dateBlankCell, styles.fixCell]} />
              {tableDays.map((item) => (
                <Text key={`date-${item.key}`} style={[styles.dateHeaderCell, item.weekend ? styles.weekendDateCell : null]}>{item.date}</Text>
              ))}
            </View>

            {programmeRows.length === 0 ? (
              <View style={styles.tableRow}>
                <Text style={[styles.bodyCell, styles.emptyProgrammeCell]}>No planned {activeContact?.trade ?? 'trade'} activity in this 2-week window.</Text>
              </View>
            ) : null}

            {programmeRows.map((row, rowIndex) => (
              <View key={row.plot.id} style={[styles.tableRow, rowIndex % 2 ? styles.altRow : null]}>
                <Text style={[styles.bodyCell, styles.plotNoCell]}>{row.plot.plotNo}</Text>
                <Text style={[styles.bodyCell, styles.tradeCell]}>{activeContact?.trade ?? ''}</Text>
                <Text style={[styles.bodyCell, styles.fixCell]}>{row.cells.find(Boolean) || '-'}</Text>
                {row.cells.map((cell, index) => (
                  <Text key={tableDays[index].key} style={[styles.dayBodyCell, tableDays[index].weekend ? styles.weekendCell : null, cell ? styles.activeDayCell : null]}>{cell}</Text>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      </SectionCard>

      <SectionCard title="Trade setup" subtitle="Each trade can have its contractor, supervisor, email and phone saved against it.">
        <View style={styles.addTradeRow}>
          <View style={styles.addTradeInputWrap}>
            <Text style={styles.label}>Add trade</Text>
            <TextInput value={newTradeName} onChangeText={setNewTradeName} style={styles.input} placeholder="e.g. Solar Panels Installer" />
          </View>
          <Pressable style={styles.addButton} onPress={addNewTrade}>
            <Text style={styles.saveButtonText}>Add Trade</Text>
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={styles.tradeChips}>
            {tradeContacts.map((contact) => {
              const active = contact.id === activeContact?.id;
              return (
                <Pressable key={contact.id} style={[styles.tradeChip, active ? styles.tradeChipActive : null]} onPress={() => setSelectedTradeId(contact.id)}>
                  <Text style={[styles.tradeChipText, active ? styles.tradeChipTextActive : null]}>{contact.trade}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        {draftContact ? (
          <View style={styles.formGrid}>
            <View style={styles.inputWrap}>
              <Text style={styles.label}>Trade</Text>
              <TextInput value={draftContact.trade} editable={false} style={[styles.input, styles.lockedInput]} />
            </View>
            <View style={styles.inputWrap}>
              <Text style={styles.label}>Contractor</Text>
              <TextInput value={draftContact.contractor} onChangeText={(contractor) => setDraftContact({ ...draftContact, contractor })} style={styles.input} placeholder="Contractor name" />
            </View>
            <View style={styles.inputWrap}>
              <Text style={styles.label}>Supervisor</Text>
              <TextInput value={draftContact.supervisorName} onChangeText={(supervisorName) => setDraftContact({ ...draftContact, supervisorName })} style={styles.input} placeholder="Supervisor name" />
            </View>
            <View style={styles.inputWrap}>
              <Text style={styles.label}>Supervisor email</Text>
              <TextInput value={draftContact.supervisorEmail} onChangeText={(supervisorEmail) => setDraftContact({ ...draftContact, supervisorEmail })} style={styles.input} placeholder="name@example.com" keyboardType="email-address" autoCapitalize="none" />
            </View>
            <View style={styles.inputWrap}>
              <Text style={styles.label}>Supervisor phone</Text>
              <TextInput value={draftContact.supervisorPhone} onChangeText={(supervisorPhone) => setDraftContact({ ...draftContact, supervisorPhone })} style={styles.input} placeholder="07..." keyboardType="phone-pad" />
            </View>
            <Pressable style={styles.saveButton} onPress={saveTradeContact}>
              <Text style={styles.saveButtonText}>Save Trade</Text>
            </Pressable>
          </View>
        ) : null}
      </SectionCard>

      <SectionCard title="Automatic issue settings" subtitle="Stores the schedule and recipient source for the 2-week trade programme. A backend email job will be needed for true background auto-send.">
        <View style={styles.formGrid}>
          <View style={styles.inputWrap}>
            <Text style={styles.label}>Manager email</Text>
            <TextInput value={managerEmail} onChangeText={setManagerEmail} style={styles.input} placeholder="manager@example.com" keyboardType="email-address" autoCapitalize="none" />
          </View>
          <View style={styles.inputWrap}>
            <Text style={styles.label}>Issue day</Text>
            <TextInput value={issueDay} onChangeText={setIssueDay} style={styles.input} placeholder="Friday" />
          </View>
          <View style={styles.inputWrap}>
            <Text style={styles.label}>Issue time</Text>
            <TextInput value={issueTime} onChangeText={setIssueTime} style={styles.input} placeholder="15:00" />
          </View>
          <Pressable style={[styles.toggleButton, autoIssueEnabled ? styles.toggleActive : null]} onPress={() => setAutoIssueEnabled((value) => !value)}>
            <Text style={[styles.toggleText, autoIssueEnabled ? styles.toggleTextActive : null]}>{autoIssueEnabled ? 'Auto issue on' : 'Auto issue off'}</Text>
          </Pressable>
          <Pressable style={styles.saveButton} onPress={saveIssueSettings}>
            <Text style={styles.saveButtonText}>Save Issue Settings</Text>
          </Pressable>
        </View>
        <Text style={styles.helperText}>Recipients currently saved: {recipientCount}. Manager receives the full programme. Supervisors receive their trade programme once server-side email sending is connected.</Text>
      </SectionCard>

      <SectionCard title="Issue history" subtitle="Local audit trail for programme issue actions during the pilot.">
        {issueLogs.length === 0 ? <Text style={styles.empty}>No programmes recorded as issued yet.</Text> : null}
        {issueLogs.map((log) => (
          <View key={log.id} style={styles.logRow}>
            <View style={styles.logMain}>
              <Text style={styles.logTitle}>WK{String(log.startWeek).padStart(2, '0')} + WK{String(normaliseWeek(log.startWeek + 1)).padStart(2, '0')}</Text>
              <Text style={styles.logMeta}>{log.note}</Text>
            </View>
            <Text style={styles.logDate}>{new Date(log.issuedAt).toLocaleDateString()}</Text>
          </View>
        ))}
      </SectionCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 4 },
  title: { color: '#0f172a', fontSize: 30, fontWeight: '900' },
  subtitle: { color: '#64748b', fontSize: 14, lineHeight: 20 },
  saveMessage: { backgroundColor: '#dcfce7', borderColor: '#86efac', borderWidth: 1, color: '#166534', fontWeight: '900', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  tradeChips: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  tradeChipsWide: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  tradeChip: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#ffffff' },
  tradeChipActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  tradeChipText: { color: '#64748b', fontSize: 12, fontWeight: '900' },
  tradeChipTextActive: { color: '#ffffff' },
  formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' },
  addTradeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' },
  addTradeInputWrap: { gap: 6, minWidth: 240, flex: 1 },
  inputWrap: { gap: 6, minWidth: 190, flex: 1 },
  inputWrapSmall: { gap: 6, width: 120 },
  label: { color: '#334155', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  input: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: '#0f172a', fontWeight: '800' },
  lockedInput: { backgroundColor: '#f1f5f9', color: '#64748b' },
  saveButton: { backgroundColor: '#0f172a', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, alignSelf: 'flex-end' },
  addButton: { backgroundColor: '#2563eb', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, alignSelf: 'flex-end' },
  saveButtonText: { color: '#ffffff', fontWeight: '900' },
  toggleButton: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#ffffff' },
  toggleActive: { backgroundColor: '#dcfce7', borderColor: '#16a34a' },
  toggleText: { color: '#475569', fontWeight: '900' },
  toggleTextActive: { color: '#166534' },
  helperText: { color: '#64748b', fontSize: 12, lineHeight: 18 },
  viewerHeaderRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' },
  issueSummary: { flex: 1, minWidth: 220, backgroundColor: '#eff6ff', borderRadius: 12, padding: 12 },
  issueTitle: { color: '#0f172a', fontWeight: '900', fontSize: 18 },
  issueMeta: { color: '#64748b', fontSize: 12, marginTop: 3 },
  tableRow: { flexDirection: 'row', alignItems: 'stretch' },
  altRow: { backgroundColor: '#eef6ff' },
  tableHeader: { backgroundColor: '#173b5f', color: '#ffffff', fontWeight: '900', fontSize: 11, padding: 7, borderWidth: 1, borderColor: '#9fb6ce', textAlign: 'center' },
  plotNoCell: { width: 74 },
  tradeCell: { width: 110 },
  fixCell: { width: 118 },
  weekGroupHeader: { width: 1008, backgroundColor: '#173b5f', color: '#ffffff', borderWidth: 1, borderColor: '#9fb6ce', textAlign: 'center', paddingVertical: 5, fontSize: 11, fontWeight: '900' },
  dayHeaderCell: { width: 72, backgroundColor: '#173b5f', color: '#ffffff', borderWidth: 1, borderColor: '#9fb6ce', textAlign: 'center', paddingVertical: 5, fontSize: 10, fontWeight: '900' },
  weekendHeader: { backgroundColor: '#214c75' },
  dateBlankCell: { backgroundColor: '#214c75', borderWidth: 1, borderColor: '#9fb6ce' },
  dateHeaderCell: { width: 72, backgroundColor: '#214c75', color: '#dbeafe', borderWidth: 1, borderColor: '#9fb6ce', textAlign: 'center', paddingVertical: 4, fontSize: 9, fontWeight: '900' },
  weekendDateCell: { backgroundColor: '#2b587f' },
  bodyCell: { color: '#0f172a', padding: 7, borderWidth: 1, borderColor: '#c8d7e6', textAlign: 'center', fontWeight: '800', fontSize: 11 },
  dayBodyCell: { width: 72, minHeight: 38, color: '#0f172a', padding: 5, borderWidth: 1, borderColor: '#c8d7e6', textAlign: 'center', fontWeight: '800', fontSize: 10, lineHeight: 12 },
  weekendCell: { backgroundColor: '#f8fafc', color: '#94a3b8' },
  activeDayCell: { backgroundColor: '#fff4cc' },
  emptyProgrammeCell: { width: 1138, textAlign: 'left', color: '#64748b' },
  empty: { color: '#64748b' },
  logRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },
  logMain: { flex: 1 },
  logTitle: { color: '#0f172a', fontWeight: '900' },
  logMeta: { color: '#64748b', fontSize: 12, marginTop: 3, lineHeight: 18 },
  logDate: { color: '#2563eb', fontWeight: '900', fontSize: 12 },
});