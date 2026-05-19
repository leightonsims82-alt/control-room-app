import { Ionicons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { SectionCard } from '../../components/SectionCard';
import { houseTypes, stageTemplates } from '../../data/demoData';
import { CreatePlotInput, useProgrammeData } from '../../data/programmeStore';
import { PlotProgramme } from '../../types/models';

type FormErrors = Partial<Record<keyof CreatePlotInput, string>>;

const modes: PlotProgramme['mode'][] = ['forward', 'reverse'];

export default function CreatePlotScreen() {
  const { createPlot } = useProgrammeData();
  const [plotName, setPlotName] = useState('');
  const [phase, setPhase] = useState('Phase 1');
  const [houseTypeId, setHouseTypeId] = useState(houseTypes[0]?.id ?? '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [mode, setMode] = useState<PlotProgramme['mode']>('forward');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  const templateSummary = useMemo(
    () => `${stageTemplates.length} stages - ${stageTemplates.reduce((total, stage) => total + stage.durationDays, 0)} planned days`,
    [],
  );

  async function handleCreatePlot() {
    const input = {
      plotName: plotName.trim(),
      phase: phase.trim(),
      houseTypeId,
      startDate: startDate.trim(),
      endDate: endDate.trim(),
      mode,
    };
    const nextErrors = validatePlot(input);

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSaving(true);
    const plot = await createPlot(input);
    setIsSaving(false);
    router.replace(`/plot/${plot.id}`);
  }

  return (
    <AppScreen>
      <Link href="/(tabs)/plots" style={styles.backLink}>Back to plots</Link>

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Create Plot</Text>
          <Text style={styles.subtitle}>Set up a local plot programme and generate the default stages</Text>
        </View>
        <View style={styles.templateBadge}>
          <Ionicons name="layers-outline" size={18} color="#2563eb" />
          <Text style={styles.templateBadgeText}>{templateSummary}</Text>
        </View>
      </View>

      <SectionCard title="Plot setup" subtitle="Core plot programme details">
        <View style={styles.formGrid}>
          <FormField label="Plot name" value={plotName} onChangeText={setPlotName} placeholder="Plot 24" error={errors.plotName} />
          <FormField label="Phase" value={phase} onChangeText={setPhase} placeholder="Phase 1" error={errors.phase} />
          <FormField label="Start date" value={startDate} onChangeText={setStartDate} placeholder="2026-06-01" error={errors.startDate} />
          <FormField label="End date" value={endDate} onChangeText={setEndDate} placeholder="2026-10-16" error={errors.endDate} />
        </View>
      </SectionCard>

      <SectionCard title="House type" subtitle="Choose the house type for this plot">
        <View style={styles.optionGrid}>
          {houseTypes.map((houseType) => {
            const isSelected = houseType.id === houseTypeId;

            return (
              <Pressable
                key={houseType.id}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => setHouseTypeId(houseType.id)}
                style={[styles.houseTypeOption, isSelected ? styles.optionSelected : null]}
              >
                <Text style={[styles.optionTitle, isSelected ? styles.optionTitleSelected : null]}>{houseType.name}</Text>
                <Text style={styles.optionText}>{houseType.bedroomSize} - {houseType.buildType}</Text>
              </Pressable>
            );
          })}
        </View>
        {errors.houseTypeId ? <Text style={styles.errorText}>{errors.houseTypeId}</Text> : null}
      </SectionCard>

      <SectionCard title="Programme mode" subtitle="Match the Base44 setup terminology for planning direction">
        <View style={styles.modeRow}>
          {modes.map((item) => {
            const isSelected = item === mode;

            return (
              <Pressable
                key={item}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => setMode(item)}
                style={[styles.modeButton, isSelected ? styles.modeButtonSelected : null]}
              >
                <Text style={[styles.modeButtonText, isSelected ? styles.modeButtonTextSelected : null]}>{item === 'forward' ? 'Forward' : 'Reverse'}</Text>
              </Pressable>
            );
          })}
        </View>
      </SectionCard>

      <SectionCard title="Default stage template" subtitle="Stages generated when this plot is created">
        {stageTemplates.map((stage) => (
          <View key={stage.id} style={styles.templateRow}>
            <View style={styles.orderBadge}>
              <Text style={styles.orderText}>{stage.order}</Text>
            </View>
            <View style={styles.templateMain}>
              <Text style={styles.templateTitle}>{stage.name}</Text>
              <Text style={styles.templateText}>{stage.trade} - {stage.durationDays} days</Text>
            </View>
          </View>
        ))}
      </SectionCard>

      <View style={styles.actionRow}>
        <Link href="/(tabs)/plots" asChild>
          <Pressable style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </Pressable>
        </Link>
        <Pressable disabled={isSaving} onPress={handleCreatePlot} style={[styles.primaryButton, isSaving ? styles.primaryButtonDisabled : null]}>
          <Ionicons name="checkmark-circle-outline" size={18} color="#ffffff" />
          <Text style={styles.primaryButtonText}>{isSaving ? 'Creating...' : 'Create Plot'}</Text>
        </Pressable>
      </View>
    </AppScreen>
  );
}

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  error?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        autoCapitalize="words"
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        style={[styles.input, error ? styles.inputError : null]}
        value={value}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

