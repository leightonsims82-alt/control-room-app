import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { SectionCard } from '../../components/SectionCard';
import { useProgrammeData } from '../../data/programmeStore';
import { useSitePlanner } from '../../data/sitePlannerStore';
import { formatCalendarWeek, getProgrammeStartDateValue } from '../../utils/programmeDates';

export default function MoreScreen() {
  const { defects, inspections } = useProgrammeData();
  const { siteSetup, plotTemplates, sitePlots, tradeContacts, issueLogs } = useSitePlanner();

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.title}>More</Text>
        <Text style={styles.subtitle}>Settings, handover control and build information</Text>
      </View>

      <SectionCard title="Site Setup" subtitle="Programme defaults and plot type templates">
        <InfoRow label="Site" value={siteSetup.siteName} />
        <InfoRow label="Default programme" value={`${siteSetup.defaultProgrammeWeeks} weeks`} />
        <InfoRow label="Default stage count" value={`${siteSetup.stageCount}`} />
        <InfoRow label="Working week" value={siteSetup.workingWeek} />
        <InfoRow label="Week 1 commencement date" value={getProgrammeStartDateValue(siteSetup.programmeStartDate)} />
        <InfoRow label="Calendar week for Week 1" value={formatCalendarWeek(siteSetup.programmeStartDate, 1, siteSetup.calendarWeekOne)} />
        <InfoRow label="Templates" value={`${plotTemplates.length}`} />
        <View style={styles.buttonRow}>
          <Link href="/site/setup" asChild><Pressable style={styles.primaryButton}><Text style={styles.primaryButtonText}>Open Site Setup</Text></Pressable></Link>
          <Link href="/handover" asChild><Pressable style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Open Handover</Text></Pressable></Link>
        </View>
      </SectionCard>

      <SectionCard title="Build Status" subtitle="Current programme app state">
        <InfoRow label="App" value="Site Programme Control Room" />
        <InfoRow label="Mode" value="Local pilot build" />
        <InfoRow label="Week-based plots" value={`${sitePlots.length}`} />
        <InfoRow label="Trade contacts" value={`${tradeContacts.length}`} />
        <InfoRow label="Issue logs" value={`${issueLogs.length}`} />
        <InfoRow label="Inspections saved" value={`${inspections.length}`} />
        <InfoRow label="Trade actions" value={`${defects.length}`} />
      </SectionCard>

      <SectionCard title="Live control modules" subtitle="Base44 ideas now carried into the VS Code build">
        <Text style={styles.item}>Plot setup with house type, build method and forward/reverse programme generation</Text>
        <Text style={styles.item}>Master programme date control without extra +/- controls</Text>
        <Text style={styles.item}>Interactive 2-week programme with activity movement controls</Text>
        <Text style={styles.item}>Expanded plot breakdown with programme health, next 14 days and QA blockers</Text>
        <Text style={styles.item}>Trade supervisor setup and trade-filtered live 2-week programmes</Text>
        <Text style={styles.item}>QA inspection evidence, action close-out and verification workflow</Text>
        <Text style={styles.item}>8am mobile site walk for live plots, labour and blockers</Text>
        <Text style={styles.item}>Plot handover readiness checklist with QA, services, documents and cleaning</Text>
        <Text style={styles.item}>Dashboard programme intelligence for overdue stages, aged actions and inspection risks</Text>
      </SectionCard>
    </AppScreen>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: 4 },
  title: { color: '#0f172a', fontSize: 30, fontWeight: '900' },
  subtitle: { color: '#64748b', fontSize: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },
  label: { color: '#64748b', fontWeight: '700' },
  value: { color: '#0f172a', fontWeight: '900' },
  item: { color: '#0f172a', fontWeight: '700', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },
  buttonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  primaryButton: { backgroundColor: '#0f172a', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  primaryButtonText: { color: '#ffffff', fontWeight: '900', fontSize: 13 },
  secondaryButton: { backgroundColor: '#eff6ff', borderRadius: 12, borderWidth: 1, borderColor: '#bfdbfe', paddingHorizontal: 14, paddingVertical: 10 },
  secondaryButtonText: { color: '#1d4ed8', fontWeight: '900', fontSize: 13 },
});
