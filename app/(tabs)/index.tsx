import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';

export default function WelcomeScreen() {
  return (
    <AppScreen>
      <View style={styles.hero}>
        <View style={styles.iconWrap}>
          <Ionicons name="construct-outline" size={34} color="#ffffff" />
        </View>
        <Text style={styles.kicker}>Programme Buddy</Text>
        <Text style={styles.title}>Welcome to your site programme</Text>
        <Text style={styles.text}>
          Set up the site first, then build your plots, trades, QA notes, exports and weekly programme from one place.
        </Text>
        <Link href="/site/setup" asChild>
          <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
            <Text style={styles.primaryButtonText}>Start Site Setup</Text>
            <Ionicons name="arrow-forward" size={18} color="#ffffff" />
          </Pressable>
        </Link>
      </View>

      <View style={styles.cardGrid}>
        <Feature title="Site details" text="Add the site name, programme defaults and working week." icon="business-outline" />
        <Feature title="Plots" text="Add plot numbers, house types and handover weeks." icon="home-outline" />
        <Feature title="Trades" text="Manage trade lookaheads, call-offs and recovery notes." icon="briefcase-outline" />
        <Feature title="QA" text="Keep progress notes, photos and issue logs together." icon="shield-checkmark-outline" />
      </View>
    </AppScreen>
  );
}

function Feature({ title, text, icon }: { title: string; text: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.featureCard}>
      <View style={styles.featureIconWrap}>
        <Ionicons name={icon} size={22} color="#2563eb" />
      </View>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: '#0f172a',
    borderRadius: 30,
    padding: 26,
    gap: 12,
    borderWidth: 1,
    borderColor: '#1d4ed8',
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  kicker: {
    color: '#93c5fd',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    color: '#ffffff',
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '900',
    maxWidth: 760,
  },
  text: {
    color: '#cbd5e1',
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 760,
  },
  primaryButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#2563eb',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 13,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 14,
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  featureCard: {
    flex: 1,
    minWidth: 210,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 18,
  },
  featureIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    color: '#0f172a',
    fontWeight: '900',
    fontSize: 16,
  },
  featureText: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.995 }],
  },
});