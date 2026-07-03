import { StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../components/AppScreen';
import { SectionCard } from '../components/SectionCard';

export default function PrivacySupportScreen() {
  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Closed testing</Text>
        <Text style={styles.title}>Privacy & Support</Text>
        <Text style={styles.subtitle}>Key tester notes before Programme Buddy is released publicly.</Text>
      </View>

      <SectionCard title="Local storage" subtitle="Current closed-testing build">
        <Text style={styles.item}>Programme Buddy stores site setup, plots, programme activity moves, trade contacts, issue logs, QA records, Site Buddy readiness records and local photo evidence on this device.</Text>
        <Text style={styles.item}>Cloud backup, multi-device sync and company admin controls are not live yet.</Text>
        <Text style={styles.item}>Photo evidence is copied into the app-controlled ProgrammeBuddyEvidence folder where possible.</Text>
      </SectionCard>

      <SectionCard title="Evidence backup" subtitle="Important for site records">
        <Text style={styles.item}>Users should export or back up important QA records regularly during closed testing.</Text>
        <Text style={styles.item}>Users should avoid putting unnecessary personal information into comments, notes or photos.</Text>
      </SectionCard>

      <SectionCard title="Support" subtitle="Closed-testing placeholder">
        <Text style={styles.item}>For support, bugs or access questions, contact the app owner.</Text>
        <Text style={styles.item}>Add the confirmed live support email and privacy policy URL before Play Store submission.</Text>
      </SectionCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 4 },
  eyebrow: { color: '#2563eb', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  title: { color: '#0f172a', fontSize: 30, fontWeight: '900' },
  subtitle: { color: '#64748b', fontSize: 14, lineHeight: 20 },
  item: { color: '#0f172a', fontWeight: '700', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12, lineHeight: 20 },
});
