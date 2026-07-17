import { Link, router } from 'expo-router';
import { Dispatch, ReactNode, SetStateAction, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { GuideBox } from '../../components/GuideBox';
import { houseTypes } from '../../data/demoData';
import { useProgrammeData } from '../../data/programmeStore';
import { useSiteSettings } from '../../data/siteSettingsStore';
import { BuildType, BedroomSize } from '../../types/models';

const phases = ['PH1', 'PH2', 'PH3', 'PH4'];
const bedrooms: BedroomSize[] = ['2 Bed', '3 Bed', '4 Bed', '5 Bed', '6 Bed'];
const buildTypes: BuildType[] = ['Traditional', 'Timber Frame', 'Steel Frame'];

export default function NewPlotScreen() {
  const { createPlot } = useProgrammeData();
  const { settings } = useSiteSettings();
  const [plotName, setPlotName] = useState('');
  const [phase, setPhase] = useState('PH1');
  const [bedroomSize, setBedroomSize] = useState<BedroomSize>('3 Bed');
  const [buildType, setBuildType] = useState<BuildType>('Traditional');
  const [mode, setMode] = useState<'forward' | 'reverse'>('forward');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const matchingHouseType = useMemo(() => houseTypes.find((type) => type.bedroomSize === bedroomSize && type.buildType === buildType) ?? houseTypes[0], [bedroomSize, buildType]);
  const plotReference = plotName.trim() ? `${phase}-${plotName.trim().padStart(2, '0')}` : phase;

  async function handleGenerate() {
    setError('');
    if (!plotName.trim()) { setError('Plot name is required.'); return; }
    if (mode === 'forward' && !startDate) { setError('Start date is required for forward mode.'); return; }
    if (mode === 'reverse' && !endDate) { setError('Completion date is required for reverse mode.'); return; }
    setSaving(true);
    try {
      const plot = await createPlot({ plotName: plotName.trim(), phase, houseTypeId: matchingHouseType.id, bedroomSize, startDate, endDate, mode, jurisdiction: settings.jurisdiction, foundationType: settings.defaultFoundationType });
      router.replace(`/plot/${plot.id}`);
    } catch (err) {
      console.warn(err);
      setError('Unable to create plot programme. Please try again.');
    } finally { setSaving(false); }
  }

  return (
    <AppScreen>
      <View style={styles.header}><Text style={styles.eyebrow}>Plot Setup</Text><Text style={styles.title}>New Plot Programme</Text><Text style={styles.subtitle}>Create a programme from site defaults, build type and schedule dates</Text></View>
      <GuideBox title="How to Create a Plot" items={['Assign plots to a phase such as PH1 or PH2.', 'Choose bedroom size and build type for the programme and checklists.', 'Regulation route and foundation type are inherited from Site Setup.', 'Generate from a start date or work backwards from completion.']} />
      <View style={styles.siteRouteBox}><View style={styles.routeTextWrap}><Text style={styles.routeTitle}>Inherited from Site Setup</Text><Text style={styles.routeText}>{settings.siteName} · {settings.jurisdiction} Building Regulations · {settings.defaultFoundationType}</Text></View><Link href="/site/setup" style={styles.routeLink}>Edit site setup</Link></View>
      <View style={styles.card}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Field label="Plot Name / Number"><TextInput value={plotName} onChangeText={setPlotName} placeholder="e.g. 01 or 14" style={styles.input} /></Field>
        <Field label="Phase"><OptionRow values={phases} value={phase} onChange={setPhase} /><Text style={styles.reference}>Reference: {plotReference}</Text></Field>
        <Field label="Number of Bedrooms"><OptionRow values={bedrooms} value={bedroomSize} onChange={setBedroomSize} /></Field>
        <Field label="Build Type"><OptionRow values={buildTypes} value={buildType} onChange={setBuildType} /><Text style={styles.helpText}>This controls whether traditional, timber frame or steel frame checklists are used.</Text></Field>
        <Field label="Schedule From"><OptionRow values={['forward', 'reverse'] as const} value={mode} onChange={setMode} labels={{ forward: 'Start Date', reverse: 'Completion Date' }} /><Text style={styles.helpText}>{mode === 'forward' ? 'Set a start date, the programme will run forward.' : 'Set a completion date, the programme will work backwards.'}</Text></Field>
        {mode === 'forward' ? <Field label="Start Date"><TextInput value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" style={styles.input} /></Field> : <Field label="Completion Date"><TextInput value={endDate} onChangeText={setEndDate} placeholder="YYYY-MM-DD" style={styles.input} /></Field>}
        <View style={styles.actions}><Pressable style={[styles.primaryButton, saving ? styles.disabledButton : null]} onPress={handleGenerate} disabled={saving}><Text style={styles.primaryButtonText}>{saving ? 'Generating...' : 'Generate Programme'}</Text></Pressable><Pressable style={styles.secondaryButton} onPress={() => router.back()}><Text style={styles.secondaryButtonText}>Cancel</Text></Pressable></View>
      </View>
    </AppScreen>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) { return <View style={styles.field}><Text style={styles.label}>{label}</Text>{children}</View>; }
function OptionRow<T extends string>({ values, value, onChange, labels }: { values: readonly T[]; value: T; onChange: Dispatch<SetStateAction<T>>; labels?: Partial<Record<T, string>> }) {
  return <View style={styles.optionRow}>{values.map((item) => { const active = item === value; return <Pressable key={item} onPress={() => onChange(item)} style={[styles.option, active ? styles.optionActive : null]}><Text style={[styles.optionText, active ? styles.optionTextActive : null]}>{labels?.[item] ?? item}</Text></Pressable>; })}</View>;
}

const styles = StyleSheet.create({
  header: { gap: 4 }, eyebrow: { color: '#2563eb', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' }, title: { color: '#0f172a', fontSize: 30, fontWeight: '900' }, subtitle: { color: '#64748b', fontSize: 14 }, siteRouteBox: { backgroundColor: '#eff6ff', borderRadius: 16, borderWidth: 1, borderColor: '#bfdbfe', padding: 14, gap: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }, routeTextWrap: { flex: 1, minWidth: 220 }, routeTitle: { color: '#1d4ed8', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' }, routeText: { color: '#0f172a', fontWeight: '800', marginTop: 3 }, routeLink: { color: '#2563eb', fontWeight: '900' }, card: { backgroundColor: '#ffffff', borderRadius: 18, borderWidth: 1, borderColor: '#e2e8f0', padding: 18, gap: 16 }, field: { gap: 8 }, label: { color: '#475569', fontSize: 13, fontWeight: '900' }, input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: '#0f172a', backgroundColor: '#ffffff' }, optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, option: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: '#ffffff' }, optionActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' }, optionText: { color: '#475569', fontSize: 13, fontWeight: '800' }, optionTextActive: { color: '#ffffff' }, reference: { color: '#2563eb', fontSize: 12, fontWeight: '800' }, helpText: { color: '#94a3b8', fontSize: 12 }, error: { color: '#dc2626', fontSize: 13, fontWeight: '800' }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingTop: 4 }, primaryButton: { backgroundColor: '#0f172a', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 }, primaryButtonText: { color: '#ffffff', fontWeight: '900' }, secondaryButton: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 }, secondaryButtonText: { color: '#475569', fontWeight: '900' }, disabledButton: { opacity: 0.6 },
});
