import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../components/AppScreen';
import { SectionCard } from '../components/SectionCard';

const onboardingSteps = [
  { title: 'Set up the site', route: '/site/setup', icon: 'settings-outline', detail: 'Confirm site name, programme start date, house types and site-only acquaintances.' },
  { title: 'Add plots', route: '/(tabs)/plots', icon: 'business-outline', detail: 'Enter build order, plot number, house type and pre-handover week.' },
  { title: 'Check master programme', route: '/(tabs)/master', icon: 'calendar-outline', detail: 'Review the 23-week programme by plot, build order and stage numbers.' },
  { title: 'Use rolling 2-week', route: '/(tabs)/two-week', icon: 'grid-outline', detail: 'Open the current work view, inspect final-day activities and check dates.' },
  { title: 'Issue trade programme', route: '/(tabs)/trades', icon: 'briefcase-outline', detail: 'Drag fixes, adjust trade views and add recovery notes.' },
  { title: 'Complete inspections', route: '/(tabs)/inspections', icon: 'clipboard-outline', detail: 'Pass/fail checks, add comments, attach photos and save the Plot QA Story.' },
  { title: 'Export records', route: '/exports', icon: 'download-outline', detail: 'Copy weekly report outputs and CSV text for control records.' },
  { title: 'Review access mode', route: '/access', icon: 'lock-open-outline', detail: 'Confirm test-mode access is active and live launch requirements are tracked.' },
];

export default function OnboardingScreen() {
  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>First-time route</Text>
        <Text style={styles.title}>Set up Programme Buddy</Text>
        <Text style={styles.subtitle}>Use this guided flow during closed testing so every tester follows the same journey through the app.</Text>
      </View>

      <SectionCard title="Closed testing journey" subtitle="Test mode keeps the product open while the workflow is being proven before live accounts, billing and cloud services are added.">
        {onboardingSteps.map((step, index) => (
          <Pressable key={step.title} style={styles.stepRow} onPress={() => router.push(step.route as any)}>
            <View style={styles.stepNumberWrap}>
              <Text style={styles.stepNumber}>{index + 1}</Text>
            </View>
            <View style={styles.stepIcon}>
              <Ionicons name={step.icon as any} size={20} color="#2563eb" />
            </View>
            <View style={styles.stepMain}>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepDetail}>{step.detail}</Text>
            </View>
            <Text style={styles.stepAction}>Open</Text>
          </Pressable>
        ))}
      </SectionCard>

      <SectionCard title="Tester instruction" subtitle="This is the simple message to give a tester before they start.">
        <View style={styles.noteBox}>
          <Text style={styles.noteText}>Start at Onboarding, create or check the site, add plots, open the programme, complete at least one QA inspection with a photo, then check the Plot QA Story and Exports.</Text>
        </View>
      </SectionCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 4 },
  eyebrow: { color: '#2563eb', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  title: { color: '#0f172a', fontSize: 30, fontWeight: '900' },
  subtitle: { color: '#64748b', fontSize: 14, lineHeight: 20 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#ffffff', borderRadius: 14, padding: 12, flexWrap: 'wrap' },
  stepNumberWrap: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#173b5f', alignItems: 'center', justifyContent: 'center' },
  stepNumber: { color: '#ffffff', fontWeight: '900' },
  stepIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  stepMain: { flex: 1, minWidth: 230 },
  stepTitle: { color: '#0f172a', fontWeight: '900', fontSize: 15 },
  stepDetail: { color: '#64748b', fontSize: 12, lineHeight: 18, marginTop: 3, fontWeight: '700' },
  stepAction: { color: '#2563eb', fontSize: 12, fontWeight: '900' },
  noteBox: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#86efac', borderRadius: 14, padding: 14 },
  noteText: { color: '#166534', fontSize: 13, lineHeight: 20, fontWeight: '800' },
});
