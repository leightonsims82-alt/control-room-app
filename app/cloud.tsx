import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppScreen } from '../components/AppScreen';
import { backupProgrammeData, getBackupStatus, restoreProgrammeData } from '../lib/cloudBackup';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

export default function CloudScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signedInEmail, setSignedInEmail] = useState('');
  const [lastBackup, setLastBackup] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const status = await getBackupStatus();
    setSignedInEmail(status.signedIn ? status.email ?? '' : '');
    setLastBackup(status.signedIn && status.updatedAt ? new Date(status.updatedAt).toLocaleString('en-GB') : '');
  };

  useEffect(() => {
    refresh().catch(() => undefined);
  }, []);

  const signIn = async () => {
    if (!supabase) return;
    setBusy(true);
    setMessage('');
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setPassword('');
    setMessage('Signed in.');
    await refresh();
  };

  const signUp = async () => {
    if (!supabase) return;
    setBusy(true);
    setMessage('');
    const { error } = await supabase.auth.signUp({ email: email.trim(), password });
    setBusy(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage('Account created. Check your email if confirmation is enabled, then sign in.');
  };

  const backup = async () => {
    try {
      setBusy(true);
      const count = await backupProgrammeData();
      setMessage(`Cloud backup complete: ${count} programme data sets saved.`);
      await refresh();
    } catch (error: any) {
      setMessage(error?.message ?? 'Cloud backup failed.');
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    try {
      setBusy(true);
      const result = await restoreProgrammeData();
      setMessage(`Restored ${result.restored} data sets. ${Platform.OS === 'web' ? 'Reloading now…' : 'Restart the app to load the restored data.'}`);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.setTimeout(() => window.location.reload(), 500);
      }
    } catch (error: any) {
      setMessage(error?.message ?? 'Cloud restore failed.');
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSignedInEmail('');
    setLastBackup('');
    setMessage('Signed out.');
  };

  return (
    <AppScreen>
      <Link href="/" style={styles.back}>← Dashboard</Link>

      <View style={styles.hero}>
        <View style={styles.iconWrap}><Ionicons name="cloud-done-outline" size={30} color="#ffffff" /></View>
        <View style={styles.heroCopy}>
          <Text style={styles.kicker}>Cloud protection</Text>
          <Text style={styles.title}>Account & Backup</Text>
          <Text style={styles.subtitle}>Protect the site programme and restore it on another device using your Supabase account.</Text>
        </View>
      </View>

      {!isSupabaseConfigured ? (
        <View style={styles.warning}>
          <Text style={styles.warningTitle}>Supabase connection required</Text>
          <Text style={styles.warningText}>Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to your local .env file, then restart Expo.</Text>
        </View>
      ) : null}

      {message ? <Text style={styles.notice}>{message}</Text> : null}

      {signedInEmail ? (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Signed in</Text>
            <Text style={styles.account}>{signedInEmail}</Text>
            <Text style={styles.meta}>{lastBackup ? `Last cloud backup: ${lastBackup}` : 'No cloud backup found yet.'}</Text>
            <View style={styles.buttons}>
              <Pressable style={styles.primary} onPress={backup} disabled={busy}>
                <Text style={styles.primaryText}>{busy ? 'Working…' : 'Back Up Now'}</Text>
              </Pressable>
              <Pressable style={styles.secondary} onPress={restore} disabled={busy}>
                <Text style={styles.secondaryText}>Restore Backup</Text>
              </Pressable>
              <Pressable style={styles.danger} onPress={signOut} disabled={busy}>
                <Text style={styles.dangerText}>Sign Out</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>What is protected</Text>
            <Text style={styles.body}>Plots, stage programmes, delays, templates, trade contacts, inspections, actions, DABS, 8am walks, programme notes, issue settings and issue history.</Text>
          </View>
        </>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign in or create an account</Text>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <View style={styles.buttons}>
            <Pressable style={styles.primary} onPress={signIn} disabled={!isSupabaseConfigured || busy}>
              <Text style={styles.primaryText}>Sign In</Text>
            </Pressable>
            <Pressable style={styles.secondary} onPress={signUp} disabled={!isSupabaseConfigured || busy}>
              <Text style={styles.secondaryText}>Create Account</Text>
            </Pressable>
          </View>
        </View>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  back: { color: '#2563eb', fontWeight: '900', fontSize: 13 },
  hero: { backgroundColor: '#0f172a', borderRadius: 24, padding: 22, flexDirection: 'row', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
  iconWrap: { width: 58, height: 58, borderRadius: 18, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },
  heroCopy: { flex: 1, minWidth: 230 },
  kicker: { color: '#93c5fd', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  title: { color: '#ffffff', fontSize: 28, fontWeight: '900', marginTop: 3 },
  subtitle: { color: '#cbd5e1', fontSize: 14, lineHeight: 21, marginTop: 5 },
  warning: { backgroundColor: '#fffbeb', borderColor: '#fde68a', borderWidth: 1, borderRadius: 16, padding: 14 },
  warningTitle: { color: '#92400e', fontWeight: '900', fontSize: 15 },
  warningText: { color: '#92400e', fontSize: 12, lineHeight: 18, marginTop: 4 },
  notice: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe', borderWidth: 1, color: '#1d4ed8', fontWeight: '900', padding: 10, borderRadius: 12 },
  card: { backgroundColor: '#ffffff', borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', padding: 16, gap: 10 },
  cardTitle: { color: '#0f172a', fontSize: 18, fontWeight: '900' },
  account: { color: '#2563eb', fontSize: 14, fontWeight: '900' },
  meta: { color: '#64748b', fontSize: 12 },
  body: { color: '#475569', fontSize: 13, lineHeight: 20 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, color: '#0f172a', backgroundColor: '#ffffff' },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  primary: { backgroundColor: '#0f172a', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  primaryText: { color: '#ffffff', fontSize: 12, fontWeight: '900' },
  secondary: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe', borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  secondaryText: { color: '#1d4ed8', fontSize: 12, fontWeight: '900' },
  danger: { backgroundColor: '#fff7f7', borderColor: '#fecaca', borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  dangerText: { color: '#b91c1c', fontSize: 12, fontWeight: '900' },
});