import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppScreen } from '../components/AppScreen';
import { useProgrammeData } from '../data/programmeStore';
import { useSitePlanner } from '../data/sitePlannerStore';
import { siteprogTheme } from '../theme/siteprogTheme';
import { buildCanonicalQaPlots, canonicalEvidenceBelongsToPlot } from '../utils/canonicalQaProgramme';
import { parseProgrammeDate } from '../utils/programmeDates';

const HANDOVER_KEY = 'siteprog:handover-readiness:v1';

const DEFAULT_ITEMS = [
  'Pre-handover QA complete',
  'All quality actions closed',
  'Utilities live and meters checked',
  'Certificates and commissioning complete',
  'Final clean complete',
  'External works and access complete',
  'Customer demonstration ready',
  'Keys, manuals and handover pack ready',
];

type ChecklistState = Record<string, boolean>;
type HandoverRecord = {
  plotId: string;
  items: ChecklistState;
  notes: string;
  updatedAt: string;
};

type HandoverPlot = {
  id: string;
  name: string;
  endDate?: string;
};

function daysUntil(date?: string) {
  if (!date) return undefined;
  const target = parseProgrammeDate(date) ?? new Date(`${date}T00:00:00`);
  if (Number.isNaN(target.getTime())) return undefined;
  const now = new Date();
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

export default function HandoverScreen() {
  const { plotProgrammes: legacyPlots, defects } = useProgrammeData();
  const { sitePlots, plotTemplates, siteSetup } = useSitePlanner();
  const [records, setRecords] = useState<HandoverRecord[]>([]);
  const recordsRef = useRef<HandoverRecord[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [notesDraft, setNotesDraft] = useState('');

  const canonicalPlots = useMemo(
    () => buildCanonicalQaPlots(sitePlots, plotTemplates, siteSetup, legacyPlots),
    [sitePlots, plotTemplates, siteSetup, legacyPlots],
  );
  const plots = useMemo<HandoverPlot[]>(
    () => canonicalPlots.map((plot) => ({ id: plot.id, name: plot.plotName, endDate: plot.plotCompletionDate })),
    [canonicalPlots],
  );

  useEffect(() => {
    async function load() {
      const stored = await AsyncStorage.getItem(HANDOVER_KEY);
      const loaded = stored ? (JSON.parse(stored) as HandoverRecord[]) : [];
      recordsRef.current = loaded;
      setRecords(loaded);
    }
    load();
  }, []);

  useEffect(() => {
    if (!selectedId && plots[0]) setSelectedId(plots[0].id);
  }, [plots, selectedId]);

  const selected = plots.find((plot) => plot.id === selectedId) ?? plots[0];
  const record = selected ? records.find((item) => item.plotId === selected.id) : undefined;
  const selectedCanonicalPlot = selected ? canonicalPlots.find((plot) => plot.id === selected.id) : undefined;

  useEffect(() => {
    setNotesDraft(record?.notes ?? '');
  }, [selected?.id, record?.notes]);
  const checklist = record?.items ?? {};
  const completed = DEFAULT_ITEMS.filter((item) => checklist[item]).length;
  const openDefects = selectedCanonicalPlot
    ? defects.filter((item) => canonicalEvidenceBelongsToPlot(selectedCanonicalPlot, item.plotProgrammeId) && item.status !== 'Verified fixed')
    : [];
  const dueIn = daysUntil(selected?.endDate);
  const ready = completed === DEFAULT_ITEMS.length && openDefects.length === 0;
  const atRisk = !ready && (completed >= DEFAULT_ITEMS.length / 2 || (dueIn !== undefined && dueIn <= 21));
  const readiness = ready ? 'Ready' : atRisk ? 'At Risk' : 'Not Ready';

  async function save(next: HandoverRecord) {
    const current = recordsRef.current;
    const exists = current.some((item) => item.plotId === next.plotId);
    const nextRecords = exists ? current.map((item) => (item.plotId === next.plotId ? next : item)) : [...current, next];
    recordsRef.current = nextRecords;
    setRecords(nextRecords);
    await AsyncStorage.setItem(HANDOVER_KEY, JSON.stringify(nextRecords));
  }

  async function toggle(item: string) {
    if (!selected) return;
    await save({
      plotId: selected.id,
      items: { ...checklist, [item]: !checklist[item] },
      notes: record?.notes ?? '',
      updatedAt: new Date().toISOString(),
    });
  }

  async function updateNotes(notes: string) {
    if (!selected) return;
    await save({
      plotId: selected.id,
      items: checklist,
      notes,
      updatedAt: new Date().toISOString(),
    });
  }

  const readyCount = plots.filter((plot) => {
    const saved = records.find((recordItem) => recordItem.plotId === plot.id);
    const itemCount = DEFAULT_ITEMS.filter((item) => saved?.items[item]).length;
    const canonical = canonicalPlots.find((item) => item.id === plot.id);
    const plotOpenDefects = canonical
      ? defects.filter((item) => canonicalEvidenceBelongsToPlot(canonical, item.plotProgrammeId) && item.status !== 'Verified fixed')
      : [];
    return itemCount === DEFAULT_ITEMS.length && plotOpenDefects.length === 0;
  }).length;

  return (
    <AppScreen>
      <View style={styles.header}>
        <View style={styles.headerIcon}><Ionicons name="key-outline" size={24} color={siteprogTheme.colors.blue} /></View>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Handover control</Text>
          <Text style={styles.title}>Plot readiness</Text>
          <Text style={styles.subtitle}>One live checklist for QA, services, documents, cleaning and customer handover readiness.</Text>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <Summary label="Plots" value={plots.length} />
        <Summary label="Ready" value={readyCount} good />
        <Summary label="Not ready" value={Math.max(plots.length - readyCount, 0)} warning={plots.length - readyCount > 0} />
      </View>

      {plots.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>No plots available</Text>
          <Text style={styles.cardText}>Add plots in Site Setup or Plot Setup first.</Text>
          <Link href="/site/setup" style={styles.link}>Open Site Setup</Link>
        </View>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.plotChips}>
              {plots.map((plot) => (
                <Pressable key={plot.id} onPress={() => setSelectedId(plot.id)} style={[styles.plotChip, selected?.id === plot.id && styles.plotChipActive]}>
                  <Text style={[styles.plotChipText, selected?.id === plot.id && styles.plotChipTextActive]}>{plot.name}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <View style={styles.hero}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroLabel}>Selected plot</Text>
              <Text style={styles.heroTitle}>{selected?.name}</Text>
              <Text style={styles.heroMeta}>
                {selected?.endDate ? `Target handover ${selected.endDate}` : 'Target handover date not set'}
                {dueIn !== undefined ? ` · ${dueIn >= 0 ? `${dueIn} days to go` : `${Math.abs(dueIn)} days overdue`}` : ''}
              </Text>
            </View>
            <View style={[styles.statusPill, ready ? styles.readyPill : atRisk ? styles.riskPill : styles.notReadyPill]}>
              <Text style={[styles.statusText, ready ? styles.readyText : atRisk ? styles.riskText : styles.notReadyText]}>{readiness}</Text>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardTitle}>Handover checklist</Text>
                <Text style={styles.cardText}>{completed}/{DEFAULT_ITEMS.length} complete</Text>
              </View>
              {openDefects.length ? (
                <Link href="/(tabs)/qa" style={styles.riskLink}>{openDefects.length} open QA action{openDefects.length === 1 ? '' : 's'}</Link>
              ) : <Text style={styles.goodText}>QA clear ✓</Text>}
            </View>

            {DEFAULT_ITEMS.map((item) => {
              const checked = Boolean(checklist[item]);
              return (
                <Pressable key={item} onPress={() => toggle(item)} style={styles.checkRow}>
                  <View style={[styles.checkBox, checked && styles.checkBoxDone]}>
                    {checked ? <Ionicons name="checkmark" size={16} color="#ffffff" /> : null}
                  </View>
                  <Text style={[styles.checkText, checked && styles.checkTextDone]}>{item}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Handover notes</Text>
            <TextInput
              style={styles.notes}
              value={notesDraft}
              onChangeText={setNotesDraft}
              multiline
              placeholder="Outstanding items, customer demo notes, certificates, keys or access issues"
              onBlur={() => updateNotes(notesDraft)}
            />
          </View>

          <View style={styles.actionRow}>
            <Link href="/(tabs)/qa" asChild><Pressable style={styles.secondaryButton}><Text style={styles.secondaryText}>Open QA</Text></Pressable></Link>
            <Link href="/(tabs)/trades" asChild><Pressable style={styles.secondaryButton}><Text style={styles.secondaryText}>Open Trades</Text></Pressable></Link>
            <Link href="/(tabs)/two-week" asChild><Pressable style={styles.primaryButton}><Text style={styles.primaryText}>Open 2 Week Programme</Text></Pressable></Link>
          </View>
        </>
      )}
    </AppScreen>
  );
}

function Summary({ label, value, good, warning }: { label: string; value: number; good?: boolean; warning?: boolean }) {
  return (
    <View style={[styles.summary, good ? styles.summaryGood : warning ? styles.summaryWarning : null]}>
      <Text style={[styles.summaryValue, good ? styles.summaryValueGood : warning ? styles.summaryValueWarning : null]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', gap: 14, alignItems: 'center', flexWrap: 'wrap' },
  headerIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: siteprogTheme.colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, minWidth: 240 },
  eyebrow: { color: siteprogTheme.colors.blueDark, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  title: { color: siteprogTheme.colors.text, fontSize: 30, fontWeight: '900', marginTop: 2 },
  subtitle: { color: siteprogTheme.colors.muted, fontSize: 14, lineHeight: 20, marginTop: 4 },
  summaryRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  summary: { flex: 1, minWidth: 130, backgroundColor: '#ffffff', borderWidth: 1, borderColor: siteprogTheme.colors.border, borderRadius: 14, padding: 14 },
  summaryGood: { backgroundColor: siteprogTheme.colors.successSoft, borderColor: '#BFEBD8' },
  summaryWarning: { backgroundColor: siteprogTheme.colors.warningSoft, borderColor: '#F6D69A' },
  summaryValue: { color: siteprogTheme.colors.text, fontSize: 24, fontWeight: '900' },
  summaryValueGood: { color: '#087A52' },
  summaryValueWarning: { color: siteprogTheme.colors.warning },
  summaryLabel: { color: siteprogTheme.colors.muted, fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  plotChips: { flexDirection: 'row', gap: 8 },
  plotChip: { borderRadius: 999, borderWidth: 1, borderColor: '#CDD5E1', backgroundColor: '#ffffff', paddingHorizontal: 12, paddingVertical: 8 },
  plotChipActive: { backgroundColor: siteprogTheme.colors.navy, borderColor: siteprogTheme.colors.navy },
  plotChipText: { color: siteprogTheme.colors.muted, fontWeight: '900', fontSize: 12 },
  plotChipTextActive: { color: '#ffffff' },
  hero: { backgroundColor: siteprogTheme.colors.navy, borderRadius: 18, padding: 18, flexDirection: 'row', gap: 12, alignItems: 'center', flexWrap: 'wrap' },
  heroLabel: { color: '#AAB6DA', fontSize: 10, textTransform: 'uppercase', fontWeight: '900' },
  heroTitle: { color: '#ffffff', fontSize: 24, fontWeight: '900', marginTop: 3 },
  heroMeta: { color: '#D6DDF0', fontSize: 12, marginTop: 4 },
  statusPill: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  readyPill: { backgroundColor: '#EAF8F2', borderColor: '#BFEBD8' },
  riskPill: { backgroundColor: '#FFF7E6', borderColor: '#F6D69A' },
  notReadyPill: { backgroundColor: '#FFF0EF', borderColor: '#F5C6C2' },
  statusText: { fontWeight: '900', fontSize: 12 },
  readyText: { color: '#087A52' },
  riskText: { color: siteprogTheme.colors.warning },
  notReadyText: { color: siteprogTheme.colors.danger },
  card: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: siteprogTheme.colors.border, borderRadius: 16, padding: 16, gap: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' },
  cardTitle: { color: siteprogTheme.colors.text, fontSize: 18, fontWeight: '900' },
  cardText: { color: siteprogTheme.colors.muted, fontSize: 12, marginTop: 3 },
  link: { color: siteprogTheme.colors.blueDark, fontWeight: '900', marginTop: 4 },
  riskLink: { color: siteprogTheme.colors.danger, fontWeight: '900', fontSize: 12 },
  goodText: { color: '#087A52', fontWeight: '900', fontSize: 12 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: '#EEF0F4', paddingTop: 10 },
  checkBox: { width: 24, height: 24, borderRadius: 7, borderWidth: 1, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' },
  checkBoxDone: { backgroundColor: siteprogTheme.colors.success, borderColor: siteprogTheme.colors.success },
  checkText: { flex: 1, color: siteprogTheme.colors.text, fontWeight: '800', fontSize: 13 },
  checkTextDone: { color: '#667085' },
  notes: { minHeight: 110, textAlignVertical: 'top', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: siteprogTheme.colors.text },
  actionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  primaryButton: { backgroundColor: siteprogTheme.colors.navy, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  primaryText: { color: '#ffffff', fontWeight: '900', fontSize: 12 },
  secondaryButton: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: siteprogTheme.colors.border, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  secondaryText: { color: siteprogTheme.colors.blueDark, fontWeight: '900', fontSize: 12 },
});
