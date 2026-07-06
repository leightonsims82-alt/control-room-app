import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { useSitePlanner } from '../../data/sitePlannerStore';

function toRevisionLabel(index: number) {
  const letterIndex = Math.max(0, index % 26);
  const cycle = Math.floor(index / 26);
  return `Rev ${String.fromCharCode(65 + letterIndex)}${cycle > 0 ? cycle + 1 : ''}`;
}

function getCurrentWeekLabel() {
  return new Date().toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ProgrammeIssueCentre() {
  const { sitePlots, issueLogs, tradeContacts, recordIssue } = useSitePlanner();
  const [notice, setNotice] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const nextRevision = useMemo(() => toRevisionLabel(issueLogs.length), [issueLogs.length]);
  const supervisorCount = tradeContacts.filter((contact) => contact.supervisorEmail.trim()).length;
  const latestIssue = issueLogs[0];

  const previewIssue = () => {
    if (sitePlots.length === 0) {
      setNotice('Add plots before issuing a programme.');
      return;
    }
    setPreviewOpen(true);
    setNotice(`${nextRevision} preview ready. This will create the formal issue record and refresh the supervisor app view.`);
  };

  const issueProgramme = async () => {
    if (sitePlots.length === 0) {
      setNotice('Cannot issue an empty programme. Add plots first.');
      return;
    }
    await recordIssue({
      startWeek: 0,
      recipientCount: supervisorCount,
      note: `${nextRevision} | 2 Week Programme | PDF + Supervisor App | ${getCurrentWeekLabel()}`,
    });
    setPreviewOpen(false);
    setNotice(`${nextRevision} issued successfully. PDF-ready record created and supervisor app view is available.`);
  };

  const downloadPdf = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.print();
      setNotice('Print view opened. Choose Save as PDF to download the programme.');
      return;
    }
    setNotice('PDF export is ready for web print/save. Native mobile PDF export can be added later.');
  };

  const copySupervisorLink = async () => {
    const link = '/supervisor';
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(link);
      setNotice('Supervisor app link copied. Send it to supervisors to view their trade programme.');
      return;
    }
    setNotice(`Supervisor app link: ${link}`);
  };

  return (
    <AppScreen>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>Issue centre</Text>
          <Text style={styles.title}>Issue Programme</Text>
          <Text style={styles.subtitle}>Create the formal PDF record and give supervisors a live read-only app view of the programme.</Text>
        </View>
        <View style={styles.revisionBadge}><Text style={styles.revisionText}>{nextRevision}</Text></View>
      </View>

      <View style={styles.workflowCard}>
        <Text style={styles.cardTitle}>Hybrid issue workflow</Text>
        <View style={styles.workflowRow}>
          <Step icon="document-text-outline" title="PDF record" text="Use Download PDF, then attach it to your works email for the formal trail." />
          <Step icon="phone-portrait-outline" title="Supervisor app" text="Supervisors open a read-only trade view so they can see the latest programme." />
          <Step icon="time-outline" title="Issue history" text="Every issue records the revision, date, plot count and supervisor access count." />
        </View>
      </View>

      <View style={styles.actionCard}>
        <Text style={styles.cardTitle}>Actions</Text>
        <View style={styles.actionRow}>
          <Pressable style={styles.secondaryButton} onPress={previewIssue}>
            <Ionicons name="eye-outline" size={17} color="#1d4ed8" />
            <Text style={styles.secondaryText}>Preview Issue</Text>
          </Pressable>
          <Pressable style={styles.primaryButton} onPress={issueProgramme}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#ffffff" />
            <Text style={styles.primaryText}>Issue Programme</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={downloadPdf}>
            <Ionicons name="download-outline" size={17} color="#1d4ed8" />
            <Text style={styles.secondaryText}>Download PDF</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={copySupervisorLink}>
            <Ionicons name="link-outline" size={17} color="#1d4ed8" />
            <Text style={styles.secondaryText}>Copy Supervisor Link</Text>
          </Pressable>
          <Link href="/supervisor" asChild>
            <Pressable style={styles.darkButton}>
              <Ionicons name="open-outline" size={17} color="#ffffff" />
              <Text style={styles.primaryText}>Open Supervisor View</Text>
            </Pressable>
          </Link>
        </View>
        {previewOpen ? (
          <View style={styles.previewBox}>
            <Text style={styles.previewTitle}>{nextRevision} preview</Text>
            <Text style={styles.previewText}>Programme: 2 Week Programme</Text>
            <Text style={styles.previewText}>Plots included: {sitePlots.length}</Text>
            <Text style={styles.previewText}>Supervisor emails stored: {supervisorCount}</Text>
            <Text style={styles.previewText}>Issue method: PDF + Supervisor App</Text>
          </View>
        ) : null}
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      </View>

      <View style={styles.summaryRow}>
        <MiniStat label="Plots" value={sitePlots.length} />
        <MiniStat label="Supervisor links" value={supervisorCount} />
        <MiniStat label="Issues" value={issueLogs.length} />
      </View>

      <View style={styles.historyCard}>
        <Text style={styles.cardTitle}>Issue history</Text>
        {latestIssue ? <Text style={styles.latestText}>Latest: {latestIssue.note}</Text> : <Text style={styles.emptyText}>No issues logged yet.</Text>}
        <ScrollView style={{ maxHeight: 300 }}>
          {issueLogs.map((issue) => (
            <View key={issue.id} style={styles.historyRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.historyNote}>{issue.note}</Text>
                <Text style={styles.historyMeta}>{new Date(issue.issuedAt).toLocaleString('en-GB')} • {issue.recipientCount} supervisor email{issue.recipientCount === 1 ? '' : 's'}</Text>
              </View>
              <Pressable style={styles.pdfPill} onPress={downloadPdf}><Text style={styles.pdfPillText}>PDF</Text></Pressable>
            </View>
          ))}
        </ScrollView>
      </View>
    </AppScreen>
  );
}

