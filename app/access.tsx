import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../components/AppScreen';
import { SectionCard } from '../components/SectionCard';
import { CLOSED_TESTING_ACCESS_COPY, canUseAppWithoutPayment, getAccessModeLabel } from '../utils/accessControl';

const readinessItems = [
  { title: 'User accounts', status: 'Live build required', detail: 'Email login, user profile and account status will be added when backend work starts.' },
  { title: 'Backend database', status: 'Live build required', detail: 'Sites, plots, inspections, members, billing status and storage allowances will move from local device data to server data.' },
  { title: 'Payment system', status: 'Live build required', detail: 'Google Play Billing, Apple payments and/or web billing can be connected after closed testing.' },
  { title: 'Server-side access control', status: 'Live build required', detail: 'Your site acquaintances will be allowed into your live site only and blocked from creating their own site for free.' },
  { title: 'Cloud Evidence Backup', status: 'Future add-on', detail: 'Photo backup and evidence sync can be sold later as an optional paid storage add-on.' },
  { title: 'Proper exports', status: 'Upgrade required', detail: 'CSV text exists now. Excel/PDF file generation should be added before paid public release.' },
  { title: 'Admin area', status: 'Live build required', detail: 'You will need controls to view users, subscriptions, acquaintances, storage add-ons and support issues.' },
  { title: 'Legal/commercial docs', status: 'Required before sale', detail: 'Privacy policy, terms, subscription wording, local storage warning and support contact must be ready before public launch.' },
  { title: 'Play Store polish', status: 'Closed testing task', detail: 'App icon, splash screen, screenshots, descriptions, privacy URL and tester list are required for store testing.' },
];

const testingChecklist = [
  'Create a site and save setup details',
  'Add plots, build order and house types',
  'Open the master programme',
  'Use rolling 2-week programme in landscape',
  'Drag fixes in trade programmes',
  'Complete QA inspections',
  'Attach photo evidence',
  'Check Plot QA Story',
  'Copy/export weekly report and CSV outputs',
  'Close and reopen app to confirm data still loads',
];

export default function AccessScreen() {
  const freeAccess = canUseAppWithoutPayment();

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Access & Launch Readiness</Text>
        <Text style={styles.title}>{getAccessModeLabel()}</Text>
        <Text style={styles.subtitle}>This keeps the app fully usable during closed testing while clearly showing what still needs to be built before the paid live version.</Text>
      </View>

      <SectionCard title="Current access mode" subtitle="Payment is deliberately switched off for the prototype and closed testing period.">
        <View style={freeAccess ? styles.accessBox : styles.lockedBox}>
          <Ionicons name={freeAccess ? 'lock-open-outline' : 'lock-closed-outline'} size={28} color={freeAccess ? '#166534' : '#dc2626'} />
          <View style={styles.accessMain}>
            <Text style={styles.accessTitle}>{CLOSED_TESTING_ACCESS_COPY.title}</Text>
            <Text style={styles.accessText}>{CLOSED_TESTING_ACCESS_COPY.summary}</Text>
            <Text style={styles.accessWarning}>{CLOSED_TESTING_ACCESS_COPY.warning}</Text>
          </View>
          <View style={styles.accessBadge}>
            <Text style={styles.accessBadgeText}>{CLOSED_TESTING_ACCESS_COPY.badge}</Text>
          </View>
        </View>
      </SectionCard>

      <SectionCard title="What is missing for the live paid version" subtitle="These items are now tracked inside the app so the prototype does not lose sight of the commercial build requirements.">
        {readinessItems.map((item) => (
          <View key={item.title} style={styles.readinessRow}>
            <View style={styles.readinessIcon}>
              <Ionicons name="construct-outline" size={18} color="#2563eb" />
            </View>
            <View style={styles.readinessMain}>
              <Text style={styles.readinessTitle}>{item.title}</Text>
              <Text style={styles.readinessDetail}>{item.detail}</Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{item.status}</Text>
            </View>
          </View>
        ))}
      </SectionCard>

      <SectionCard title="Closed testing checklist" subtitle="Use this as the working test route before worrying about domains, browser hosting, payments or storage subscriptions.">
        {testingChecklist.map((item, index) => (
          <View key={item} style={styles.checkRow}>
            <Text style={styles.checkNumber}>{index + 1}</Text>
            <Text style={styles.checkText}>{item}</Text>
          </View>
        ))}
      </SectionCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 4 },
  eyebrow: { color: '#2563eb', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  title: { color: '#0f172a', fontSize: 30, fontWeight: '900' },
  subtitle: { color: '#64748b', fontSize: 14, lineHeight: 20 },
  accessBox: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#86efac', borderRadius: 16, padding: 14, flexWrap: 'wrap' },
  lockedBox: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: '#fff1f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 16, padding: 14, flexWrap: 'wrap' },
  accessMain: { flex: 1, minWidth: 230 },
  accessTitle: { color: '#0f172a', fontSize: 17, fontWeight: '900' },
  accessText: { color: '#166534', fontSize: 13, lineHeight: 19, marginTop: 4, fontWeight: '800' },
  accessWarning: { color: '#92400e', fontSize: 12, lineHeight: 18, marginTop: 5, fontWeight: '700' },
  accessBadge: { backgroundColor: '#dcfce7', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  accessBadgeText: { color: '#166534', fontSize: 12, fontWeight: '900' },
  readinessRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#ffffff', borderRadius: 14, padding: 12, flexWrap: 'wrap' },
  readinessIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  readinessMain: { flex: 1, minWidth: 230 },
  readinessTitle: { color: '#0f172a', fontSize: 15, fontWeight: '900' },
  readinessDetail: { color: '#64748b', fontSize: 12, lineHeight: 18, marginTop: 3, fontWeight: '700' },
  statusBadge: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  statusText: { color: '#475569', fontSize: 11, fontWeight: '900' },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10 },
  checkNumber: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#173b5f', color: '#ffffff', textAlign: 'center', lineHeight: 30, fontWeight: '900' },
  checkText: { flex: 1, color: '#0f172a', fontWeight: '800', lineHeight: 20 },
});
