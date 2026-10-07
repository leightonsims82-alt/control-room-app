import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { GuideBox } from '../../components/GuideBox';
import { ProgrammeDatePicker } from '../../components/ProgrammeDatePicker';
import { SectionCard } from '../../components/SectionCard';
import { useProgrammeData } from '../../data/programmeStore';
import { useSitePlanner } from '../../data/sitePlannerStore';
import { useSiteSettings } from '../../data/siteSettingsStore';
import { getHouseTypeTemplates, getHouseTypeLabel } from '../../utils/templateProgramme';

type BuildRoute = 'Traditional' | 'Timber Frame';

export default function NewPlotScreen() {
  const { createPlot } = useProgrammeData();
  const { plotTemplates, siteSetup } = useSitePlanner();
  const { settings } = useSiteSettings();
  const houseTypes = useMemo(() => getHouseTypeTemplates(plotTemplates), [plotTemplates]);

  const [plotName, setPlotName] = useState('');
  const [phase, setPhase] = useState('PH1');
  const [houseTypeId, setHouseTypeId] = useState(houseTypes[0]?.id ?? '');
  const [buildRoute, setBuildRoute] = useState<BuildRoute>('Traditional');
  const [mode, setMode] = useState<'forward' | 'reverse'>('forward');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedHouseType = houseTypes.find((item) => item.id === houseTypeId) ?? houseTypes[0];

  async function handleGenerate() {
    setError('');
    if (!plotName.trim()) return setError('Plot number is required.');
    if (!selectedHouseType) return setError('Create a house type in Site Setup first.');
    if (mode === 'forward' && !startDate) return setError('Start date is required.');
    if (mode === 'reverse' && !endDate) return setError('Completion date is required.');

    setSaving(true);
    try {
      const plot = await createPlot({
        plotName: plotName.trim(),
        phase,
        houseTypeId: selectedHouseType.id,
        startDate,
        endDate,
        mode,
        jurisdiction: settings.jurisdiction,
        foundationType: settings.defaultFoundationType,
        constructionMethod: buildRoute === 'Timber Frame' ? 'timberFrame' : 'traditional',
      });
      router.replace(`/plot/${plot.id}`);
    } catch (err) {
      console.warn(err);
      setError(err instanceof Error ? err.message : 'Unable to create plot programme.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Programme V2</Text>
        <Text style={styles.title}>New Plot Programme</Text>
        <Text style={styles.subtitle}>Create the plot from the same house-type programme used by Master, 2 Week, Trades and QA.</Text>
      </View>

      <GuideBox
        title="Single programme source"
        items={[
          'Choose a development house type created in Site Setup.',
          'Choose a start date or a completion date; the opposite date is calculated from that house type.',
          'The same live activity dates then drive Master, 2 Week, trade lookaheads and inspections.',
        ]}
      />

      <SectionCard title="Plot details" subtitle={`${siteSetup.siteName} · ${siteSetup.workingWeek}`}>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Field label="Plot number">
          <TextInput value={plotName} onChangeText={setPlotName} placeholder="e.g. 153" style={styles.input} />
        </Field>

        <Field label="Phase">
          <TextInput value={phase} onChangeText={setPhase} placeholder="PH1" style={styles.input} />
        </Field>

        <Field label="House type">
          <View style={styles.chips}>
            {houseTypes.map((houseType) => (
              <Pressable
                key={houseType.id}
                onPress={() => setHouseTypeId(houseType.id)}
                style={[styles.chip, selectedHouseType?.id === houseType.id ? styles.chipActive : null]}
              >
                <Text style={[styles.chipText, selectedHouseType?.id === houseType.id ? styles.chipTextActive : null]}>
                  {getHouseTypeLabel(houseType)}
                </Text>
              </Pressable>
            ))}
          </View>
        </Field>

        <Field label="Build route">
          <View style={styles.chips}>
            {(['Traditional', 'Timber Frame'] as BuildRoute[]).map((route) => (
              <Pressable key={route} onPress={() => setBuildRoute(route)} style={[styles.chip, buildRoute === route ? styles.chipActive : null]}>
                <Text style={[styles.chipText, buildRoute === route ? styles.chipTextActive : null]}>{route}</Text>
              </Pressable>
            ))}
          </View>
        </Field>

        <Field label="Generate programme from">
          <View style={styles.chips}>
            <Pressable onPress={() => setMode('forward')} style={[styles.chip, mode === 'forward' ? styles.chipActive : null]}>
              <Text style={[styles.chipText, mode === 'forward' ? styles.chipTextActive : null]}>Start date</Text>
            </Pressable>
            <Pressable onPress={() => setMode('reverse')} style={[styles.chip, mode === 'reverse' ? styles.chipActive : null]}>
              <Text style={[styles.chipText, mode === 'reverse' ? styles.chipTextActive : null]}>Completion date</Text>
            </Pressable>
          </View>
        </Field>

        {mode === 'forward' ? (
          <Field label="Plot start date">
            <ProgrammeDatePicker value={startDate} onChange={setStartDate} minimumDate={siteSetup.programmeStartDate} />
          </Field>
        ) : (
          <Field label="Plot completion date">
            <ProgrammeDatePicker value={endDate} onChange={setEndDate} minimumDate={siteSetup.programmeStartDate} />
          </Field>
        )}

        <View style={styles.actions}>
          <Pressable style={[styles.primaryButton, saving ? styles.disabled : null]} disabled={saving} onPress={handleGenerate}>
            <Text style={styles.primaryText}>{saving ? 'Generating…' : 'Generate Programme'}</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
            <Text style={styles.secondaryText}>Cancel</Text>
          </Pressable>
        </View>
      </SectionCard>
    </AppScreen>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text>{children}</View>;
}

const styles = StyleSheet.create({
  header: { gap: 5 },
  eyebrow: { color: '#2563eb', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  title: { color: '#0f172a', fontSize: 30, fontWeight: '900' },
  subtitle: { color: '#64748b', fontSize: 14, lineHeight: 21 },
  field: { gap: 7, marginBottom: 15 },
  label: { color: '#334155', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, color: '#0f172a', backgroundColor: '#fff' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: '#fff' },
  chipActive: { backgroundColor: '#173b5f', borderColor: '#173b5f' },
  chipText: { color: '#64748b', fontSize: 12, fontWeight: '900' },
  chipTextActive: { color: '#fff' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 5 },
  primaryButton: { backgroundColor: '#0f172a', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  primaryText: { color: '#fff', fontWeight: '900' },
  secondaryButton: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff' },
  secondaryText: { color: '#334155', fontWeight: '900' },
  disabled: { opacity: 0.55 },
  error: { color: '#b91c1c', fontWeight: '800', marginBottom: 12 },
});
