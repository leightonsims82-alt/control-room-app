import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { SectionCard } from '../../components/SectionCard';
import { useProgrammeData } from '../../data/programmeStore';
import { useSitePlanner } from '../../data/sitePlannerStore';

export default function MoreScreen() {
  const { defects, inspections } = useProgrammeData();
  const { siteSetup, plotTemplates, sitePlots, tradeContacts, issueLogs } = useSitePlanner();

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.title}>More</Text>
        <Text style={styles.subtitle}>Settings, templates and build information</Text>
      </View>

      <SectionCard title="Site Setup" subtitle="Programme defaults and plot type templates">
        <InfoRow label="Site" value={siteSetup.siteName} />
        <InfoRow label="Default programme" value={`${siteSetup.defaultProgrammeWeeks} weeks`} />
        <InfoRow label="Default stage count" value={`${siteSetup.stageCount}`} />
        <InfoRow label="Working week" value={siteSetup.workingWeek} />
        <InfoRow label="Templates" value={`${plotTemplates.length}`} />
        <Link href="/site/setup" asChild>
          <Pressable style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Open Site Setup</Text>
          </Pressable>
        </Link>
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

      <SectionCard title="Modules now added" subtitle="Current site control layer">
        <Text style={styles.item}>Configurable site setup: programme weeks, stage count and working week</Text>
        <Text style={styles.item}>Plot type templates for apartments, 2 bed, 3 bed, 4 bed and 5 bed homes</Text>
        <Text style={styles.item}>Editable task durations by template</Text>
        <Text style={styles.item}>Plot setup assigns each plot to a template</Text>
        <Text style={styles.item}>Daily plot breakdown and 2-week trade programme use the selected template</Text>
      </SectionCard>

      <SectionCard title="Next Modules" subtitle="Planned build sequence">
        <Text style={styles.item}>Plot-specific task duration overrides</Text>
        <Text style={styles.item}>Editable task names and activity order</Text>
        <Text style={styles.item}>Backend email job for true scheduled issue</Text>
        <Text style={styles.item}>PDF / Excel export for issued programmes</Text>
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
  primaryButton: { alignSelf: 'flex-start', backgroundColor: '#0f172a', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginTop: 4 },
  primaryButtonText: { color: '#ffffff', fontWeight: '900', fontSize: 13 },
});
