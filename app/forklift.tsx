import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppScreen } from '../components/AppScreen';
import { SectionCard } from '../components/SectionCard';
import { useSitePlanner } from '../data/sitePlannerStore';
import { getSortedSitePlots } from '../utils/templateProgramme';

const FORKLIFT_REQUESTS_KEY = 'programme-buddy:forklift-requests:v1';
const PRIORITIES = ['Normal', 'Urgent', 'Critical'] as const;
const STATUSES = ['Queued', 'Accepted', 'Complete'] as const;

type Priority = typeof PRIORITIES[number];
type Status = typeof STATUSES[number];

type ForkliftRequest = {
  id: string;
  trade: string;
  plotOrLocation: string;
  material: string;
  priority: Priority;
  status: Status;
  note: string;
  createdAt: string;
  updatedAt: string;
};

function getInviteCode(siteName: string) {
  return `PB-${siteName.replace(/[^a-z0-9]/gi, '').slice(0, 6).toUpperCase() || 'SITE'}-LIFT`;
}

export default function ForkliftBuddyScreen() {
  const { siteSetup, sitePlots } = useSitePlanner();
  const sortedPlots = useMemo(() => getSortedSitePlots(sitePlots), [sitePlots]);
  const [requests, setRequests] = useState<ForkliftRequest[]>([]);
  const [trade, setTrade] = useState('Brickwork');
  const [plotOrLocation, setPlotOrLocation] = useState('');
  const [material, setMaterial] = useState('');
  const [priority, setPriority] = useState<Priority>('Normal');
  const [note, setNote] = useState('');

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function loadRequests() {
        const stored = await AsyncStorage.getItem(FORKLIFT_REQUESTS_KEY);
        if (active) setRequests(stored ? JSON.parse(stored) : []);
      }
      loadRequests();
      return () => {
        active = false;
      };
    }, []),
  );

  const saveRequests = async (next: ForkliftRequest[]) => {
    setRequests(next);
    await AsyncStorage.setItem(FORKLIFT_REQUESTS_KEY, JSON.stringify(next));
  };

  const addRequest = async () => {
    const cleanLocation = plotOrLocation.trim();
    const cleanMaterial = material.trim();
    if (!cleanLocation || !cleanMaterial) return;
    const now = new Date().toISOString();
    const next: ForkliftRequest = {
      id: `lift-${Date.now()}`,
      trade: trade.trim() || 'Trade',
      plotOrLocation: cleanLocation,
      material: cleanMaterial,
      priority,
      status: 'Queued',
      note: note.trim(),
      createdAt: now,
      updatedAt: now,
    };
    await saveRequests([next, ...requests]);
    setPlotOrLocation('');
    setMaterial('');
    setPriority('Normal');
    setNote('');
  };

  const updateStatus = async (id: string, status: Status) => {
    await saveRequests(requests.map((item) => (item.id === id ? { ...item, status, updatedAt: new Date().toISOString() } : item)));
  };

  const activeQueue = requests.filter((item) => item.status !== 'Complete');
  const completedToday = requests.filter((item) => item.status === 'Complete');
  const inviteCode = getInviteCode(siteSetup.siteName);

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Linked Module</Text>
        <Text style={styles.title}>Forklift Buddy</Text>
        <Text style={styles.subtitle}>Trades request it. Forklift driver queues it. Site manager controls it.</Text>
      </View>

      <SectionCard title="Programme Buddy link" subtitle="This creates the logistics bridge from the site manager control room.">
        <View style={styles.summaryGrid}>
          <InfoBox label="Linked site" value={siteSetup.siteName} />
          <InfoBox label="SM access" value="Free via Programme Buddy" />
          <InfoBox label="Driver access" value="Free" />
          <InfoBox label="Trade access" value="Future £2 site pass" />
          <InfoBox label="Invite code" value={inviteCode} />
        </View>
        <Text style={styles.helper}>Pilot mode: requests are stored locally in Programme Buddy. Live version will need shared accounts, notifications and payment controls.</Text>
      </SectionCard>

      <SectionCard title="Trade request preview" subtitle="This is the request flow trades would use in the separate Forklift Buddy app.">
        <View style={styles.formGrid}>
          <Field label="Trade">
            <TextInput value={trade} onChangeText={setTrade} placeholder="Brickwork" style={styles.input} />
          </Field>
          <Field label="Plot / location">
            <TextInput value={plotOrLocation} onChangeText={setPlotOrLocation} placeholder="Plot 12 / Compound / Block A" style={styles.input} />
          </Field>
          <Field label="Material / movement">
            <TextInput value={material} onChangeText={setMaterial} placeholder="Blocks, scaffold, pallets, skips..." style={styles.input} />
          </Field>
        </View>
        <View style={styles.chipRow}>
          {PRIORITIES.map((item) => (
            <Pressable key={item} style={[styles.chip, priority === item ? styles.chipActive : null]} onPress={() => setPriority(item)}>
              <Text style={[styles.chipText, priority === item ? styles.chipTextActive : null]}>{item}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput value={note} onChangeText={setNote} placeholder="Optional note for the driver" multiline style={[styles.input, styles.noteInput]} />
        <Pressable style={styles.primaryButton} onPress={addRequest}>
          <Text style={styles.primaryButtonText}>Add Lift Request</Text>
        </Pressable>
      </SectionCard>

      <SectionCard title="Site manager queue" subtitle="The SM sees the live queue without chasing around site.">
        <View style={styles.summaryGrid}>
          <InfoBox label="Active queue" value={`${activeQueue.length}`} />
          <InfoBox label="Completed" value={`${completedToday.length}`} />
          <InfoBox label="Known plots" value={`${sortedPlots.length}`} />
        </View>
        {requests.length === 0 ? <Text style={styles.empty}>No forklift requests added yet.</Text> : null}
        {requests.map((request, index) => (
          <View key={request.id} style={[styles.requestRow, request.priority === 'Critical' ? styles.criticalRow : request.priority === 'Urgent' ? styles.urgentRow : null]}>
            <View style={styles.queueNumber}><Text style={styles.queueNumberText}>{index + 1}</Text></View>
            <View style={styles.requestMain}>
              <Text style={styles.requestTitle}>{request.trade} · {request.plotOrLocation}</Text>
              <Text style={styles.requestMeta}>{request.material} · {request.priority} · {request.status}</Text>
              {request.note ? <Text style={styles.requestNote}>{request.note}</Text> : null}
            </View>
            <View style={styles.buttonColumn}>
              {request.status === 'Queued' ? (
                <Pressable style={styles.smallButton} onPress={() => updateStatus(request.id, 'Accepted')}>
                  <Text style={styles.smallButtonText}>Accept</Text>
                </Pressable>
              ) : null}
              {request.status !== 'Complete' ? (
                <Pressable style={styles.completeButton} onPress={() => updateStatus(request.id, 'Complete')}>
                  <Text style={styles.completeButtonText}>Complete</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ))}
      </SectionCard>

      <SectionCard title="Commercial link" subtitle="How this should connect when the separate app is built.">
        <Text style={styles.item}>Programme Buddy creates the site and controls the logistics board.</Text>
        <Text style={styles.item}>Forklift driver gets free access to the live queue for that site.</Text>
        <Text style={styles.item}>Trades use a simple request app so they do not waste time chasing the forklift driver.</Text>
        <Text style={styles.item}>Future trade pass: £2 per site, once backend accounts and payment are connected.</Text>
      </SectionCard>
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

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoBox}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: 4 },
  eyebrow: { color: '#7c3aed', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  title: { color: '#0f172a', fontSize: 32, fontWeight: '900' },
  subtitle: { color: '#64748b', fontSize: 14, lineHeight: 20 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  infoBox: { flex: 1, minWidth: 160, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, padding: 12, backgroundColor: '#ffffff' },
  infoLabel: { color: '#64748b', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  infoValue: { color: '#0f172a', fontSize: 14, fontWeight: '900', marginTop: 4 },
  helper: { color: '#64748b', fontSize: 12, lineHeight: 18, fontWeight: '700' },
  formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' },
  field: { gap: 8, minWidth: 180, flex: 1 },
  label: { color: '#475569', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: '#0f172a', backgroundColor: '#ffffff', fontWeight: '800' },
  noteInput: { minHeight: 74, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#ffffff' },
  chipActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  chipText: { color: '#64748b', fontSize: 12, fontWeight: '900' },
  chipTextActive: { color: '#ffffff' },
  primaryButton: { alignSelf: 'flex-start', backgroundColor: '#0f172a', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  primaryButtonText: { color: '#ffffff', fontWeight: '900' },
  empty: { color: '#64748b', fontWeight: '700' },
  requestRow: { flexDirection: 'row', gap: 10, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, padding: 12, backgroundColor: '#ffffff' },
  urgentRow: { backgroundColor: '#fff7ed', borderColor: '#fdba74' },
  criticalRow: { backgroundColor: '#fff1f2', borderColor: '#fecaca' },
  queueNumber: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#173b5f', alignItems: 'center', justifyContent: 'center' },
  queueNumberText: { color: '#ffffff', fontWeight: '900' },
  requestMain: { flex: 1 },
  requestTitle: { color: '#0f172a', fontWeight: '900', fontSize: 15 },
  requestMeta: { color: '#64748b', fontSize: 12, marginTop: 3, fontWeight: '800' },
  requestNote: { color: '#334155', fontSize: 12, marginTop: 4, lineHeight: 17 },
  buttonColumn: { gap: 6 },
  smallButton: { backgroundColor: '#dbeafe', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  smallButtonText: { color: '#1d4ed8', fontSize: 12, fontWeight: '900' },
  completeButton: { backgroundColor: '#dcfce7', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  completeButtonText: { color: '#166534', fontSize: 12, fontWeight: '900' },
  item: { color: '#0f172a', fontWeight: '700', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12, lineHeight: 20 },
});
