import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { AppScreen } from '../components/AppScreen';
import { SectionCard } from '../components/SectionCard';
import { canUseAppWithoutPayment } from '../utils/accessControl';

const legalItems = [
  { title: 'Privacy Policy', detail: 'Required before public release. Must explain account data, project data, photos, device storage, cloud storage add-ons and support contact.' },
  { title: 'Terms of Use', detail: 'Required before public release. Must explain acceptable use, subscriptions, account access, cancellation and liability limits.' },
  { title: 'Local Storage Warning', detail: 'Required now. Photos and evidence are stored on the device during testing. Users should export or back up records regularly.' },
  { title: 'Subscription Terms', detail: 'Required before charging. Must explain base plan, additional manager seats, storage add-ons and renewal terms.' },
  { title: 'Support Contact', detail: 'Required before closed testing. Give testers a clear email address or form for issues and feedback.' },
];

const storeItems = [
  'App icon and splash screen',
  'Play Store short description',
  'Play Store full description',
  'Screenshots for phone and tablet',
  'Privacy policy URL',
  'Closed testing tester list',
  'Support email address',
  'Data safety answers',
];

const backendItems = [
  { title: 'Accounts', detail: 'Users sign in with email and their access follows them across devices and browser later.' },
  { title: 'Sites and members', detail: 'Your site acquaintances get access to your live site only and cannot create another site for free.' },
  { title: 'Payments', detail: 'Google Play, Apple and/or web billing can create access entitlements after payment.' },
  { title: 'Storage add-ons', detail: 'Cloud Evidence Backup can be sold later with allowance, usage tracking and mark-up pricing.' },
  { title: 'Admin controls', detail: 'You can revoke access, view users, manage seats, support testers and control launch settings.' },
];

export default function LaunchScreen() {
  const freeAccess = canUseAppWithoutPayment();

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Live Launch Plan</Text>
        <Text style={styles.title}>Commercial readiness</Text>
        <Text style={styles.subtitle}>These are the live-version items being tracked while the app remains open for closed testing.</Text>
      </View>

      <SectionCard title="Access status" subtitle="For now the app must stay usable without taking payment.">
        <View style={styles.accessBox}>
          <Ionicons name={freeAccess ? 'lock-open-outline' : 'lock-closed-outline'} size={28} color={freeAccess ? '#166534' : '#dc2626'} />
          <View style={styles.accessMain}>
            <Text style={styles.accessTitle}>{freeAccess ? 'Payment is switched off for testing' : 'Payment gate active'}</Text>
            <Text style={styles.accessText}>{freeAccess ? 'Closed testers can use the app without payment while the workflow is checked.' : 'Live access mode is active.'}</Text>
          </View>
          <View style={styles.accessBadge}>
            <Text style={styles.accessBadgeText}>{freeAccess ? 'Open' : 'Locked'}</Text>
          </View>
        </View>
      </SectionCard>

      <SectionCard title="Legal and commercial basics" subtitle="These should be ready before charging customers.">
        {legalItems.map((item) => (
          <View key={item.title} style={styles.itemRow}>
            <View style={styles.itemIcon}><Ionicons name="document-text-outline" size={18} color="#2563eb" /></View>
            <View style={styles.itemMain}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemText}>{item.detail}</Text>
            </View>
          </View>
        ))}
      </SectionCard>

      <SectionCard title="Store readiness" subtitle="Use this list when preparing the closed testing build and later public release.">
        <View style={styles.checkGrid}>
          {storeItems.map((item) => (
            <View key={item} style={styles.checkCard}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#16a34a" />
              <Text style={styles.checkText}>{item}</Text>
            </View>
          ))}
        </View>
      </SectionCard>

      <SectionCard title="Backend build map" subtitle="These are not needed for the local prototype, but they are required for the live paid product.">
        {backendItems.map((item) => (
          <View key={item.title} style={styles.itemRow}>
            <View style={styles.itemIcon}><Ionicons name="server-outline" size={18} color="#7c3aed" /></View>
            <View style={styles.itemMain}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemText}>{item.detail}</Text>
            </View>
          </View>
        ))}
      </SectionCard>

      <SectionCard title="Draft support text" subtitle="Copy this into your tester instructions.">
        <TextInput
          multiline
          editable={false}
          selectTextOnFocus
          style={styles.textBox}
          value={'Programme Buddy is currently in closed testing. Access is open without payment while the programme, inspection, photo evidence and export workflow is being tested. Photos are stored locally on the device during this phase, so please export important records regularly and report any issues found during testing.'}
        />
      </SectionCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 4 },
  eyebrow: { color: '#2563eb', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  title: { color: '#0f172a', fontSize: 30, fontWeight: '900' },
  subtitle: { color: '#64748b', fontSize: 14, lineHeight: 20 },
  accessBox: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#86efac', borderRadius: 16, padding: 14, flexWrap: 'wrap' },
  accessMain: { flex: 1, minWidth: 230 },
  accessTitle: { color: '#0f172a', fontSize: 17, fontWeight: '900' },
  accessText: { color: '#166534', fontSize: 13, lineHeight: 19, marginTop: 4, fontWeight: '800' },
  accessBadge: { backgroundColor: '#dcfce7', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  accessBadgeText: { color: '#166534', fontSize: 12, fontWeight: '900' },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#ffffff', borderRadius: 14, padding: 12 },
  itemIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  itemMain: { flex: 1 },
  itemTitle: { color: '#0f172a', fontSize: 15, fontWeight: '900' },
  itemText: { color: '#64748b', fontSize: 12, lineHeight: 18, marginTop: 3, fontWeight: '700' },
  checkGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  checkCard: { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 220, flex: 1, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, padding: 12 },
  checkText: { color: '#0f172a', fontSize: 13, fontWeight: '800', flex: 1 },
  textBox: { minHeight: 120, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 14, padding: 12, backgroundColor: '#f8fafc', color: '#0f172a', fontSize: 13, lineHeight: 20, textAlignVertical: 'top' },
});