function Step({ icon, title, text }: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string }) {
  return (
    <View style={styles.stepCard}>
      <Ionicons name={icon} size={22} color="#2563eb" />
      <Text style={styles.stepTitle}>{title}</Text>
      <Text style={styles.stepText}>{text}</Text>
    </View>
  );
}

function MiniStat({ label, value }: { label: string | number; value: string | number }) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniStatValue}>{value}</Text>
      <Text style={styles.miniStatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' },
  kicker: { color: '#2563eb', fontSize: 13, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.3 },
  title: { color: '#0f172a', fontSize: 32, fontWeight: '900', marginTop: 4 },
  subtitle: { color: '#64748b', fontSize: 15, lineHeight: 22, marginTop: 6, maxWidth: 760 },
  revisionBadge: { backgroundColor: '#0f172a', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  revisionText: { color: '#ffffff', fontWeight: '900' },
  workflowCard: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#dbeafe', borderRadius: 22, padding: 16, gap: 12 },
  actionCard: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 22, padding: 16, gap: 12 },
  historyCard: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 22, padding: 16, gap: 10 },
  cardTitle: { color: '#0f172a', fontSize: 20, fontWeight: '900' },
  workflowRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stepCard: { flex: 1, minWidth: 190, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, padding: 14, gap: 5 },
  stepTitle: { color: '#0f172a', fontWeight: '900', fontSize: 15 },
  stepText: { color: '#64748b', fontSize: 12, fontWeight: '800', lineHeight: 18 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  primaryButton: { backgroundColor: '#2563eb', borderRadius: 999, paddingHorizontal: 13, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 7 },
  darkButton: { backgroundColor: '#0f172a', borderRadius: 999, paddingHorizontal: 13, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 7 },
  primaryText: { color: '#ffffff', fontWeight: '900', fontSize: 12 },
  secondaryButton: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe', borderWidth: 1, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 7 },
  secondaryText: { color: '#1d4ed8', fontWeight: '900', fontSize: 12 },
  previewBox: { backgroundColor: '#f8fafc', borderColor: '#e2e8f0', borderWidth: 1, borderRadius: 14, padding: 12, gap: 3 },
  previewTitle: { color: '#0f172a', fontWeight: '900', fontSize: 15 },
  previewText: { color: '#475569', fontWeight: '800', fontSize: 12 },
  notice: { backgroundColor: '#dcfce7', borderColor: '#86efac', borderWidth: 1, color: '#166534', fontWeight: '900', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  miniStat: { flex: 1, minWidth: 120, backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', padding: 12 },
  miniStatValue: { color: '#0f172a', fontSize: 18, fontWeight: '900' },
  miniStatLabel: { color: '#64748b', fontSize: 12, fontWeight: '800', marginTop: 2 },
  latestText: { color: '#475569', fontWeight: '800', fontSize: 13 },
  emptyText: { color: '#64748b', fontWeight: '800' },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingVertical: 10 },
  historyNote: { color: '#0f172a', fontWeight: '900', fontSize: 13 },
  historyMeta: { color: '#64748b', fontWeight: '800', fontSize: 11, marginTop: 2 },
  pdfPill: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe', borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  pdfPillText: { color: '#1d4ed8', fontWeight: '900', fontSize: 12 },
});