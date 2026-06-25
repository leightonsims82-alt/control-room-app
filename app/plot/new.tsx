import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { GuideBox } from '../../components/GuideBox';
import { houseTypes } from '../../data/demoData';
import { useProgrammeData } from '../../data/programmeStore';
import { BuildType, BedroomSize, RegulationsJurisdiction } from '../../types/models';
import { FoundationType } from '../../types/regulations';

const phases = ['PH1', 'PH2', 'PH3', 'PH4'];
const bedrooms: BedroomSize[] = ['2 Bed', '3 Bed', '4 Bed', '5 Bed', '6 Bed'];
const buildTypes: BuildType[] = ['Traditional', 'Timber Frame', 'Steel Frame'];
const jurisdictions: RegulationsJurisdiction[] = ['England', 'Wales'];
const foundationTypes: FoundationType[] = [
  'Strip foundation',
  'Trench fill foundation',
  'Raft foundation',
  'Piled foundation',
  'Pier and beam foundation',
  'Engineered fill foundation',
  'Ground improvement foundation',
  'Unknown',
];

export default function NewPlotScreen() {
  const { createPlot } = useProgrammeData();
  const [plotName, setPlotName] = useState('');
  const [phase, setPhase] = useState('PH1');
  const [bedroomSize, setBedroomSize] = useState<BedroomSize>('3 Bed');
  const [buildType, setBuildType] = useState<BuildType>('Traditional');
  const [jurisdiction, setJurisdiction] = useState<RegulationsJurisdiction>('England');
  const [foundationType, setFoundationType] = useState<FoundationType>('Unknown');
  const [mode, setMode] = useState<'forward' | 'reverse'>('forward');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const matchingHouseType = useMemo(() => {
    return houseTypes.find((type) => type.bedroomSize === bedroomSize && type.buildType === buildType) ?? houseTypes[0];
  }, [bedroomSize, buildType]);

  const plotReference = plotName.trim() ? `${phase}-${plotName.trim().padStart(2, '0')}` : phase;

  async function handleGenerate() {
    setError('');
    if (!plotName.trim()) {
      setError('Plot name is required.');
      return;
    }
    if (mode === 'forward' && !startDate) {
      setError('Start date is required for forward mode.');
      return;
    }
    if (mode === 'reverse' && !endDate) {
      setError('Completion date is required for reverse mode.');
      return;
    }

    setSaving(true);
    try {
      const plot = await createPlot({
        plotName: plotName.trim(),
        phase,
        houseTypeId: matchingHouseType.id,
        bedroomSize,
        startDate,
        endDate,
        mode,
        jurisdiction,
        foundationType,
      });
      router.replace(`/plot/${plot.id}`);
    } catch (err) {
      console.warn(err);
      setError('Unable to create plot programme. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Plot Setup</Text>
        <Text style={styles.title}>New Plot Programme</Text>
        <Text style={styles.subtitle}>Create a programme with build type, regulation route and foundation checklist route</Text>
      </View>

      <GuideBox
        title="How to Create a Plot"
        items={[
          'Assign plots to a phase such as PH1 or PH2.',
          'Choose bedroom size, build type and regulation route.',
          'Select the foundation type so the right foundation checklist is used.',
          'Generate from a start date or work backwards from completion.',
        ]}
      />

      <View style={styles.card}>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Field label="Plot Name / Number">
          <TextInput value={plotName} onChangeText={setPlotName} placeholder="e.g. 01 or 14" style={styles.input} />
        </Field>

        <Field label="Phase">
          <OptionRow values={phases} value={phase} onChange={setPhase} />
          <Text style={styles.reference}>Reference: {plotReference}</Text>
        </Field>

        <Field label="Number of Bedrooms">
          <OptionRow values={bedrooms} value={bedroomSize} onChange={setBedroomSize} />
        </Field>

        <Field label="Build Type">
          <OptionRow values={buildTypes} value={buildType} onChange={setBuildType} />
          <Text style={styles.helpText}>This controls whether traditional, timber frame or steel frame checklists are used.</Text>
        </Field>

        <Field label="Regulation Route">
          <OptionRow values={jurisdictions} value={jurisdiction} onChange={setJurisdiction} />
          <Text style={styles.helpText}>England and Wales use separate Building Regulations guidance routes.</Text>
        </Field>

        <Field label="Foundation Type">
          <OptionRow values={foundationTypes} value={foundationType} onChange={setFoundationType} />
          <Text style={styles.helpText}>This controls the foundation checklist. Unknown falls back to the general foundation checklist.</Text>
        </Field>

        <Field label="Schedule From">
          <OptionRow values={['forward', 'reverse']} value={mode} onChange={setMode} labels={{ forward: 'Start Date', reverse: 'Completion Date' }} />
          <Text style={styles.helpText}>{mode === 'forward' ? 'Set a start date, the programme will run forward.' : 'Set a completion date, the programme will work backwards.'}</Text>
        </Field>

        {mode === 'forward' ? (
          <Field label="Start Date">
            <TextInput value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" style={styles.input} />
          </Field>
        ) : (
          <Field label="Completion Date">
            <TextInput value={endDate} onChangeText={setEndDate} placeholder="YYYY-MM-DD" style={styles.input} />
          </Field>
        )}

        <View style={styles.actions}>
          <Pressable style={[styles.primaryButton, saving ? styles.disabledButton : null]} onPress={handleGenerate} disabled={saving}>
            <Text style={styles.primaryButtonText}>{saving ? 'Generating...' : 'Generate Programme'}</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </Pressable>
        </View>
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

function OptionRow<T extends string>({ values, value, onChange, labels }: { values: readonly T[]; value: T; onChange: (value: T) => void; labels?: Partial<Record<T, string>> }) {
  return (
    <View style={styles.optionRow}>
      {values.map((item) => {
        const active = item === value;
        return (
          <Pressable key={item} onPress={() => onChange(item)} style={[styles.option, active ? styles.optionActive : null]}>
            <Text style={[styles.optionText, active ? styles.optionTextActive : null]}>{labels?.[item] ?? item}</Text>
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
  reference: { color: '#2563eb', fontSize: 12, fontWeight: '800' },
  helpText: { color: '#94a3b8', fontSize: 12 },
  error: { color: '#dc2626', fontSize: 13, fontWeight: '800' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingTop: 4 },
  primaryButton: { backgroundColor: '#0f172a', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  primaryButtonText: { color: '#ffffff', fontWeight: '900' },
  secondaryButton: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  secondaryButtonText: { color: '#475569', fontWeight: '900' },
  disabledButton: { opacity: 0.6 },
});
