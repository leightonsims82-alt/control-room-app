import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { SectionCard } from '../../components/SectionCard';
import { houseTypes, plotProgrammes, plotStages } from '../../data/demoData';
import { useProgrammeData } from '../../data/programmeStore';
import { useSiteSettings } from '../../data/siteSettingsStore';

export default function MoreScreen() {
  const { defects, inspections } = useProgrammeData();
  const { settings } = useSiteSettings();

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.title}>More</Text>
        <Text style={styles.subtitle}>Settings, templates and build information</Text>
      </View>

      <SectionCard title="Site Setup" subtitle="Default route used by new plots">
        <InfoRow label="Site" value={settings.siteName} />
        <InfoRow label="Regulation route" value={`${settings.jurisdiction} Building Regulations`} />
        <InfoRow label="Default foundation" value={settings.defaultFoundationType} />
        <Link href="/site/setup" asChild>
          <Pressable style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Open Site Setup</Text>
          </Pressable>
        </Link>
      </SectionCard>

      <SectionCard title="Build Status" subtitle="Current professional rebuild progress">
        <InfoRow label="App" value="SiteProg" />
        <InfoRow label="Mode" value="Local demo build" />
        <InfoRow label="Plots loaded" value={`${plotProgrammes.length}`} />
        <InfoRow label="Stages loaded" value={`${plotStages.length}`} />
        <InfoRow label="House types" value={`${houseTypes.length}`} />
        <InfoRow label="Inspections saved" value={`${inspections.length}`} />
        <InfoRow label="Trade actions" value={`${defects.length}`} />
      </SectionCard>

      <SectionCard title="Modules now added" subtitle="Current site control layer">
        <Text style={styles.item}>Site setup for England/Wales and foundation route</Text>
        <Text style={styles.item}>Stage inspection checklists</Text>
        <Text style={styles.item}>Failed checks create trade actions</Text>
        <Text style={styles.item}>DABS standalone PM meeting record</Text>
        <Text style={styles.item}>Brickwork inspections for 1st, 2nd, 3rd, 4th lift and gables</Text>
      </SectionCard>

      <SectionCard title="Next Modules" subtitle="Planned build sequence">
        <Text style={styles.item}>8am site walk from programme and live plot list</Text>
        <Text style={styles.item}>Proper camera/photo upload</Text>
        <Text style={styles.item}>Trade action export and copy message</Text>
        <Text style={styles.item}>Regenerate programme for existing plots</Text>
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
