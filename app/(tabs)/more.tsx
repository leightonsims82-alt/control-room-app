import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { SectionCard } from '../../components/SectionCard';
import { useSitePlanner } from '../../data/sitePlannerStore';
import { PROGRAMME_STAGE_SEQUENCE } from '../../utils/siteProgrammeEngine';

export default function MoreScreen() {
  const { siteSetup, plotTemplates, sitePlots, tradeContacts, issueLogs } = useSitePlanner();

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.title}>Setup</Text>
        <Text style={styles.subtitle}>Programme Buddy settings, templates, launch plan and rebuild status.</Text>
      </View>

      <SectionCard title="Programme source of truth" subtitle="These settings drive the master, plot breakdown and trade issue views.">
        <InfoRow label="App" value="Programme Buddy" />
        <InfoRow label="Site" value={siteSetup.siteName} />
        <InfoRow label="Default programme" value={`${siteSetup.defaultProgrammeWeeks} weeks`} />
        <InfoRow label="Stage count" value={`${siteSetup.stageCount}`} />
        <InfoRow label="Working week" value={siteSetup.workingWeek} />
        <InfoRow label="House templates" value={`${plotTemplates.length}`} />
        <Link href="/site/setup" asChild>
          <Pressable style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Open Build Sequence Setup</Text>
          </Pressable>
        </Link>
      </SectionCard>

      <SectionCard title="Closed testing and launch" subtitle="Access is open for testing while live commercial items are tracked separately.">
        <Text style={styles.item}>Closed testing access remains open without payment for now.</Text>
        <Text style={styles.item}>Live launch items include legal wording, store assets, backend accounts, billing, storage add-ons and admin controls.</Text>
        <View style={styles.buttonRow}>
          <Link href="/onboarding" asChild>
            <Pressable style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Open Onboarding</Text>
            </Pressable>
          </Link>
          <Link href="/access" asChild>
            <Pressable style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Open Access</Text>
            </Pressable>
          </Link>
          <Link href="/launch" asChild>
            <Pressable style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Open Launch Plan</Text>
            </Pressable>
          </Link>
        </View>
      </SectionCard>

      <SectionCard title="Stage key" subtitle="Number-only cells use this key.">
        <View style={styles.stageGrid}>
          {PROGRAMME_STAGE_SEQUENCE.map((stage) => (
            <View key={stage.stage} style={styles.stageItem}>
              <Text style={styles.stageNumber}>{stage.stage}</Text>
              <View style={styles.stageMain}>
                <Text style={styles.stageLabel}>{stage.label}</Text>
                <Text style={styles.stageMeta}>{stage.durationWeeks} week{stage.durationWeeks === 1 ? '' : 's'}</Text>
              </View>
            </View>
          ))}
        </View>
      </SectionCard>

      <SectionCard title="Build status" subtitle="Local pilot state">
        <InfoRow label="Plot rows" value={`${sitePlots.length}`} />
        <InfoRow label="Trade contacts" value={`${tradeContacts.length}`} />
        <InfoRow label="Issue logs" value={`${issueLogs.length}`} />
      </SectionCard>

      <SectionCard title="Rebuild checklist" subtitle="Current Programme Buddy direction">
        <Text style={styles.item}>Master Programme: one row per plot, week columns, stage numbers only.</Text>
        <Text style={styles.item}>Rolling 2-Week: selected two-week block with real programme dates and QA triggers.</Text>
        <Text style={styles.item}>Plot Breakdown: daily activity codes behind each plot.</Text>
        <Text style={styles.item}>Trades: Excel-style trade sheet with Plot No, Trade, Fix, daily cells and Output / Recovery Notes.</Text>
      </SectionCard>

      <SectionCard title="Next build modules" subtitle="Still to be connected after layout sign-off">
        <Text style={styles.item}>Excel / PDF export for issued programmes.</Text>
        <Text style={styles.item}>Email issue to manager and trade supervisors.</Text>
        <Text style={styles.item}>Delay notes and recovery comments against missed targets.</Text>
        <Text style={styles.item}>Editable stage names and new activity rows from the app UI.</Text>
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
  item: { color: '#0f172a', fontWeight: '700', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12, lineHeight: 20 },
  primaryButton: { alignSelf: 'flex-start', backgroundColor: '#0f172a', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginTop: 4 },
  primaryButtonText: { color: '#ffffff', fontWeight: '900', fontSize: 13 },
  buttonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  secondaryButton: { alignSelf: 'flex-start', backgroundColor: '#2563eb', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginTop: 4 },
  secondaryButtonText: { color: '#ffffff', fontWeight: '900', fontSize: 13 },
  stageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stageItem: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 250, flex: 1, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 10 },
  stageNumber: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#173b5f', color: '#ffffff', textAlign: 'center', lineHeight: 34, fontWeight: '900' },
  stageMain: { flex: 1 },
  stageLabel: { color: '#0f172a', fontWeight: '900' },
  stageMeta: { color: '#64748b', fontSize: 12, marginTop: 2 },
});
