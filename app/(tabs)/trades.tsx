import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { SectionCard } from '../../components/SectionCard';
import { TradeContact, useSitePlanner } from '../../data/sitePlannerStore';
import { DAY_NAMES } from '../../utils/siteProgrammeEngine';
import { createManagerProgrammeText, createTradeProgrammeText, getSavedSupervisorEmails } from '../../utils/programmeIssue';
import { getActivitiesForTemplateDay, getTradeTemplateText } from '../../utils/templateProgramme';

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

  useEffect(() => {
    setDraftContact(activeContact);
  }, [activeContact]);

  useEffect(() => {
    setManagerEmail(issueSettings.managerEmail);
    setIssueDay(issueSettings.issueDay);
    setIssueTime(issueSettings.issueTime);
    setAutoIssueEnabled(issueSettings.autoIssueEnabled);
  }, [issueSettings]);

  const activeIssueWeek = Math.max(1, Math.min(51, Number(issueStartWeek) || 1));
  const savedSupervisorEmails = getSavedSupervisorEmails(tradeContacts);
  const recipientCount = savedSupervisorEmails.length + (managerEmail.trim() ? 1 : 0);
  const selectedTrade = activeContact?.trade ?? tradeContacts[0]?.trade ?? 'Groundworks';

  const visiblePlots = useMemo(
    () => sitePlots.filter((plot) => hasTradeWork(plot.id, selectedTrade, activeIssueWeek, sitePlots, activityDelays, plotTemplates)),
    [sitePlots, selectedTrade, activeIssueWeek, activityDelays, plotTemplates],
  );

  const managerPreview = useMemo(
    () => createManagerProgrammeText({ plots: sitePlots, activityDelays, startWeek: activeIssueWeek, tradeContacts, plotTemplates }),
    [sitePlots, activityDelays, activeIssueWeek, tradeContacts, plotTemplates],
  );

  const tradePreview = useMemo(
    () => activeContact ? createTradeProgrammeText({ trade: activeContact.trade, plots: sitePlots, activityDelays, startWeek: activeIssueWeek, plotTemplates }) : '',
    [activeContact, sitePlots, activityDelays, activeIssueWeek, plotTemplates],
  );

  const saveTradeContact = async () => {
    if (!draftContact) return;
    await upsertTradeContact(draftContact);
  };

  const saveIssueSettings = async () => {
    await setIssueSettings({ managerEmail, issueDay, issueTime, autoIssueEnabled });
  };

  const markIssued = async () => {
    await recordIssue({
      startWeek: activeIssueWeek,
      recipientCount,
      note: `${selectedTrade} 2-week programme prepared for WK${String(activeIssueWeek).padStart(2, '0')} + WK${String(activeIssueWeek + 1).padStart(2, '0')}`,
    });
  };

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.title}>Trade 2-Week Programmes</Text>
        <Text style={styles.subtitle}>Excel-style trade sheet: Plot No | Trade | Fix | two weeks of dates | output / recovery notes.</Text>
      </View>

      <SectionCard title="Select trade and issue week" subtitle="Choose the trade and the live two-week block to issue or review.">
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

        <View style={styles.issueHeaderRow}>
          <View style={styles.inputWrapSmall}>
            <Text style={styles.label}>Start week</Text>
            <TextInput value={issueStartWeek} onChangeText={setIssueStartWeek} style={styles.input} keyboardType="number-pad" />
          </View>
          <View style={styles.issueSummary}>
            <Text style={styles.issueTitle}>{selectedTrade} | WK{String(activeIssueWeek).padStart(2, '0')} + WK{String(activeIssueWeek + 1).padStart(2, '0')}</Text>
            <Text style={styles.issueMeta}>{visiblePlots.length} plot{visiblePlots.length === 1 ? '' : 's'} with work in this window</Text>
          </View>
          <Pressable style={styles.saveButton} onPress={markIssued}>
            <Text style={styles.saveButtonText}>Mark Issued</Text>
          </Pressable>
        </View>
      </SectionCard>

      <SectionCard title={`2 WEEK ${selectedTrade.toUpperCase()} PROGRAMME`} subtitle="This is the app version of your trade-specific Excel programme.">
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View>
            <View style={styles.topHeaderRow}>
              <Text style={[styles.weekHeaderBlank, styles.plotCell]} />
              <Text style={[styles.weekHeaderBlank, styles.tradeCell]} />
              <Text style={[styles.weekHeaderBlank, styles.fixCell]} />
              <Text style={styles.weekGroup}>WEEK 1</Text>
              <Text style={styles.weekGroup}>WEEK 2</Text>
              <Text style={[styles.weekHeaderBlank, styles.outputCell]} />
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.headerCell, styles.plotCell]}>Plot No</Text>
              <Text style={[styles.headerCell, styles.tradeCell]}>Trade</Text>
              <Text style={[styles.headerCell, styles.fixCell]}>Fix</Text>
              {[activeIssueWeek, activeIssueWeek + 1].flatMap((week) =>
                DAY_NAMES.map((day) => <Text key={`${week}-${day}`} style={styles.dayHeader}>WK{String(week).padStart(2, '0')} {day}</Text>),
              )}
              <Text style={[styles.headerCell, styles.outputCell]}>Output / Recovery Notes</Text>
            </View>

            {visiblePlots.length === 0 ? (
              <View style={styles.tableRow}>
                <Text style={[styles.emptyCell, styles.plotCell]}>-</Text>
                <Text style={[styles.emptyCell, styles.tradeCell]}>{selectedTrade}</Text>
                <Text style={[styles.emptyCell, styles.fixCell]}>No activity</Text>
                {Array.from({ length: 10 }).map((_, index) => <Text key={index} style={styles.emptyDayCell} />)}
                <Text style={[styles.emptyCell, styles.outputCell]}>No trade activity in selected window.</Text>
              </View>
            ) : null}

            {visiblePlots.map((plot, rowIndex) => {
              const fixText = getFixText(plot.id, selectedTrade, activeIssueWeek, sitePlots, activityDelays, plotTemplates);
              const output = getOutputText(plot.id, selectedTrade, activeIssueWeek, sitePlots, activityDelays, plotTemplates);
              return (
                <View key={plot.id} style={[styles.tableRow, rowIndex % 2 ? styles.altRow : null]}>
                  <Text style={[styles.bodyCell, styles.plotCell]}>{plot.plotNo}</Text>
                  <Text style={[styles.bodyCell, styles.tradeCell]}>{selectedTrade}</Text>
                  <Text style={[styles.bodyCell, styles.fixCell]}>{fixText || 'Activity'}</Text>
                  {[activeIssueWeek, activeIssueWeek + 1].flatMap((week) =>
                    DAY_NAMES.map((_, dayIndex) => {
                      const text = getTradeTemplateText(plot, selectedTrade, week, dayIndex + 1, activityDelays, plotTemplates);
                      return <Text key={`${plot.id}-${selectedTrade}-${week}-${dayIndex}`} style={[styles.dayCell, text ? styles.activeDayCell : null]}>{text}</Text>;
                    }),
                  )}
                  <Text style={[styles.bodyCell, styles.outputCell]}>{output || 'Complete planned trade output / record missed target notes here.'}</Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </SectionCard>

      <SectionCard title="Trade contact" subtitle="Saved against the selected trade for issue records and future email sending.">
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

      <SectionCard title="Issue settings" subtitle="Stores the future issue schedule. Email sending still needs a backend connection.">
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
        <Text style={styles.helperText}>Recipients saved: {recipientCount}. Manager gets the full programme; trade supervisors get their trade programme when email sending is connected.</Text>
      </SectionCard>

      <SectionCard title="Text preview" subtitle="Kept for copy/paste until Excel/PDF/email export is connected.">
        <View style={styles.previewGrid}>
          <View style={styles.previewPanel}>
            <Text style={styles.previewTitle}>Manager full programme preview</Text>
            <TextInput value={managerPreview} editable={false} multiline style={styles.previewBox} />
          </View>
          <View style={styles.previewPanel}>
            <Text style={styles.previewTitle}>{selectedTrade} supervisor preview</Text>
            <TextInput value={tradePreview} editable={false} multiline style={styles.previewBox} />
          </View>
        </View>
      </SectionCard>

      <SectionCard title="Issue history" subtitle="Local audit trail for programme issue actions during the pilot.">
        {issueLogs.length === 0 ? <Text style={styles.empty}>No programmes recorded as issued yet.</Text> : null}
        {issueLogs.map((log) => (
          <View key={log.id} style={styles.logRow}>
            <View style={styles.logMain}>
              <Text style={styles.logTitle}>WK{String(log.startWeek).padStart(2, '0')} + WK{String(log.startWeek + 1).padStart(2, '0')}</Text>
              <Text style={styles.logMeta}>{log.note}</Text>
            </View>
            <Text style={styles.logDate}>{new Date(log.issuedAt).toLocaleDateString()}</Text>
          </View>
        ))}
      </SectionCard>
    </AppScreen>
  );
}

function getPlotById(plotId: string, plots: ReturnType<typeof useSitePlanner>['sitePlots']) {
  return plots.find((plot) => plot.id === plotId);
}

function getTradeActivities(plotId: string, trade: string, startWeek: number, plots: ReturnType<typeof useSitePlanner>['sitePlots'], delays: ReturnType<typeof useSitePlanner>['activityDelays'], templates: ReturnType<typeof useSitePlanner>['plotTemplates']) {
  const plot = getPlotById(plotId, plots);
  if (!plot) return [];
  const activities = [];
  for (let week = startWeek; week <= startWeek + 1; week += 1) {
    for (let day = 1; day <= 5; day += 1) {
      activities.push(...getActivitiesForTemplateDay(plot, week, day, delays, templates).filter((activity) => activity.trade === trade));
    }
  }
  return Array.from(new Map(activities.map((activity) => [activity.code, activity])).values());
}

function hasTradeWork(plotId: string, trade: string, startWeek: number, plots: ReturnType<typeof useSitePlanner>['sitePlots'], delays: ReturnType<typeof useSitePlanner>['activityDelays'], templates: ReturnType<typeof useSitePlanner>['plotTemplates']) {
  return getTradeActivities(plotId, trade, startWeek, plots, delays, templates).length > 0;
}

function getFixText(plotId: string, trade: string, startWeek: number, plots: ReturnType<typeof useSitePlanner>['sitePlots'], delays: ReturnType<typeof useSitePlanner>['activityDelays'], templates: ReturnType<typeof useSitePlanner>['plotTemplates']) {
  return getTradeActivities(plotId, trade, startWeek, plots, delays, templates)
    .map((activity) => activity.displayText)
    .filter(Boolean)
    .filter((text, index, array) => array.indexOf(text) === index)
    .join(' / ');
}

function getOutputText(plotId: string, trade: string, startWeek: number, plots: ReturnType<typeof useSitePlanner>['sitePlots'], delays: ReturnType<typeof useSitePlanner>['activityDelays'], templates: ReturnType<typeof useSitePlanner>['plotTemplates']) {
  return getTradeActivities(plotId, trade, startWeek, plots, delays, templates)
    .map((activity) => activity.code)
    .filter(Boolean)
    .join(', ');
}

const styles = StyleSheet.create({
  header: { gap: 4 },
  title: { color: '#0f172a', fontSize: 30, fontWeight: '900' },
  subtitle: { color: '#64748b', fontSize: 14, lineHeight: 20 },
  tradeChips: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  tradeChip: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#ffffff' },
  tradeChipActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  tradeChipText: { color: '#64748b', fontSize: 12, fontWeight: '900' },
  tradeChipTextActive: { color: '#ffffff' },
  topHeaderRow: { flexDirection: 'row' },
  tableRow: { flexDirection: 'row', alignItems: 'stretch' },
  altRow: { backgroundColor: '#f8fbff' },
  weekHeaderBlank: { backgroundColor: '#173b5f', borderWidth: 1, borderColor: '#9fb6ce', minHeight: 28 },
  weekGroup: { width: 700, backgroundColor: '#173b5f', color: '#ffffff', fontWeight: '900', fontSize: 12, padding: 7, borderWidth: 1, borderColor: '#9fb6ce', textAlign: 'center' },
  headerCell: { backgroundColor: '#173b5f', color: '#ffffff', fontWeight: '900', fontSize: 12, padding: 8, borderWidth: 1, borderColor: '#9fb6ce', textAlign: 'center' },
  plotCell: { width: 90 },
  tradeCell: { width: 150 },
  fixCell: { width: 150 },
  outputCell: { width: 260 },
  dayHeader: { width: 140, backgroundColor: '#173b5f', color: '#ffffff', fontWeight: '900', fontSize: 12, padding: 8, borderWidth: 1, borderColor: '#9fb6ce', textAlign: 'center' },
  bodyCell: { color: '#0f172a', padding: 8, borderWidth: 1, borderColor: '#c8d7e6', textAlign: 'center', fontWeight: '800' },
  dayCell: { width: 140, minHeight: 58, color: '#0f172a', padding: 6, borderWidth: 1, borderColor: '#c8d7e6', textAlign: 'center', fontSize: 11, fontWeight: '900' },
  activeDayCell: { backgroundColor: '#dff0ff' },
  emptyCell: { color: '#64748b', padding: 8, borderWidth: 1, borderColor: '#c8d7e6', textAlign: 'center', fontWeight: '800' },
  emptyDayCell: { width: 140, minHeight: 42, borderWidth: 1, borderColor: '#c8d7e6' },
  formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' },
  inputWrap: { gap: 6, minWidth: 190, flex: 1 },
  inputWrapSmall: { gap: 6, width: 120 },
  label: { color: '#334155', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  input: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: '#0f172a', fontWeight: '800' },
  lockedInput: { backgroundColor: '#f1f5f9', color: '#64748b' },
  saveButton: { backgroundColor: '#0f172a', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, alignSelf: 'flex-end' },
  saveButtonText: { color: '#ffffff', fontWeight: '900' },
  toggleButton: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#ffffff' },
  toggleActive: { backgroundColor: '#dcfce7', borderColor: '#16a34a' },
  toggleText: { color: '#475569', fontWeight: '900' },
  toggleTextActive: { color: '#166534' },
  helperText: { color: '#64748b', fontSize: 12, lineHeight: 18 },
  issueHeaderRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' },
  issueSummary: { flex: 1, minWidth: 220, backgroundColor: '#eff6ff', borderRadius: 12, padding: 12 },
  issueTitle: { color: '#0f172a', fontWeight: '900', fontSize: 18 },
  issueMeta: { color: '#64748b', fontSize: 12, marginTop: 3 },
  previewGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  previewPanel: { flex: 1, minWidth: 300, gap: 8 },
  previewTitle: { color: '#0f172a', fontWeight: '900' },
  previewBox: { minHeight: 180, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, backgroundColor: '#f8fafc', color: '#0f172a', fontFamily: 'monospace', fontSize: 12, textAlignVertical: 'top' },
  empty: { color: '#64748b' },
  logRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },
  logMain: { flex: 1 },
  logTitle: { color: '#0f172a', fontWeight: '900' },
  logMeta: { color: '#64748b', fontSize: 12, marginTop: 3, lineHeight: 18 },
  logDate: { color: '#2563eb', fontWeight: '900', fontSize: 12 },
});
