import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { useSitePlanner } from '../../data/sitePlannerStore';
import { exportMainTwoWeekPdf, exportMasterProgrammePdf, exportTradeProgrammesPdf } from '../../utils/programmePdfExport';

function splitEmails(value: string) {
  return value
    .split(/[\n,;]+/)
    .map((email) => email.trim())
    .filter(Boolean);
}

function mailto(recipients: string[], subject: string, body: string) {
  const to = recipients.join(',');
  const url = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  Linking.openURL(url);
}

export default function ExportsScreen() {
  const { sitePlots, activityDelays, plotTemplates, siteSetup, issueSettings, tradeContacts, setIssueSettings, recordIssue } = useSitePlanner();
  const [smEmail, setSmEmail] = useState(issueSettings.managerEmail);
  const [assistantEmails, setAssistantEmails] = useState(issueSettings.assistantEmails ?? '');
  const [sendMaster, setSendMaster] = useState(issueSettings.sendMasterToSmTeam ?? true);
  const [sendMainTwoWeek, setSendMainTwoWeek] = useState(issueSettings.sendTwoWeekToSmTeam ?? true);
  const [sendTradeProgrammesToSmTeam, setSendTradeProgrammesToSmTeam] = useState(issueSettings.sendTradeProgrammeToSmTeam ?? true);
  const [sendTradeProgrammesToTrades, setSendTradeProgrammesToTrades] = useState(issueSettings.sendTradeProgrammesToTrades ?? true);
  const [startWeek, setStartWeek] = useState('1');
  const [status, setStatus] = useState('');

  const parsedStartWeek = Number(startWeek) || 1;
  const smTeamRecipients = [smEmail.trim(), ...splitEmails(assistantEmails)].filter(Boolean);
  const tradeRecipients = tradeContacts.filter((contact) => contact.supervisorEmail.trim());
  const selectedOutputs = [
    sendMaster ? 'Master Programme' : '',
    sendMainTwoWeek ? 'Main 2-Week Programme' : '',
    sendTradeProgrammesToSmTeam ? 'All Individual Trade Programmes' : '',
  ].filter(Boolean);
  const allTradeNames = tradeContacts.map((contact) => contact.trade);
  const tradeNamesWithEmails = tradeRecipients.map((contact) => contact.trade);

  const saveIssueSetup = async () => {
    await setIssueSettings({
      ...issueSettings,
      managerEmail: smEmail,
      assistantEmails,
      sendMasterToSmTeam: sendMaster,
      sendTwoWeekToSmTeam: sendMainTwoWeek,
      sendTradeProgrammeToSmTeam: sendTradeProgrammesToSmTeam,
      sendTradeProgrammesToTrades,
    });
    setStatus('Issue setup saved');
  };

  const exportSmPdfPack = () => {
    let opened = false;
    if (sendMaster) opened = exportMasterProgrammePdf({ siteName: siteSetup.siteName, plots: sitePlots, templates: plotTemplates }) || opened;
    if (sendMainTwoWeek) opened = exportMainTwoWeekPdf({ siteName: siteSetup.siteName, startWeek: parsedStartWeek, plots: sitePlots, delays: activityDelays, templates: plotTemplates }) || opened;
    if (sendTradeProgrammesToSmTeam) opened = exportTradeProgrammesPdf({ siteName: siteSetup.siteName, startWeek: parsedStartWeek, plots: sitePlots, delays: activityDelays, templates: plotTemplates, trades: allTradeNames }) || opened;
    setStatus(opened ? 'PDF export opened — use Save as PDF in the print window' : 'Allow pop-ups to export PDF');
  };

  const exportTradePdfPack = () => {
    const trades = tradeNamesWithEmails.length ? tradeNamesWithEmails : allTradeNames;
    const opened = exportTradeProgrammesPdf({ siteName: siteSetup.siteName, startWeek: parsedStartWeek, plots: sitePlots, delays: activityDelays, templates: plotTemplates, trades });
    setStatus(opened ? 'Trade PDF export opened — use Save as PDF in the print window' : 'Allow pop-ups to export PDF');
  };

  const exportMainPdf = () => {
    const opened = exportMainTwoWeekPdf({ siteName: siteSetup.siteName, startWeek: parsedStartWeek, plots: sitePlots, delays: activityDelays, templates: plotTemplates });
    setStatus(opened ? 'Main 2-week PDF export opened' : 'Allow pop-ups to export PDF');
  };

  const sendToSmTeam = async () => {
    const recipients = smTeamRecipients;
    if (!recipients.length) {
      setStatus('Add the SM or assistant email first');
      return;
    }
    const outputs = selectedOutputs.length ? selectedOutputs.join(', ') : 'No outputs selected';
    mailto(
      recipients,
      `${siteSetup.siteName} programme issue - WK${startWeek}`,
      `Please find the programme issue for ${siteSetup.siteName}.\n\nOutputs selected: ${outputs}.\n\nExport the selected PDF from Programme Buddy and attach it to this email.`,
    );
    await recordIssue({
      startWeek: parsedStartWeek,
      recipientCount: recipients.length,
      note: `SM / assistant issue prepared: ${outputs}`,
    });
    setStatus('SM / assistant email opened — attach exported PDF');
  };

  const sendToTrades = async () => {
    if (!sendTradeProgrammesToTrades) {
      setStatus('Trade issue is switched off');
      return;
    }
    if (!tradeRecipients.length) {
      setStatus('Add supervisor emails in Trade Setup first');
      return;
    }
    tradeRecipients.forEach((contact) => {
      mailto(
        [contact.supervisorEmail],
        `${siteSetup.siteName} - ${contact.trade} 2-week programme - WK${startWeek}`,
        `Please find your ${contact.trade} 2-week programme for ${siteSetup.siteName}.\n\nYou are only being issued your trade-specific programme.\n\nExport the ${contact.trade} PDF from Programme Buddy and attach it to this email.`,
      );
    });
    await recordIssue({
      startWeek: parsedStartWeek,
      recipientCount: tradeRecipients.length,
      note: `Trade programmes prepared for ${tradeRecipients.length} trade supervisor${tradeRecipients.length === 1 ? '' : 's'}`,
    });
    setStatus(`${tradeRecipients.length} trade email${tradeRecipients.length === 1 ? '' : 's'} opened — attach exported PDFs`);
  };

  return (
    <AppScreen>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Ionicons name="send-outline" size={28} color="#16a34a" />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>Programme issue</Text>
          <Text style={styles.title}>Exports & Issue</Text>
          <Text style={styles.subtitle}>Export a proper printable PDF first, then open the email issue for SM, assistants and trades.</Text>
        </View>
      </View>

      {status ? <Text style={styles.statusBanner}>{status}</Text> : null}

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>{siteSetup.siteName}</Text>
        <Text style={styles.summaryText}>{sitePlots.length} plot{sitePlots.length === 1 ? '' : 's'} ready for output</Text>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Issue week</Text>
        <Text style={styles.sectionText}>This controls the 2-week window used for the management issue and the trade issue.</Text>
        <View style={styles.shortInputRow}>
          <View style={styles.shortInputWrap}>
            <Text style={styles.label}>Start week</Text>
            <TextInput value={startWeek} onChangeText={setStartWeek} keyboardType="number-pad" style={styles.input} />
          </View>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>PDF exports</Text>
        <Text style={styles.sectionText}>These open a print-ready programme. Choose Save as PDF in the print window.</Text>
        <View style={styles.buttonRow}>
          <Pressable style={styles.primaryButton} onPress={exportMainPdf}><Text style={styles.primaryButtonText}>Export Main 2-Week PDF</Text></Pressable>
          <Pressable style={styles.secondaryButton} onPress={exportSmPdfPack}><Text style={styles.secondaryButtonText}>Export SM PDF Pack</Text></Pressable>
          <Pressable style={styles.secondaryButton} onPress={exportTradePdfPack}><Text style={styles.secondaryButtonText}>Export Trade PDFs</Text></Pressable>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>SM / Assistant Site Manager issue</Text>
        <Text style={styles.sectionText}>The trade programme can go to the SM and any assistants associated with the development.</Text>
        <View style={styles.formGrid}>
          <View style={styles.inputWrap}>
            <Text style={styles.label}>SM email</Text>
            <TextInput value={smEmail} onChangeText={setSmEmail} style={styles.input} placeholder="site.manager@example.com" keyboardType="email-address" autoCapitalize="none" />
          </View>
          <View style={styles.inputWrapWide}>
            <Text style={styles.label}>Assistant emails</Text>
            <TextInput value={assistantEmails} onChangeText={setAssistantEmails} style={[styles.input, styles.multiInput]} multiline placeholder={'assistant1@example.com\nassistant2@example.com'} keyboardType="email-address" autoCapitalize="none" />
          </View>
        </View>
        <View style={styles.toggleGrid}>
          <Toggle label="Master Programme" active={sendMaster} onPress={() => setSendMaster((value) => !value)} />
          <Toggle label="Main 2-Week Programme" active={sendMainTwoWeek} onPress={() => setSendMainTwoWeek((value) => !value)} />
          <Toggle label="Trade Programmes to SM team" active={sendTradeProgrammesToSmTeam} onPress={() => setSendTradeProgrammesToSmTeam((value) => !value)} />
        </View>
        <View style={styles.buttonRow}>
          <Pressable style={styles.secondaryButton} onPress={saveIssueSetup}><Text style={styles.secondaryButtonText}>Save Issue Setup</Text></Pressable>
          <Pressable style={styles.primaryButton} onPress={sendToSmTeam}><Text style={styles.primaryButtonText}>Send to SM / Assistants</Text></Pressable>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Trade issue</Text>
        <Text style={styles.sectionText}>Each trade supervisor receives their own individual 2-week trade programme only.</Text>
        <Toggle label="Send individual trade programmes to trades" active={sendTradeProgrammesToTrades} onPress={() => setSendTradeProgrammesToTrades((value) => !value)} />
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={styles.tradeList}>
            {tradeContacts.map((contact) => {
              const hasEmail = Boolean(contact.supervisorEmail.trim());
              return (
                <View key={contact.id} style={[styles.tradePill, hasEmail ? styles.tradePillReady : null]}>
                  <Text style={styles.tradeName}>{contact.trade}</Text>
                  <Text style={styles.tradeEmail}>{hasEmail ? contact.supervisorEmail : 'No email saved'}</Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
        <View style={styles.buttonRow}>
          <Pressable style={styles.secondaryButton} onPress={exportTradePdfPack}><Text style={styles.secondaryButtonText}>Export Trade PDFs</Text></Pressable>
          <Pressable style={styles.primaryButton} onPress={sendToTrades}><Text style={styles.primaryButtonText}>Send Trade Programmes</Text></Pressable>
        </View>
      </View>
    </AppScreen>
  );
}

function Toggle({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.toggle, active ? styles.toggleActive : null]} onPress={onPress}>
      <Ionicons name={active ? 'checkbox-outline' : 'square-outline'} size={18} color={active ? '#166534' : '#64748b'} />
      <Text style={[styles.toggleText, active ? styles.toggleTextActive : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
  iconWrap: { width: 58, height: 58, borderRadius: 18, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, minWidth: 240 },
  eyebrow: { color: '#16a34a', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  title: { fontSize: 32, fontWeight: '900', color: '#0f172a', marginTop: 4 },
  subtitle: { marginTop: 6, fontSize: 15, color: '#64748b', lineHeight: 22 },
  statusBanner: { backgroundColor: '#dcfce7', borderColor: '#86efac', borderWidth: 1, color: '#166534', fontWeight: '900', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  summaryCard: { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#e2e8f0', padding: 18 },
  summaryTitle: { color: '#0f172a', fontSize: 18, fontWeight: '900' },
  summaryText: { color: '#64748b', fontSize: 14, marginTop: 4 },
  sectionCard: { backgroundColor: '#ffffff', borderRadius: 18, borderWidth: 1, borderColor: '#e2e8f0', padding: 16, gap: 12 },
  sectionTitle: { color: '#0f172a', fontSize: 18, fontWeight: '900' },
  sectionText: { color: '#64748b', fontSize: 13, lineHeight: 19 },
  formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  inputWrap: { gap: 6, minWidth: 240, flex: 1 },
  inputWrapWide: { gap: 6, minWidth: 300, flex: 2 },
  shortInputRow: { flexDirection: 'row', flexWrap: 'wrap' },
  shortInputWrap: { gap: 6, width: 130 },
  label: { color: '#334155', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  input: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: '#0f172a', fontWeight: '800' },
  multiInput: { minHeight: 84, textAlignVertical: 'top' },
  toggleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: '#ffffff' },
  toggleActive: { backgroundColor: '#dcfce7', borderColor: '#16a34a' },
  toggleText: { color: '#64748b', fontWeight: '900', fontSize: 12 },
  toggleTextActive: { color: '#166534' },
  buttonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  primaryButton: { backgroundColor: '#0f172a', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, alignSelf: 'flex-start' },
  primaryButtonText: { color: '#ffffff', fontWeight: '900' },
  secondaryButton: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe', borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, alignSelf: 'flex-start' },
  secondaryButtonText: { color: '#1d4ed8', fontWeight: '900' },
  tradeList: { flexDirection: 'row', gap: 10, paddingVertical: 4 },
  tradePill: { width: 190, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, backgroundColor: '#f8fafc', padding: 12, gap: 4 },
  tradePillReady: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  tradeName: { color: '#0f172a', fontWeight: '900', fontSize: 13 },
  tradeEmail: { color: '#64748b', fontSize: 11, fontWeight: '800' },
});