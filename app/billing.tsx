import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppScreen } from '../components/AppScreen';
import { SectionCard } from '../components/SectionCard';
import { useSitePlanner } from '../data/sitePlannerStore';

const BILLING_MANAGERS_KEY = 'programme-buddy:billing-managers:v1';
const BILLING_SETTINGS_KEY = 'programme-buddy:billing-settings:v1';
const EARLY_ACCESS_PRICE = 5.99;
const SOLO_PRICE = 10.99;
const ADDITIONAL_MANAGER_PRICE = 10.99;

const CLOUD_ADDONS = [
  { id: 'starter', title: 'Cloud Evidence Backup', price: 'From £4.99/month', status: 'Coming soon' },
  { id: 'sync', title: 'Evidence Sync Add-on', price: 'Future add-on', status: 'Not included' },
];

type PaidManagerSeat = {
  id: string;
  name: string;
  email: string;
  role: string;
  billingStatus: 'Pending paid invite' | 'Paid seat active' | 'Removed';
  createdAt: string;
};

type SiteAcquaintance = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'Invited' | 'Active' | 'Removed';
  accessScope: 'Current live site only';
  canCreateSites: false;
  canManageBilling: false;
  addedAt: string;
};

type BillingSettings = {
  cloudAddonInterest: boolean;
};

function getSiteAcquaintances(siteSetup: unknown): SiteAcquaintance[] {
  const value = (siteSetup as { siteAcquaintances?: SiteAcquaintance[] }).siteAcquaintances;
  return Array.isArray(value) ? value.filter((item) => item.status !== 'Removed') : [];
}