function validatePlot(input: CreatePlotInput): FormErrors {
  const errors: FormErrors = {};

  if (!input.plotName) errors.plotName = 'Plot name is required.';
  if (!input.phase) errors.phase = 'Phase is required.';
  if (!input.houseTypeId) errors.houseTypeId = 'House type is required.';
  if (!isIsoDate(input.startDate)) errors.startDate = 'Use YYYY-MM-DD.';
  if (!isIsoDate(input.endDate)) errors.endDate = 'Use YYYY-MM-DD.';
  if (isIsoDate(input.startDate) && isIsoDate(input.endDate) && input.endDate < input.startDate) {
    errors.endDate = 'End date must be after start date.';
  }

  return errors;
}

function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const styles = StyleSheet.create({
  backLink: { color: '#2563eb', fontWeight: '900', fontSize: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap' },
  title: { color: '#0f172a', fontSize: 30, fontWeight: '900' },
  subtitle: { color: '#64748b', fontSize: 14, marginTop: 4 },
  templateBadge: { backgroundColor: '#eff6ff', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', gap: 8, alignItems: 'center' },
  templateBadgeText: { color: '#2563eb', fontSize: 12, fontWeight: '900' },
  formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  field: { flex: 1, minWidth: 220, gap: 6 },
  fieldLabel: { color: '#94a3b8', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  input: { backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: 12, borderWidth: 1, color: '#0f172a', fontSize: 15, fontWeight: '800', paddingHorizontal: 12, paddingVertical: 11 },
  inputError: { borderColor: '#ef4444', backgroundColor: '#fff7f7' },
  errorText: { color: '#b91c1c', fontSize: 12, fontWeight: '800' },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  houseTypeOption: { flex: 1, minWidth: 180, borderColor: '#e2e8f0', borderRadius: 14, borderWidth: 1, padding: 14, backgroundColor: '#ffffff', gap: 4 },
  optionSelected: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  optionTitle: { color: '#0f172a', fontWeight: '900', fontSize: 16 },
  optionTitleSelected: { color: '#1d4ed8' },
  optionText: { color: '#64748b', fontSize: 12, fontWeight: '700' },
  modeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  modeButton: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: '#ffffff' },
  modeButtonSelected: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  modeButtonText: { color: '#64748b', fontWeight: '900' },
  modeButtonTextSelected: { color: '#2563eb' },
  templateRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },
  orderBadge: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  orderText: { color: '#2563eb', fontWeight: '900' },
  templateMain: { flex: 1 },
  templateTitle: { color: '#0f172a', fontWeight: '900' },
  templateText: { color: '#64748b', fontSize: 12, marginTop: 3 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 10 },
  secondaryButton: { borderRadius: 999, borderWidth: 1, borderColor: '#cbd5e1', paddingHorizontal: 16, paddingVertical: 11, backgroundColor: '#ffffff' },
  secondaryButtonText: { color: '#475569', fontWeight: '900' },
  primaryButton: { backgroundColor: '#2563eb', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 11, flexDirection: 'row', gap: 8, alignItems: 'center' },
  primaryButtonDisabled: { opacity: 0.7 },
  primaryButtonText: { color: '#ffffff', fontWeight: '900' },
});
