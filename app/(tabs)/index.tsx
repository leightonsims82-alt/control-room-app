import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { useSitePlanner } from '../../data/sitePlannerStore';

type DashboardRoute = '/two-week' | '/master' | '/plots' | '/trades' | '/qa' | '/exports' | '/more';

type ProgrammeCard = {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  colour: string;
  href: DashboardRoute;
};

const mainCards: ProgrammeCard[] = [
  { title: 'Master Programme', subtitle: '23-week plot programme, stages and handover milestones', icon: 'calendar-outline', colour: '#2563eb', href: '/master' },
  { title: 'Plot Breakdown', subtitle: 'Daily plot-by-plot progress in the Excel-style layout', icon: 'business-outline', colour: '#0f766e', href: '/plots' },
  { title: 'Trade Programmes', subtitle: 'Trade call-offs, lookaheads and recovery actions', icon: 'briefcase-outline', colour: '#f97316', href: '/trades' },
  { title: 'QA / Plot Story', subtitle: 'Photos, QA comments and plot progress evidence', icon: 'shield-checkmark-outline', colour: '#7c3aed', href: '/qa' },
  { title: 'Exports', subtitle: 'Create site-ready Excel, PDF and wall chart outputs', icon: 'download-outline', colour: '#16a34a', href: '/exports' },
];

export default function DashboardScreen() {
  const { sitePlots, tradeContacts, issueLogs } = useSitePlanner();
  const hasPlots = sitePlots.length > 0;

  return (
    <AppScreen>
      <View style={styles.header}>
        <View style={styles.headerTextWrap}>
          <Text style={styles.kicker}>Programme Buddy</Text>
          <Text style={styles.title}>Site programme control</Text>
          <Text style={styles.subtitle}>Trade planning, plot progress and weekly programme management in one clean workspace.</Text>
        </View>
        <View style={styles.badge}>
          <Ionicons name="checkmark-circle" size={14} color="#15803d" />
          <Text style={styles.badgeText}>Test access open</Text>
        </View>
      </View>

      {!hasPlots ? (
        <View style={styles.setupPrompt}>
          <Text style={styles.setupTitle}>Start by adding your own plots</Text>
          <Text style={styles.setupText}>The demo plot data has been cleared. Add plot numbers, house types and handover weeks to test the programme properly.</Text>
          <Link href="/plots" asChild>
            <Pressable style={styles.setupButton}><Text style={styles.setupButtonText}>Open Plot Breakdown</Text></Pressable>
          </Link>
        </View>
      ) : null}

      <View style={styles.summaryGrid}>
        <SummaryTile label="Active plots" value={sitePlots.length} icon="business-outline" />
        <SummaryTile label="Trade contacts" value={tradeContacts.length} icon="people-outline" />
        <SummaryTile label="QA items" value={0} icon="shield-checkmark-outline" />
        <SummaryTile label="Issue logs" value={issueLogs.length} icon="download-outline" />
      </View>

      <Link href="/two-week" asChild>
        <Pressable style={({ pressed }) => [styles.heroCard, pressed && styles.pressed]}>
          <View style={styles.heroIconWrap}><Ionicons name="grid-outline" size={30} color="#fff" /></View>
          <View style={styles.heroTextWrap}>
            <Text style={styles.heroTitle}>2-Week Programme</Text>
            <Text style={styles.heroSubtitle}>Live trade lookahead, plot progress and daily activity control.</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#2563eb" />
        </Pressable>
      </Link>

      <View style={styles.cardGrid}>
        {mainCards.map((card) => (
          <Link key={card.title} href={card.href} asChild>
            <Pressable style={({ pressed }) => [styles.programmeCard, pressed && styles.pressed]}>
              <View style={[styles.cardIconWrap, { backgroundColor: `${card.colour}14` }]}><Ionicons name={card.icon} size={24} color={card.colour} /></View>
              <View style={styles.cardTextWrap}>
                <Text style={styles.programmeTitle}>{card.title}</Text>
                <Text style={styles.programmeText}>{card.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
            </Pressable>
          </Link>
        ))}
      </View>

      <Link href="/more" asChild>
        <Pressable style={({ pressed }) => [styles.adminCard, pressed && styles.pressed]}>
          <Ionicons name="ellipsis-horizontal-circle-outline" size={22} color="#64748b" />
          <View style={styles.cardTextWrap}>
            <Text style={styles.adminTitle}>Admin / More</Text>
            <Text style={styles.adminText}>Setup, access, billing, wall charts and testing tools are kept away from the main dashboard.</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
        </Pressable>
      </Link>
    </AppScreen>
  );
}

function SummaryTile({ label, value, icon }: { label: string; value: number; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.summaryTile}>
      <View style={styles.summaryIconWrap}><Ionicons name={icon} size={18} color="#2563eb" /></View>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' },
  headerTextWrap: { flex: 1, minWidth: 260 },
  kicker: { color: '#2563eb', fontSize: 13, fontWeight: '900', letterSpacing: 0.3, textTransform: 'uppercase' },
  title: { marginTop: 4, fontSize: 32, fontWeight: '900', color: '#0f172a', letterSpacing: -0.6 },
  subtitle: { marginTop: 6, fontSize: 15, color: '#64748b', lineHeight: 22, maxWidth: 720 },
  badge: { backgroundColor: '#dcfce7', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#bbf7d0' },
  badgeText: { color: '#15803d', fontWeight: '900', fontSize: 12 },
  setupPrompt: { backgroundColor: '#eff6ff', borderRadius: 20, borderWidth: 1, borderColor: '#bfdbfe', padding: 18, gap: 8 },
  setupTitle: { color: '#0f172a', fontSize: 18, fontWeight: '900' },
  setupText: { color: '#475569', fontSize: 14, lineHeight: 21 },
  setupButton: { alignSelf: 'flex-start', backgroundColor: '#0f172a', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginTop: 4 },
  setupButtonText: { color: '#fff', fontWeight: '900' },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  summaryTile: { flex: 1, minWidth: 135, backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#e2e8f0', padding: 16 },
  summaryIconWrap: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  summaryValue: { color: '#0f172a', fontSize: 24, fontWeight: '900' },
  summaryLabel: { color: '#64748b', fontSize: 12, fontWeight: '800', marginTop: 2 },
  heroCard: { backgroundColor: '#fff', borderRadius: 24, borderWidth: 1, borderColor: '#bfdbfe', padding: 22, flexDirection: 'row', alignItems: 'center', gap: 16, shadowColor: '#0f172a', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
  heroIconWrap: { width: 58, height: 58, borderRadius: 18, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },
  heroTextWrap: { flex: 1 },
  heroTitle: { color: '#0f172a', fontSize: 22, fontWeight: '900' },
  heroSubtitle: { color: '#475569', fontSize: 14, lineHeight: 20, marginTop: 4 },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  programmeCard: { flex: 1, minWidth: 280, backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#e2e8f0', padding: 18, flexDirection: 'row', gap: 14, alignItems: 'center' },
  pressed: { opacity: 0.78, transform: [{ scale: 0.995 }] },
  cardIconWrap: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  cardTextWrap: { flex: 1 },
  programmeTitle: { color: '#0f172a', fontWeight: '900', fontSize: 16 },
  programmeText: { color: '#64748b', fontSize: 12, marginTop: 3, lineHeight: 17 },
  adminCard: { backgroundColor: '#f8fafc', borderRadius: 18, borderWidth: 1, borderColor: '#e2e8f0', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  adminTitle: { color: '#334155', fontWeight: '900', fontSize: 14 },
  adminText: { color: '#64748b', fontSize: 12, marginTop: 2, lineHeight: 17 },
});