export default function BillingScreen() {
  const { siteSetup } = useSitePlanner();
  const [managers, setManagers] = useState<PaidManagerSeat[]>([]);
  const [settings, setSettings] = useState<BillingSettings>({ cloudAddonInterest: false });
  const [managerName, setManagerName] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [managerRole, setManagerRole] = useState('Site Manager');
  const activeManagers = managers.filter((manager) => manager.billingStatus !== 'Removed');
  const paidManagers = managers.filter((manager) => manager.billingStatus === 'Paid seat active');
  const siteAcquaintances = getSiteAcquaintances(siteSetup);
  const projectedMonthlyTotal = SOLO_PRICE + activeManagers.length * ADDITIONAL_MANAGER_PRICE;

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function loadBilling() {
        const [storedManagers, storedSettings] = await Promise.all([
          AsyncStorage.getItem(BILLING_MANAGERS_KEY),
          AsyncStorage.getItem(BILLING_SETTINGS_KEY),
        ]);
        if (!active) return;
        if (storedManagers) setManagers(JSON.parse(storedManagers));
        if (storedSettings) setSettings(JSON.parse(storedSettings));
      }
      loadBilling();
      return () => {
        active = false;
      };
    }, []),
  );

  const billingSummary = useMemo(
    () => [
      `Project: ${siteSetup.siteName}`,
      `Base user: £${SOLO_PRICE.toFixed(2)}/month after early access`,
      `Site-only acquaintances: ${siteAcquaintances.length} free access user(s)`,
      `Paid additional managers: ${activeManagers.length} × £${ADDITIONAL_MANAGER_PRICE.toFixed(2)}/month`,
      `Projected monthly total: £${projectedMonthlyTotal.toFixed(2)}`,
    ].join('\n'),
    [activeManagers.length, projectedMonthlyTotal, siteAcquaintances.length, siteSetup.siteName],
  );

  const saveManagers = async (nextManagers: PaidManagerSeat[]) => {
    setManagers(nextManagers);
    await AsyncStorage.setItem(BILLING_MANAGERS_KEY, JSON.stringify(nextManagers));
  };

  const saveSettings = async (nextSettings: BillingSettings) => {
    setSettings(nextSettings);
    await AsyncStorage.setItem(BILLING_SETTINGS_KEY, JSON.stringify(nextSettings));
  };

  const addManager = async () => {
    const name = managerName.trim();
    const email = managerEmail.trim();
    if (!email) return;
    const nextManagers = [
      ...managers,
      {
        id: `manager-seat-${Date.now()}`,
        name: name || email,
        email,
        role: managerRole.trim() || 'Site Manager',
        billingStatus: 'Pending paid invite' as const,
        createdAt: new Date().toISOString(),
      },
    ];
    await saveManagers(nextManagers);
    setManagerName('');
    setManagerEmail('');
    setManagerRole('Site Manager');
  };

  const updateManagerStatus = async (managerId: string, billingStatus: PaidManagerSeat['billingStatus']) => {
    await saveManagers(managers.map((manager) => (manager.id === managerId ? { ...manager, billingStatus } : manager)));
  };

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.title}>Billing & Team Access</Text>
        <Text style={styles.subtitle}>Separate paying customers from your own site-only team access. Site acquaintances get free access to your current live site only.</Text>
      </View>

      <SectionCard title="Launch plan" subtitle="This is the plan wording shown for early access users.">
        <View style={styles.priceGrid}>
          <View style={styles.priceCardPrimary}>
            <Text style={styles.priceLabel}>Early Access</Text>
            <Text style={styles.priceValue}>£{EARLY_ACCESS_PRICE.toFixed(2)}</Text>
            <Text style={styles.priceMeta}>per month for first 6 months</Text>
          </View>
          <View style={styles.priceCard}>
            <Text style={styles.priceLabel}>Then</Text>
            <Text style={styles.priceValue}>£{SOLO_PRICE.toFixed(2)}</Text>
            <Text style={styles.priceMeta}>per month, single user</Text>
          </View>
          <View style={styles.priceCard}>
            <Text style={styles.priceLabel}>Paid extra managers</Text>
            <Text style={styles.priceValue}>£{ADDITIONAL_MANAGER_PRICE.toFixed(2)}</Text>
            <Text style={styles.priceMeta}>per manager/month</Text>
          </View>
        </View>
        <View style={styles.noticeBox}>
          <Text style={styles.noticeTitle}>Storage mode: local device</Text>
          <Text style={styles.noticeText}>Photo evidence is stored on the user’s device as standard. Cloud Evidence Backup is not included in the base plan and can be offered later as a paid add-on.</Text>
        </View>
      </SectionCard>

      <SectionCard title="Your site-only acquaintances" subtitle="Manage this list in Site Setup. These people can access this live project only and cannot create or run another site from their link to you.">
        <View style={styles.ruleBox}>
          <Text style={styles.ruleTitle}>Free internal access rule</Text>
          <Text style={styles.ruleText}>If a user is listed as a site acquaintance for {siteSetup.siteName}, they are free for this project only. They are blocked from creating new sites, managing billing, or using your access on another project.</Text>
        </View>
        {siteAcquaintances.length === 0 ? <Text style={styles.empty}>No site acquaintances added yet. Add them in Setup → Site acquaintances.</Text> : null}
        {siteAcquaintances.map((person) => (
          <View key={person.id} style={styles.acquaintanceRow}>
            <View style={styles.acquaintanceMain}>
              <Text style={styles.acquaintanceName}>{person.name}</Text>
              <Text style={styles.acquaintanceMeta}>{person.email} · {person.role}</Text>
              <Text style={styles.acquaintanceAccess}>{person.status} · Free · {person.accessScope} · Cannot create another site</Text>
            </View>
            <View style={styles.freeBadge}>
              <Text style={styles.freeBadgeText}>£0</Text>
            </View>
          </View>
        ))}
      </SectionCard>

      <SectionCard title="Cloud Evidence Backup add-on" subtitle="Add this to the app now as a future upgrade route without promising it is active today.">
        {CLOUD_ADDONS.map((addon) => (
          <View key={addon.id} style={styles.addonRow}>
            <View style={styles.addonMain}>
              <Text style={styles.addonTitle}>{addon.title}</Text>
              <Text style={styles.addonMeta}>{addon.price} · {addon.status}</Text>
              <Text style={styles.addonText}>Used for cloud backup, device changes, shared project access and long-term QA evidence protection when available.</Text>
            </View>
            <View style={styles.addonBadge}>
              <Text style={styles.addonBadgeText}>{addon.status}</Text>
            </View>
          </View>
        ))}
        <Pressable
          style={[styles.toggleButton, settings.cloudAddonInterest ? styles.toggleActive : null]}
          onPress={() => saveSettings({ cloudAddonInterest: !settings.cloudAddonInterest })}
        >
          <Text style={[styles.toggleText, settings.cloudAddonInterest ? styles.toggleTextActive : null]}>
            {settings.cloudAddonInterest ? 'Cloud add-on interest saved' : 'Register interest in Cloud Evidence Backup'}
          </Text>
        </Pressable>
      </SectionCard>

      <SectionCard title="Paid managers outside your acquaintance list" subtitle="These are additional paid seats for users who are not part of your site-only free team list.">
        <View style={styles.formGrid}>
          <View style={styles.inputWrap}>
            <Text style={styles.label}>Manager name</Text>
            <TextInput value={managerName} onChangeText={setManagerName} placeholder="Name" style={styles.input} />
          </View>
          <View style={styles.inputWrap}>
            <Text style={styles.label}>Email</Text>
            <TextInput value={managerEmail} onChangeText={setManagerEmail} placeholder="name@example.com" style={styles.input} autoCapitalize="none" keyboardType="email-address" />
          </View>
          <View style={styles.inputWrap}>
            <Text style={styles.label}>Role</Text>
            <TextInput value={managerRole} onChangeText={setManagerRole} placeholder="Assistant Site Manager" style={styles.input} />
          </View>
          <Pressable style={styles.primaryButton} onPress={addManager}>
            <Text style={styles.primaryButtonText}>Add Paid Seat</Text>
          </Pressable>
        </View>

        {activeManagers.length === 0 ? <Text style={styles.empty}>No paid additional managers added to this project yet.</Text> : null}
        {activeManagers.map((manager) => (
          <View key={manager.id} style={styles.managerRow}>
            <View style={styles.managerMain}>
              <Text style={styles.managerName}>{manager.name}</Text>
              <Text style={styles.managerMeta}>{manager.email} · {manager.role}</Text>
              <Text style={styles.managerBilling}>{manager.billingStatus} · £{ADDITIONAL_MANAGER_PRICE.toFixed(2)}/month</Text>
            </View>
            <View style={styles.managerActions}>
              <Pressable style={styles.smallButton} onPress={() => updateManagerStatus(manager.id, 'Paid seat active')}>
                <Text style={styles.smallButtonText}>Mark Paid</Text>
              </Pressable>
              <Pressable style={styles.removeButton} onPress={() => updateManagerStatus(manager.id, 'Removed')}>
                <Text style={styles.removeButtonText}>Remove</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </SectionCard>

      <SectionCard title="Billing summary" subtitle="This is a calculation preview for the current project. Payment processing and server-side access enforcement still need to be connected later.">
        <View style={styles.summaryGrid}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Free site acquaintances</Text>
            <Text style={styles.summaryValue}>{siteAcquaintances.length}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Active paid managers</Text>
            <Text style={styles.summaryValue}>{paidManagers.length}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Pending paid seats</Text>
            <Text style={styles.summaryValue}>{activeManagers.length - paidManagers.length}</Text>
          </View>
          <View style={styles.summaryBoxEmphasis}>
            <Text style={styles.summaryLabel}>Projected total</Text>
            <Text style={styles.summaryValue}>£{projectedMonthlyTotal.toFixed(2)}</Text>
          </View>
        </View>
        <TextInput value={billingSummary} editable={false} multiline selectTextOnFocus style={styles.summaryTextBox} />
      </SectionCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 4 },
  title: { color: '#0f172a', fontSize: 30, fontWeight: '900' },
  subtitle: { color: '#64748b', fontSize: 14, lineHeight: 20 },
  priceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  priceCardPrimary: { flex: 1, minWidth: 190, backgroundColor: '#0f172a', borderRadius: 16, padding: 16 },
  priceCard: { flex: 1, minWidth: 190, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, padding: 16 },
  priceLabel: { color: '#64748b', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  priceValue: { color: '#2563eb', fontSize: 34, fontWeight: '900', marginTop: 4 },
  priceMeta: { color: '#64748b', fontSize: 12, fontWeight: '800', marginTop: 3 },
  noticeBox: { backgroundColor: '#fef3c7', borderWidth: 1, borderColor: '#f59e0b', borderRadius: 14, padding: 14 },
  noticeTitle: { color: '#92400e', fontWeight: '900' },
  noticeText: { color: '#92400e', fontSize: 12, lineHeight: 18, marginTop: 4, fontWeight: '700' },
  ruleBox: { backgroundColor: '#ecfeff', borderWidth: 1, borderColor: '#67e8f9', borderRadius: 14, padding: 14 },
  ruleTitle: { color: '#155e75', fontWeight: '900' },
  ruleText: { color: '#155e75', fontSize: 12, lineHeight: 18, marginTop: 4, fontWeight: '700' },
  acquaintanceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 14, padding: 12, backgroundColor: '#f0fdf4' },
  acquaintanceMain: { flex: 1 },
  acquaintanceName: { color: '#0f172a', fontSize: 15, fontWeight: '900' },
  acquaintanceMeta: { color: '#64748b', fontSize: 12, marginTop: 2, fontWeight: '700' },
  acquaintanceAccess: { color: '#166534', fontSize: 12, marginTop: 3, fontWeight: '900' },
  freeBadge: { backgroundColor: '#dcfce7', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  freeBadgeText: { color: '#166534', fontSize: 12, fontWeight: '900' },
  addonRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, padding: 12, backgroundColor: '#ffffff' },
  addonMain: { flex: 1 },
  addonTitle: { color: '#0f172a', fontSize: 16, fontWeight: '900' },
  addonMeta: { color: '#2563eb', fontSize: 12, fontWeight: '900', marginTop: 3 },
  addonText: { color: '#64748b', fontSize: 12, lineHeight: 18, marginTop: 4, fontWeight: '700' },
  addonBadge: { backgroundColor: '#f1f5f9', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  addonBadgeText: { color: '#0f172a', fontSize: 11, fontWeight: '900' },
  toggleButton: { alignSelf: 'flex-start', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, backgroundColor: '#ffffff' },
  toggleActive: { backgroundColor: '#dcfce7', borderColor: '#86efac' },
  toggleText: { color: '#475569', fontWeight: '900' },
  toggleTextActive: { color: '#166534' },
  formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' },
  inputWrap: { gap: 6, minWidth: 190, flex: 1 },
  label: { color: '#475569', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  input: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: '#0f172a', fontWeight: '800' },
  primaryButton: { backgroundColor: '#0f172a', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  primaryButtonText: { color: '#ffffff', fontWeight: '900' },
  empty: { color: '#64748b', fontWeight: '700' },
  managerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, padding: 12, backgroundColor: '#ffffff' },
  managerMain: { flex: 1 },
  managerName: { color: '#0f172a', fontSize: 15, fontWeight: '900' },
  managerMeta: { color: '#64748b', fontSize: 12, marginTop: 2, fontWeight: '700' },
  managerBilling: { color: '#2563eb', fontSize: 12, marginTop: 3, fontWeight: '900' },
  managerActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  smallButton: { backgroundColor: '#dcfce7', borderWidth: 1, borderColor: '#86efac', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  smallButtonText: { color: '#166534', fontSize: 12, fontWeight: '900' },
  removeButton: { backgroundColor: '#fff1f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  removeButtonText: { color: '#dc2626', fontSize: 12, fontWeight: '900' },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  summaryBox: { flex: 1, minWidth: 170, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, padding: 14 },
  summaryBoxEmphasis: { flex: 1, minWidth: 170, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 14, padding: 14 },
  summaryLabel: { color: '#64748b', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  summaryValue: { color: '#0f172a', fontSize: 24, fontWeight: '900', marginTop: 4 },
  summaryTextBox: { minHeight: 130, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 14, padding: 12, backgroundColor: '#f8fafc', color: '#0f172a', fontFamily: 'monospace', fontSize: 12, textAlignVertical: 'top' },
});
