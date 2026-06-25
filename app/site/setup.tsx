import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { GuideBox } from '../../components/GuideBox';
import { foundationTypeOptions, jurisdictionOptions, useSiteSettings } from '../../data/siteSettingsStore';

export default function SiteSetupScreen() {
  const { settings, saveSettings } = useSiteSettings();

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Site Setup</Text>
        <Text style={styles.title}>Site Defaults</Text>
        <Text style={styles.subtitle}>Set the regulation route and foundation route once for the site. New plots inherit these settings.</Text>
      </View>

      <GuideBox
        title="Why this sits at site level"
        items={[
          'The regulation route is normally determined by site location.',
          'The default foundation route is normally set by the site design strategy.',
          'New plots inherit these settings so managers do not repeat setup on every plot.',
          'Plot-level overrides can be added later if an individual plot has a different design requirement.',
        ]}
      />

      <View style={styles.card}>
        <Field label="Site name">
          <TextInput value={settings.siteName} onChangeText={(value) => saveSettings({ siteName: value })} placeholder="e.g. Hendrefoilan" style={styles.input} />
        </Field>

        <Field label="Regulation route">
          <OptionRow values={jurisdictionOptions} value={settings.jurisdiction} onChange={(value) => saveSettings({ jurisdiction: value })} />
          <Text style={styles.helpText}>This controls whether English or Welsh Building Regulations guidance is shown.</Text>
        </Field>

        <Field label="Default foundation type">
          <OptionRow values={foundationTypeOptions} value={settings.defaultFoundationType} onChange={(value) => saveSettings({ defaultFoundationType: value })} />
          <Text style={styles.helpText}>This controls the default foundation checklist for new plots.</Text>
        </Field>

        <View style={styles.summaryBox}>
          <Text style={styles.summaryTitle}>Current site route</Text>
          <Text style={styles.summaryText}>{settings.siteName}</Text>
          <Text style={styles.summaryText}>{settings.jurisdiction} Building Regulations</Text>
          <Text style={styles.summaryText}>{settings.defaultFoundationType}</Text>
        </View>

        <Pressable style={styles.primaryButton} onPress={() => router.back()}>
          <Text style={styles.primaryButtonText}>Done</Text>
        </Pressable>
      </View>
    </AppScreen>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function OptionRow<T extends string>({ values, value, onChange }: { values: readonly T[]; value: T; onChange: (value: T) => void }) {
  return (
    <View style={styles.optionRow}>
      {values.map((item) => {
        const active = item === value;
        return (
          <Pressable key={item} onPress={() => onChange(item)} style={[styles.option, active ? styles.optionActive : null]}>
            <Text style={[styles.optionText, active ? styles.optionTextActive : null]}>{item}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: 4 },
  eyebrow: { color: '#2563eb', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  title: { color: '#0f172a', fontSize: 30, fontWeight: '900' },
  subtitle: { color: '#64748b', fontSize: 14 },
  card: { backgroundColor: '#ffffff', borderRadius: 18, borderWidth: 1, borderColor: '#e2e8f0', padding: 18, gap: 16 },
  field: { gap: 8 },
  label: { color: '#475569', fontSize: 13, fontWeight: '900' },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: '#0f172a', backgroundColor: '#ffffff' },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: '#ffffff' },
  optionActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  optionText: { color: '#475569', fontSize: 13, fontWeight: '800' },
  optionTextActive: { color: '#ffffff' },
  helpText: { color: '#94a3b8', fontSize: 12 },
  summaryBox: { backgroundColor: '#eff6ff', borderRadius: 14, padding: 14, gap: 4 },
  summaryTitle: { color: '#1d4ed8', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  summaryText: { color: '#0f172a', fontWeight: '800' },
  primaryButton: { alignSelf: 'flex-start', backgroundColor: '#0f172a', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  primaryButtonText: { color: '#ffffff', fontWeight: '900' },
});
