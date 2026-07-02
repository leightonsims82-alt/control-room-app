import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppScreen } from '../components/AppScreen';
import { SectionCard } from '../components/SectionCard';
import { useSitePlanner } from '../data/sitePlannerStore';

const BILLING_MANAGERS_KEY = 'programme-buddy:billing-managers:v1';
const BILLING_SETTINGS_KEY = 'programme-buddy:billing-settings:v1';
const BILLING_ACTIVATION_CODES_KEY = 'programme-buddy:activation-codes:v1';
const EARLY_ACCESS_PRICE = 5.99;
const SOLO_PRICE = 10.99;
const ADDITIONAL_MANAGER_PRICE = 10.99;

const CLOUD_ADDONS = [
  { id: 'starter', title: 'Cloud Evidence Backup', price: 'From £4.99/month', status: 'Coming soon' },
  { id: 'sync', title: 'Evidence Sync Add-on', price: 'Future add-on', status: 'Not included' },
];

type ManagerBillingStatus = 'Pending paid invite' | 'Paid seat active' | 'Free access active' | 'Removed';

type PaidManagerSeat = {
  id: string;
  name: string;
  email: string;
  role: string;
  billingStatus: ManagerBillingStatus;
  seatPrice: number;
  activationCode?: string;
  createdAt: string;
};

type ActivationCode = {
  id: string;
  code: string;
  label: string;
  accessType: 'Free manager seat' | 'Founder access' | 'Trial extension';
  maxUses: number;
  usedCount: number;
  status: 'Active' | 'Disabled';
  createdAt: string;
};

type BillingSettings = {
  cloudAddonInterest: boolean;
};

function normaliseCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, '-');
}

function createRandomCode() {
  const first = Math.random().toString(36).slice(2, 6).toUpperCase();
  const second = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `PB-${first}-${second}`;
}

function getManagerPrice(manager: PaidManagerSeat) {
  if (manager.billingStatus === 'Removed' || manager.billingStatus === 'Free access active') return 0;
  return manager.seatPrice ?? ADDITIONAL_MANAGER_PRICE;
}

