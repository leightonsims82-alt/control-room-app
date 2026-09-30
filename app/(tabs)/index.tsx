import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { useProgrammeData } from '../../data/programmeStore';
import { useSitePlanner } from '../../data/sitePlannerStore';
import { siteprogTheme } from '../../theme/siteprogTheme';

function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

export default function DashboardScreen() {
  const { plotProgrammes, plotStages, inspections, defects } = useProgrammeData();
  const { sitePlots, tradeContacts, issueLogs, siteSetup } = useSitePlanner();

  const metrics = useMemo(() => {
    const totalPlots = Math.max(sitePlots.length, plotProgrammes.length);
    const inProgressStages = plotStages.filter((stage) => stage.status === 'In progress');
    const openActions = defects.filter((defect) => defect.status !== 'Verified fixed');
    const verification = defects.filter((defect) => defect.status === 'Fixed awaiting verification');
    const inspectionIssues = inspections.filter((inspection) =>
      ['Issues noted', 'Failed awaiting close out', 'Blocked'].includes(inspection.status),
    );
    const today = dateOnly(new Date());
    const horizon = new Date();
    horizon.setDate(horizon.getDate() + 28);
    const horizonDate = dateOnly(horizon);
    const behindStages = plotStages.filter((stage) => stage.status !== 'Complete' && stage.endDate < today);
    const plotsBehind = new Set(behindStages.map((stage) => stage.plotProgrammeId));
    const holds = plotProgrammes.filter((plot) => plot.holdStatus === 'On hold').length
      + sitePlots.filter((plot) => Boolean(plot.holdStage)).length;
    const handoversDue = plotProgrammes.filter((plot) => plot.endDate >= today && plot.endDate <= horizonDate);
    const sevenDaysAgo = Date.now() - (7 * 86400000);
    const overdueActions = openActions.filter((action) => new Date(action.createdAt).getTime() < sevenDaysAgo);

    const risks = [
      ...behindStages.slice(0, 4).map((stage) => {
        const plot = plotProgrammes.find((item) => item.id === stage.plotProgrammeId);
        return {
          id: `behind-${stage.id}`,
          title: `${plot?.plotName ?? 'Plot'} is behind programme`,
          text: `${stage.stageName} was due to finish ${stage.endDate}.`,
          tone: 'red' as Tone,
        };
      }),
      ...inspectionIssues.slice(0, 3).map((inspection) => {
        const plot = plotProgrammes.find((item) => item.id === inspection.plotProgrammeId);
        return {
          id: `inspection-${inspection.id}`,
          title: `${plot?.plotName ?? 'Plot'} has an inspection issue`,
          text: `${inspection.templateName} · ${inspection.status}.`,
          tone: 'amber' as Tone,
        };
      }),
      ...overdueActions.slice(0, 3).map((action) => {
        const plot = plotProgrammes.find((item) => item.id === action.plotProgrammeId);
        return {
          id: `action-${action.id}`,
          title: `${plot?.plotName ?? 'Plot'} · ${action.trade}`,
          text: `Trade action open for more than 7 days: ${action.description}`,
          tone: 'red' as Tone,
        };
      }),
    ].slice(0, 6);

    return {
      totalPlots,
      inProgressStages,
      openActions,
      verification,
      inspectionIssues,
      plotsBehind: plotsBehind.size,
      holds,
      handoversDue,
      overdueActions,
      risks,
    };
  }, [sitePlots, plotProgrammes, plotStages, defects, inspections]);

  const latestIssue = issueLogs[0];

  return (
    <AppScreen>
      <View style={styles.hero}>
        <View style={styles.heroCopy}>
          <Text style={styles.kicker}>Dashboard</Text>
          <Text style={styles.title}>{siteSetup.siteName || 'Programme Buddy'}</Text>
          <Text style={styles.subtitle}>Programme, quality, trade actions and daily control in one live dashboard.</Text>
        </View>
        <Link href="/site/setup" asChild>
          <Pressable style={styles.setupButton}>
            <Ionicons name="settings-outline" size={17} color="#ffffff" />
            <Text style={styles.setupButtonText}>Site Setup</Text>
          </Pressable>
        </Link>
      </View>

      <View style={styles.statGrid}>
        <StatCard icon="home-outline" label="Plots" value={metrics.totalPlots} tone="blue" />
        <StatCard icon="construct-outline" label="Live stages" value={metrics.inProgressStages.length} tone="slate" />
        <StatCard icon="trending-down-outline" label="Behind programme" value={metrics.plotsBehind} tone={metrics.plotsBehind ? 'red' : 'green'} />
        <StatCard icon="pause-circle-outline" label="Plots on hold" value={metrics.holds} tone={metrics.holds ? 'amber' : 'green'} />
        <StatCard icon="warning-outline" label="Open actions" value={metrics.openActions.length} tone={metrics.openActions.length ? 'red' : 'green'} />
        <StatCard icon="time-outline" label="Overdue actions" value={metrics.overdueActions.length} tone={metrics.overdueActions.length ? 'red' : 'green'} />
        <StatCard icon="clipboard-outline" label="Inspection issues" value={metrics.inspectionIssues.length} tone={metrics.inspectionIssues.length ? 'red' : 'green'} />
        <StatCard icon="key-outline" label="Handover 28d" value={metrics.handoversDue.length} tone={metrics.handoversDue.length ? 'amber' : 'green'} />
        <StatCard icon="checkmark-done-outline" label="Awaiting verify" value={metrics.verification.length} tone={metrics.verification.length ? 'amber' : 'green'} />
        <StatCard icon="people-outline" label="Trade contacts" value={tradeContacts.filter((item) => item.supervisorEmail.trim()).length} tone="violet" />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>Today</Text>
            <Text style={styles.sectionTitle}>Site manager control loop</Text>
          </View>
        </View>
        <View style={styles.quickGrid}>
          <QuickLink href="/(tabs)/walk" icon="walk-outline" title="8am Walk" text="Check live plots, labour, starts and blockers." />
          <QuickLink href="/(tabs)/two-week" icon="grid-outline" title="2 Week Programme" text="Control the next 14 days and move activities." />
          <QuickLink href="/(tabs)/qa" icon="shield-checkmark-outline" title="QA & Actions" text="Inspect evidence, close defects and verify fixes." />
          <QuickLink href="/handover" icon="key-outline" title="Handover" text="Track plot readiness, certificates, cleaning and open QA." />
          <QuickLink href="/(tabs)/dabs" icon="people-circle-outline" title="DABS" text="Record the PM briefing, risks and agreed actions." />
          <QuickLink href="/cloud" icon="cloud-done-outline" title="Cloud Backup" text="Protect the site data and restore it on another device." />
        </View>
      </View>

      <View style={styles.intelligencePanel}>
        <View style={styles.panelHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>Programme intelligence</Text>
            <Text style={styles.panelTitle}>What needs attention now</Text>
          </View>
          <Link href="/(tabs)/master" style={styles.linkText}>Open master</Link>
        </View>
        {metrics.risks.length === 0 ? (
          <View style={styles.clearState}>
            <Ionicons name="checkmark-circle-outline" size={22} color={siteprogTheme.colors.success} />
            <Text style={styles.clearText}>No overdue stages, aged actions or inspection blockers detected.</Text>
          </View>
        ) : metrics.risks.map((risk) => (
          <View key={risk.id} style={styles.riskRow}>
            <View style={[styles.riskDot, { backgroundColor: toneStyles[risk.tone].text.color }]} />
            <View style={styles.rowMain}>
              <Text style={styles.rowTitle}>{risk.title}</Text>
              <Text style={styles.rowMeta}>{risk.text}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.twoColumn}>
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Live programme</Text>
            <Link href="/(tabs)/master" style={styles.linkText}>Open master</Link>
          </View>
          {metrics.inProgressStages.length === 0 ? (
            <Text style={styles.emptyText}>No stages are currently marked In progress.</Text>
          ) : metrics.inProgressStages.slice(0, 6).map((stage) => {
            const plot = plotProgrammes.find((item) => item.id === stage.plotProgrammeId);
            return (
              <View key={stage.id} style={styles.row}>
                <View style={styles.rowMain}>
                  <Text style={styles.rowTitle}>{plot?.plotName ?? 'Plot'}</Text>
                  <Text style={styles.rowMeta}>{stage.stageName} · {stage.trade}</Text>
                </View>
                <StatusPill text="In progress" tone="blue" />
              </View>
            );
          })}
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Actions requiring attention</Text>
            <Link href="/(tabs)/qa" style={styles.linkText}>Open QA</Link>
          </View>
          {metrics.openActions.length === 0 ? (
            <Text style={styles.emptyText}>No open trade actions. ✅</Text>
          ) : metrics.openActions.slice(0, 6).map((action) => {
            const plot = plotProgrammes.find((item) => item.id === action.plotProgrammeId);
            return (
              <View key={action.id} style={styles.row}>
                <View style={styles.rowMain}>
                  <Text style={styles.rowTitle}>{plot?.plotName ?? 'Plot'} · {action.trade}</Text>
                  <Text numberOfLines={2} style={styles.rowMeta}>{action.description}</Text>
                </View>
                <StatusPill text={action.status} tone={action.status === 'Fixed awaiting verification' ? 'amber' : 'red'} />
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.footerPanel}>
        <View style={{ flex: 1, minWidth: 240 }}>
          <Text style={styles.footerTitle}>Latest programme issue</Text>
          <Text style={styles.footerText}>{latestIssue ? `${latestIssue.note} · ${new Date(latestIssue.issuedAt).toLocaleString('en-GB')}` : 'No formal programme issue has been recorded yet.'}</Text>
        </View>
        <Link href="/(tabs)/issue" asChild>
          <Pressable style={styles.darkButton}>
            <Ionicons name="send-outline" size={17} color="#ffffff" />
            <Text style={styles.darkButtonText}>Issue Programme</Text>
          </Pressable>
        </Link>
      </View>
    </AppScreen>
  );
}

function StatCard({ icon, label, value, tone }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string | number; tone: Tone }) {
  return (
    <View style={[styles.statCard, toneStyles[tone].card]}>
      <Ionicons name={icon} size={21} color={toneStyles[tone].text.color} />
      <Text style={[styles.statValue, toneStyles[tone].text]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function QuickLink({ href, icon, title, text }: { href: string; icon: keyof typeof Ionicons.glyphMap; title: string; text: string }) {
  return (
    <Link href={href as never} asChild>
      <Pressable style={({ pressed }) => [styles.quickCard, pressed && styles.pressed]}>
        <View style={styles.quickIcon}><Ionicons name={icon} size={23} color={siteprogTheme.colors.blue} /></View>
        <Text style={styles.quickTitle}>{title}</Text>
        <Text style={styles.quickText}>{text}</Text>
        <Text style={styles.quickOpen}>Open →</Text>
      </Pressable>
    </Link>
  );
}

type Tone = 'blue' | 'green' | 'red' | 'amber' | 'slate' | 'violet';

const toneStyles: Record<Tone, { card: object; text: { color: string } }> = {
  blue: { card: { backgroundColor: siteprogTheme.colors.blueSoft, borderColor: '#D8DEFF' }, text: { color: siteprogTheme.colors.blueDark } },
  green: { card: { backgroundColor: siteprogTheme.colors.successSoft, borderColor: '#BFEBD8' }, text: { color: '#087A52' } },
  red: { card: { backgroundColor: siteprogTheme.colors.dangerSoft, borderColor: '#F5C6C2' }, text: { color: siteprogTheme.colors.danger } },
  amber: { card: { backgroundColor: siteprogTheme.colors.warningSoft, borderColor: '#F6D69A' }, text: { color: siteprogTheme.colors.warning } },
  slate: { card: { backgroundColor: '#F1F3F7', borderColor: '#D7DCE5' }, text: { color: '#344054' } },
  violet: { card: { backgroundColor: '#F3F0FF', borderColor: '#DCD4FF' }, text: { color: '#6941C6' } },
};

function StatusPill({ text, tone }: { text: string; tone: Tone }) {
  return (
    <View style={[styles.statusPill, toneStyles[tone].card]}>
      <Text style={[styles.statusText, toneStyles[tone].text]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: siteprogTheme.colors.navy, borderRadius: 18, padding: 22, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', borderWidth: 1, borderColor: siteprogTheme.colors.navySoft },
  heroCopy: { flex: 1, minWidth: 240 },
  kicker: { color: '#AAB6DA', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.9 },
  title: { color: '#ffffff', fontSize: 30, fontWeight: '900', marginTop: 4 },
  subtitle: { color: '#D6DDF0', fontSize: 14, lineHeight: 21, marginTop: 5, maxWidth: 760 },
  setupButton: { backgroundColor: siteprogTheme.colors.blue, borderRadius: siteprogTheme.radius.pill, paddingHorizontal: 15, paddingVertical: 11, flexDirection: 'row', gap: 7, alignItems: 'center' },
  setupButtonText: { color: '#ffffff', fontWeight: '900', fontSize: 12 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { flex: 1, minWidth: 135, borderWidth: 1, borderRadius: 14, padding: 14, gap: 3 },
  statValue: { fontSize: 25, fontWeight: '900', marginTop: 3 },
  statLabel: { color: siteprogTheme.colors.muted, fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  section: { backgroundColor: siteprogTheme.colors.card, borderWidth: 1, borderColor: siteprogTheme.colors.border, borderRadius: 16, padding: 16, gap: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  sectionEyebrow: { color: siteprogTheme.colors.blue, fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  sectionTitle: { color: siteprogTheme.colors.text, fontSize: 19, fontWeight: '900', marginTop: 2 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickCard: { flex: 1, minWidth: 190, backgroundColor: '#FBFCFF', borderWidth: 1, borderColor: siteprogTheme.colors.border, borderRadius: 14, padding: 14, gap: 5 },
  quickIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: siteprogTheme.colors.blueSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  quickTitle: { color: siteprogTheme.colors.text, fontWeight: '900', fontSize: 15 },
  quickText: { color: siteprogTheme.colors.muted, fontSize: 12, lineHeight: 18 },
  quickOpen: { color: siteprogTheme.colors.blueDark, fontWeight: '900', fontSize: 12, marginTop: 2 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.995 }] },
  intelligencePanel: { backgroundColor: '#FBFCFF', borderWidth: 1, borderColor: '#DCE3F0', borderRadius: 16, padding: 16, gap: 8 },
  clearState: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 4 },
  clearText: { color: '#087A52', fontSize: 13, fontWeight: '800' },
  riskRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', borderTopWidth: 1, borderTopColor: '#EEF0F4', paddingTop: 10 },
  riskDot: { width: 9, height: 9, borderRadius: 999, marginTop: 4 },
  twoColumn: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  panel: { flex: 1, minWidth: 310, backgroundColor: siteprogTheme.colors.card, borderWidth: 1, borderColor: siteprogTheme.colors.border, borderRadius: 16, padding: 16, gap: 8 },
  panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  panelTitle: { color: siteprogTheme.colors.text, fontSize: 18, fontWeight: '900' },
  linkText: { color: siteprogTheme.colors.blueDark, fontWeight: '900', fontSize: 12 },
  row: { borderTopWidth: 1, borderTopColor: '#EEF0F4', paddingTop: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowMain: { flex: 1 },
  rowTitle: { color: siteprogTheme.colors.text, fontWeight: '900', fontSize: 13 },
  rowMeta: { color: siteprogTheme.colors.muted, fontSize: 11, fontWeight: '700', marginTop: 2, lineHeight: 16 },
  statusPill: { borderWidth: 1, borderRadius: siteprogTheme.radius.pill, paddingHorizontal: 9, paddingVertical: 6 },
  statusText: { fontSize: 10, fontWeight: '900' },
  emptyText: { color: siteprogTheme.colors.muted, fontSize: 13, lineHeight: 19 },
  footerPanel: { backgroundColor: siteprogTheme.colors.card, borderWidth: 1, borderColor: siteprogTheme.colors.border, borderRadius: 16, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap' },
  footerTitle: { color: siteprogTheme.colors.text, fontWeight: '900', fontSize: 16 },
  footerText: { color: siteprogTheme.colors.muted, fontSize: 12, lineHeight: 18, marginTop: 3, maxWidth: 760 },
  darkButton: { backgroundColor: siteprogTheme.colors.navy, borderRadius: siteprogTheme.radius.pill, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 7 },
  darkButtonText: { color: '#ffffff', fontSize: 12, fontWeight: '900' },
});