export default function BillingScreen() {
  const { siteSetup } = useSitePlanner();
  const [managers, setManagers] = useState<PaidManagerSeat[]>([]);
  const [activationCodes, setActivationCodes] = useState<ActivationCode[]>([]);
  const [settings, setSettings] = useState<BillingSettings>({ cloudAddonInterest: false });
  const [managerName, setManagerName] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [managerRole, setManagerRole] = useState('Site Manager');
  const [managerActivationCode, setManagerActivationCode] = useState('');
  const [codeLabel, setCodeLabel] = useState('Team free access');
  const [codeValue, setCodeValue] = useState('');
  const [codeMaxUses, setCodeMaxUses] = useState('5');
  const [codeMessage, setCodeMessage] = useState('');

  const activeManagers = managers.filter((manager) => manager.billingStatus !== 'Removed');
  const billableManagers = activeManagers.filter((manager) => manager.billingStatus !== 'Free access active');
  const paidManagers = managers.filter((manager) => manager.billingStatus === 'Paid seat active');
  const freeManagers = managers.filter((manager) => manager.billingStatus === 'Free access active');
  const activeCodes = activationCodes.filter((code) => code.status === 'Active');
  const projectedMonthlyTotal = SOLO_PRICE + billableManagers.reduce((total, manager) => total + getManagerPrice(manager), 0);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function loadBilling() {
        const [storedManagers, storedSettings, storedCodes] = await Promise.all([
          AsyncStorage.getItem(BILLING_MANAGERS_KEY),
          AsyncStorage.getItem(BILLING_SETTINGS_KEY),
          AsyncStorage.getItem(BILLING_ACTIVATION_CODES_KEY),
        ]);
        if (!active) return;
        if (storedManagers) setManagers(JSON.parse(storedManagers));
        if (storedSettings) setSettings(JSON.parse(storedSettings));
        if (storedCodes) setActivationCodes(JSON.parse(storedCodes));
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
      `Billable managers: ${billableManagers.length} × £${ADDITIONAL_MANAGER_PRICE.toFixed(2)}/month`,
      `Free access managers: ${freeManagers.length}`,
      `Active activation codes: ${activeCodes.length}`,
      `Projected monthly total: £${projectedMonthlyTotal.toFixed(2)}`,
    ].join('\n'),
    [activeCodes.length, billableManagers.length, freeManagers.length, projectedMonthlyTotal, siteSetup.siteName],
  );

  const saveManagers = async (nextManagers: PaidManagerSeat[]) => {
    setManagers(nextManagers);
    await AsyncStorage.setItem(BILLING_MANAGERS_KEY, JSON.stringify(nextManagers));
  };

  const saveActivationCodes = async (nextCodes: ActivationCode[]) => {
    setActivationCodes(nextCodes);
    await AsyncStorage.setItem(BILLING_ACTIVATION_CODES_KEY, JSON.stringify(nextCodes));
  };

  const saveSettings = async (nextSettings: BillingSettings) => {
    setSettings(nextSettings);
    await AsyncStorage.setItem(BILLING_SETTINGS_KEY, JSON.stringify(nextSettings));
  };

  const createActivationCode = async () => {
    const code = normaliseCode(codeValue || createRandomCode());
    if (!code) return;
    const alreadyExists = activationCodes.some((item) => item.code === code);
    if (alreadyExists) {
      setCodeMessage('That activation code already exists.');
      return;
    }
    const nextCode: ActivationCode = {
      id: `activation-code-${Date.now()}`,
      code,
      label: codeLabel.trim() || 'Free team access',
      accessType: 'Free manager seat',
      maxUses: Math.max(1, Number(codeMaxUses) || 1),
      usedCount: 0,
      status: 'Active',
      createdAt: new Date().toISOString(),
    };
    await saveActivationCodes([nextCode, ...activationCodes]);
    setCodeValue('');
    setCodeLabel('Team free access');
    setCodeMaxUses('5');
    setCodeMessage(`Activation code ${code} created.`);
  };

  const toggleActivationCode = async (codeId: string) => {
    await saveActivationCodes(activationCodes.map((code) => (code.id === codeId ? { ...code, status: code.status === 'Active' ? 'Disabled' : 'Active' } : code)));
  };

  const addManager = async () => {
    const name = managerName.trim();
    const email = managerEmail.trim();
    if (!email) return;

    const enteredCode = normaliseCode(managerActivationCode);
    const matchedCode = enteredCode ? activationCodes.find((code) => code.code === enteredCode && code.status === 'Active') : undefined;
    const codeCanBeUsed = matchedCode ? matchedCode.usedCount < matchedCode.maxUses : false;
    const freeAccess = Boolean(matchedCode && codeCanBeUsed);

    const nextManagers = [
      ...managers,
      {
        id: `manager-seat-${Date.now()}`,
        name: name || email,
        email,
        role: managerRole.trim() || 'Site Manager',
        billingStatus: freeAccess ? 'Free access active' as const : 'Pending paid invite' as const,
        seatPrice: freeAccess ? 0 : ADDITIONAL_MANAGER_PRICE,
        activationCode: freeAccess ? matchedCode?.code : undefined,
        createdAt: new Date().toISOString(),
      },
    ];

    if (matchedCode && codeCanBeUsed) {
      await saveActivationCodes(activationCodes.map((code) => (code.id === matchedCode.id ? { ...code, usedCount: code.usedCount + 1 } : code)));
      setCodeMessage(`${matchedCode.code} applied. Free access granted to ${email}.`);
    } else if (enteredCode) {
      setCodeMessage('Code not valid or already fully used. Manager added as pending paid seat.');
    }

    await saveManagers(nextManagers);
    setManagerName('');
    setManagerEmail('');
    setManagerRole('Site Manager');
    setManagerActivationCode('');
  };

  const updateManagerStatus = async (managerId: string, billingStatus: ManagerBillingStatus) => {
    await saveManagers(managers.map((manager) => {
      if (manager.id !== managerId) return manager;
      const freeAccess = billingStatus === 'Free access active';
      return {
        ...manager,
        billingStatus,
        seatPrice: freeAccess ? 0 : manager.seatPrice || ADDITIONAL_MANAGER_PRICE,
        activationCode: freeAccess ? manager.activationCode || 'MANUAL-FREE-ACCESS' : manager.activationCode,
      };
    }));
  };

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.title}>Billing & Team Access</Text>
        <Text style={styles.subtitle}>Manage launch pricing, local storage, future cloud add-ons, paid manager seats and free activation codes for trusted users.</Text>
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
            <Text style={styles.priceLabel}>Extra managers</Text>
            <Text style={styles.priceValue}>£{ADDITIONAL_MANAGER_PRICE.toFixed(2)}</Text>
            <Text style={styles.priceMeta}>per manager/month unless activation code applied</Text>
          </View>
        </View>
        <View style={styles.noticeBox}>
          <Text style={styles.noticeTitle}>Storage mode: local device</Text>
          <Text style={styles.noticeText}>Photo evidence is stored on the user’s device as standard. Cloud Evidence Backup is not included in the base plan and can be offered later as a paid add-on.</Text>
        </View>
      </SectionCard>

      <SectionCard title="Activation codes" subtitle="Create free access codes for your own team, testers or trusted users. Each code can have a usage limit.">
        <View style={styles.formGrid}>
          <View style={styles.inputWrap}>
            <Text style={styles.label}>Code label</Text>
            <TextInput value={codeLabel} onChangeText={setCodeLabel} placeholder="Team free access" style={styles.input} />
          </View>
          <View style={styles.inputWrap}>
            <Text style={styles.label}>Code</Text>
            <TextInput value={codeValue} onChangeText={(value) => setCodeValue(normaliseCode(value))} placeholder="Leave blank to generate" style={styles.input} autoCapitalize="characters" />
          </View>
          <View style={styles.inputWrapSmall}>
            <Text style={styles.label}>Max uses</Text>
            <TextInput value={codeMaxUses} onChangeText={setCodeMaxUses} placeholder="5" style={styles.input} keyboardType="number-pad" />
          </View>
          <Pressable style={styles.primaryButton} onPress={createActivationCode}>
            <Text style={styles.primaryButtonText}>Create Code</Text>
          </Pressable>
        </View>
        {codeMessage ? <Text style={styles.codeMessage}>{codeMessage}</Text> : null}
        {activationCodes.length === 0 ? <Text style={styles.empty}>No activation codes created yet.</Text> : null}
        {activationCodes.map((code) => (
          <View key={code.id} style={styles.codeRow}>
            <View style={styles.codeMain}>
              <Text style={styles.codeValue}>{code.code}</Text>
              <Text style={styles.codeMeta}>{code.label} · {code.accessType}</Text>
              <Text style={styles.codeMeta}>{code.usedCount}/{code.maxUses} used · {code.status}</Text>
            </View>
            <Pressable style={code.status === 'Active' ? styles.removeButton : styles.smallButton} onPress={() => toggleActivationCode(code.id)}>
              <Text style={code.status === 'Active' ? styles.removeButtonText : styles.smallButtonText}>{code.status === 'Active' ? 'Disable' : 'Enable'}</Text>
            </Pressable>
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

      <SectionCard title="Add managers to this project" subtitle="Managers normally require a paid seat. Apply an activation code to grant free access to selected users.">
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
          <View style={styles.inputWrap}>
            <Text style={styles.label}>Activation code optional</Text>
            <TextInput value={managerActivationCode} onChangeText={(value) => setManagerActivationCode(normaliseCode(value))} placeholder="PB-TEAM" style={styles.input} autoCapitalize="characters" />
          </View>
          <Pressable style={styles.primaryButton} onPress={addManager}>
            <Text style={styles.primaryButtonText}>Add Manager</Text>
          </Pressable>
        </View>

        {activeManagers.length === 0 ? <Text style={styles.empty}>No additional managers added to this project yet.</Text> : null}
        {activeManagers.map((manager) => (
          <View key={manager.id} style={styles.managerRow}>
            <View style={styles.managerMain}>
              <Text style={styles.managerName}>{manager.name}</Text>
              <Text style={styles.managerMeta}>{manager.email} · {manager.role}</Text>
              <Text style={manager.billingStatus === 'Free access active' ? styles.managerFreeBilling : styles.managerBilling}>
                {manager.billingStatus} · {manager.billingStatus === 'Free access active' ? 'Free access' : `£${getManagerPrice(manager).toFixed(2)}/month`}{manager.activationCode ? ` · ${manager.activationCode}` : ''}
              </Text>
            </View>
            <View style={styles.managerActions}>
              <Pressable style={styles.smallButton} onPress={() => updateManagerStatus(manager.id, 'Paid seat active')}>
                <Text style={styles.smallButtonText}>Mark Paid</Text>
              </Pressable>
              <Pressable style={styles.freeButton} onPress={() => updateManagerStatus(manager.id, 'Free access active')}>
                <Text style={styles.freeButtonText}>Grant Free</Text>
              </Pressable>
              <Pressable style={styles.removeButton} onPress={() => updateManagerStatus(manager.id, 'Removed')}>
                <Text style={styles.removeButtonText}>Remove</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </SectionCard>

      <SectionCard title="Billing summary" subtitle="This is a calculation preview for the current project. Payment processing and server-side code validation still need to be connected later.">
        <View style={styles.summaryGrid}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Active paid managers</Text>
            <Text style={styles.summaryValue}>{paidManagers.length}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Free access managers</Text>
            <Text style={styles.summaryValue}>{freeManagers.length}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Pending paid seats</Text>
            <Text style={styles.summaryValue}>{billableManagers.length - paidManagers.length}</Text>
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
  inputWrapSmall: { gap: 6, width: 110 },
  label: { color: '#475569', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  input: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: '#0f172a', fontWeight: '800' },
  primaryButton: { backgroundColor: '#0f172a', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  primaryButtonText: { color: '#ffffff', fontWeight: '900' },
  empty: { color: '#64748b', fontWeight: '700' },
  codeMessage: { color: '#2563eb', fontSize: 12, fontWeight: '900' },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, padding: 12, backgroundColor: '#ffffff' },
  codeMain: { flex: 1 },
  codeValue: { color: '#0f172a', fontSize: 17, fontWeight: '900', letterSpacing: 1 },
  codeMeta: { color: '#64748b', fontSize: 12, marginTop: 3, fontWeight: '700' },
  managerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, padding: 12, backgroundColor: '#ffffff' },
  managerMain: { flex: 1 },
  managerName: { color: '#0f172a', fontSize: 15, fontWeight: '900' },
  managerMeta: { color: '#64748b', fontSize: 12, marginTop: 2, fontWeight: '700' },
  managerBilling: { color: '#2563eb', fontSize: 12, marginTop: 3, fontWeight: '900' },
  managerFreeBilling: { color: '#166534', fontSize: 12, marginTop: 3, fontWeight: '900' },
  managerActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  smallButton: { backgroundColor: '#dcfce7', borderWidth: 1, borderColor: '#86efac', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  smallButtonText: { color: '#166534', fontSize: 12, fontWeight: '900' },
  freeButton: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  freeButtonText: { color: '#1d4ed8', fontSize: 12, fontWeight: '900' },
  removeButton: { backgroundColor: '#fff1f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  removeButtonText: { color: '#dc2626', fontSize: 12, fontWeight: '900' },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  summaryBox: { flex: 1, minWidth: 170, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, padding: 14 },
  summaryBoxEmphasis: { flex: 1, minWidth: 170, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 14, padding: 14 },
  summaryLabel: { color: '#64748b', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  summaryValue: { color: '#0f172a', fontSize: 24, fontWeight: '900', marginTop: 4 },
  summaryTextBox: { minHeight: 130, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 14, padding: 12, backgroundColor: '#f8fafc', color: '#0f172a', fontFamily: 'monospace', fontSize: 12, textAlignVertical: 'top' },
});
