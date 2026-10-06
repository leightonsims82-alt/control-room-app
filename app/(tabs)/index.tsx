import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { useProgrammeData } from '../../data/programmeStore';
import { useSitePlanner } from '../../data/sitePlannerStore';
import { siteprogTheme } from '../../theme/siteprogTheme';
import { buildCanonicalQaPlots, canonicalEvidenceBelongsToPlot, findCanonicalQaPlot } from '../../utils/canonicalQaProgramme';
import { getCurrentProgrammeWeek, parseProgrammeDate } from '../../utils/programmeDates';
import { getActivitiesForTemplateDay } from '../../utils/templateProgramme';

type Tone = 'blue' | 'green' | 'red' | 'amber' | 'slate' | 'violet';
type DashboardMetricKey =
  | 'plots'
  | 'liveStages'
  | 'behindProgramme'
  | 'plotsOnHold'
  | 'openActions'
  | 'overdueActions'
  | 'inspectionIssues'
  | 'handover28d'
  | 'awaitingVerify'
  | 'tradeContacts';

type DrilldownRow = {
  id: string;
  title: string;
  meta: string;
  plotId?: string;
  tone?: Tone;
};

export default function DashboardScreen() {
  const { plotProgrammes, inspections, defects } = useProgrammeData();
  const { sitePlots, activityDelays, activityMoves, plotTemplates, tradeContacts, issueLogs, siteSetup } = useSitePlanner();
  const canonicalPlots = useMemo(
    () => buildCanonicalQaPlots(sitePlots, plotTemplates, siteSetup, plotProgrammes),
    [sitePlots, plotTemplates, siteSetup, plotProgrammes],
  );
  const [selectedMetric, setSelectedMetric] = useState<DashboardMetricKey | null>(null);

  const metrics = useMemo(() => {
    const canonicalDefects = defects.filter((defect) => canonicalPlots.some((plot) => canonicalEvidenceBelongsToPlot(plot, defect.plotProgrammeId)));
    const canonicalInspections = inspections.filter((inspection) => canonicalPlots.some((plot) => canonicalEvidenceBelongsToPlot(plot, inspection.plotProgrammeId)));
    const openActions = canonicalDefects.filter((defect) => defect.status !== 'Verified fixed');
    const verification = canonicalDefects.filter((defect) => defect.status === 'Fixed awaiting verification');
    const inspectionIssues = canonicalInspections.filter((inspection) =>
      ['Issues noted', 'Failed awaiting close out', 'Blocked'].includes(inspection.status),
    );

    const now = new Date();
    const currentProgrammeWeek = getCurrentProgrammeWeek(siteSetup.programmeStartDate);
    const utcDay = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())).getUTCDay();
    const currentProgrammeDay = utcDay === 0 ? 7 : utcDay;
    const inProgressStages = sitePlots.flatMap((plot) =>
      getActivitiesForTemplateDay(plot, currentProgrammeWeek, currentProgrammeDay, activityDelays, plotTemplates, siteSetup, activityMoves)
        .slice(0, 1)
        .map((activity) => ({
          id: `live-${plot.id}-${activity.code}`,
          plotProgrammeId: plot.id,
          stageName: activity.displayText || activity.code,
          trade: activity.trade,
        })),
    );

    const behindStages = sitePlots.flatMap((plot) => {
      const movement = activityMoves
        .filter((move) => move.plotId === plot.id)
        .reduce((total, move) => total + move.deltaDays, 0);
      if (movement <= 0) return [];
      return [{
        id: `behind-${plot.id}`,
        plotProgrammeId: plot.id,
        stageName: 'Live programme adjustment',
        endDate: `+${movement} working day${movement === 1 ? '' : 's'}`,
        delayDays: movement,
      }];
    });
    const heldSitePlots = sitePlots.filter((plot) => Boolean(plot.holdStage));

    const todayMs = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    const horizonMs = todayMs + 28 * 86400000;
    const handoversDue = canonicalPlots
      .map((plot) => ({ ...plot, endDate: plot.plotCompletionDate, parsed: parseProgrammeDate(plot.plotCompletionDate) }))
      .filter((plot) => plot.parsed && plot.parsed.getTime() >= todayMs && plot.parsed.getTime() <= horizonMs);

    const sevenDaysAgo = Date.now() - (7 * 86400000);
    const overdueActions = openActions.filter((action) => new Date(action.createdAt).getTime() < sevenDaysAgo);

    const risks = [
      ...behindStages.slice(0, 4).map((stage) => {
        const plot = canonicalPlots.find((item) => item.id === stage.plotProgrammeId);
        return {
          id: `risk-${stage.id}`,
          title: `${plot?.plotName ?? 'Plot'} is behind programme`,
          text: `Live programme has been pushed ${stage.endDate}.`,
          tone: 'red' as Tone,
        };
      }),
      ...inspectionIssues.slice(0, 3).map((inspection) => {
        const plot = findCanonicalQaPlot(canonicalPlots, inspection.plotProgrammeId);
        return {
          id: `inspection-${inspection.id}`,
          title: `${plot?.plotName ?? 'Plot'} has an inspection issue`,
          text: `${inspection.templateName} · ${inspection.status}.`,
          tone: 'amber' as Tone,
        };
      }),
      ...overdueActions.slice(0, 3).map((action) => {
        const plot = findCanonicalQaPlot(canonicalPlots, action.plotProgrammeId);
        return {
          id: `action-${action.id}`,
          title: `${plot?.plotName ?? 'Plot'} · ${action.trade}`,
          text: `Trade action open for more than 7 days: ${action.description}`,
          tone: 'red' as Tone,
        };
      }),
    ].slice(0, 6);

    return {
      totalPlots: canonicalPlots.length,
      inProgressStages,
      openActions,
      verification,
      inspectionIssues,
      behindStages,
      plotsBehind: behindStages.length,
      holds: heldSitePlots.length,
      heldProgrammes: [],
      heldSitePlots,
      handoversDue,
      overdueActions,
      risks,
    };
  }, [canonicalPlots, sitePlots, activityDelays, activityMoves, plotTemplates, siteSetup, defects, inspections]);

  const drilldown = useMemo(() => {
    if (!selectedMetric) return null;

    const findPlot = (plotId: string) => canonicalPlots.find((plot) => plot.id === plotId) ?? findCanonicalQaPlot(canonicalPlots, plotId);
    const rowsForPlotIds = (
      plotIds: string[],
      getMeta: (plotId: string) => string,
      tone: Tone,
    ): DrilldownRow[] => plotIds.map((plotId) => {
      const plot = findPlot(plotId);
      return {
        id: plotId,
        title: plot?.plotName ?? 'Plot',
        meta: getMeta(plotId),
        plotId: plot?.id,
        tone,
      };
    });

    if (selectedMetric === 'plots') {
      const rows: DrilldownRow[] = canonicalPlots.map((plot) => {
        const sitePlot = sitePlots.find((item) => item.id === plot.id);
        return {
          id: `plot-${plot.id}`,
          title: plot.plotName,
          meta: `${plot.plotStartDate || 'Derived start'} to ${plot.plotCompletionDate}${sitePlot?.holdStage ? ` · Held at stage ${sitePlot.holdStage}` : ''}`,
          plotId: plot.id,
          tone: sitePlot?.holdStage ? 'amber' : 'blue',
        };
      });
      return { title: 'All plots', subtitle: 'Canonical plots currently set up on this site.', rows };
    }

    if (selectedMetric === 'liveStages') {
      const plotIds = [...new Set(metrics.inProgressStages.map((stage) => stage.plotProgrammeId))];
      return {
        title: 'Live stages',
        subtitle: 'Plots with at least one stage currently marked In progress.',
        rows: rowsForPlotIds(plotIds, (plotId) => {
          const stages = metrics.inProgressStages.filter((stage) => stage.plotProgrammeId === plotId);
          return stages.map((stage) => `${stage.stageName} · ${stage.trade}`).join(' | ');
        }, 'blue'),
      };
    }

    if (selectedMetric === 'behindProgramme') {
      const plotIds = [...new Set(metrics.behindStages.map((stage) => stage.plotProgrammeId))];
      return {
        title: 'Behind programme',
        subtitle: 'Plots with incomplete stages whose planned finish date has passed.',
        rows: rowsForPlotIds(plotIds, (plotId) => {
          const overdue = metrics.behindStages.filter((stage) => stage.plotProgrammeId === plotId);
          const oldest = [...overdue].sort((a, b) => a.endDate.localeCompare(b.endDate))[0];
          return `${overdue.length} overdue stage${overdue.length === 1 ? '' : 's'} · ${oldest?.stageName ?? 'Stage'} was due ${oldest?.endDate ?? ''}`;
        }, 'red'),
      };
    }

    if (selectedMetric === 'plotsOnHold') {
      return {
        title: 'Plots on hold',
        subtitle: 'Canonical plots currently prevented from progressing.',
        rows: metrics.heldSitePlots.map((plot) => ({
          id: `hold-${plot.id}`,
          title: `Plot ${plot.plotNo}`,
          meta: `Held at stage ${plot.holdStage}${plot.holdReason ? ` · ${plot.holdReason}` : ''}`,
          plotId: plot.id,
          tone: 'amber' as Tone,
        })),
      };
    }

    if (selectedMetric === 'openActions') {
      const plotIds = [...new Set(metrics.openActions.map((action) => action.plotProgrammeId))];
      return {
        title: 'Open actions',
        subtitle: 'Plots with QA or trade actions that are not yet verified fixed.',
        rows: rowsForPlotIds(plotIds, (plotId) => {
          const actions = metrics.openActions.filter((action) => action.plotProgrammeId === plotId);
          const trades = [...new Set(actions.map((action) => action.trade))].join(', ');
          return `${actions.length} open action${actions.length === 1 ? '' : 's'} · ${trades}`;
        }, 'red'),
      };
    }

    if (selectedMetric === 'overdueActions') {
      const plotIds = [...new Set(metrics.overdueActions.map((action) => action.plotProgrammeId))];
      return {
        title: 'Overdue actions',
        subtitle: 'Plots with open actions more than 7 days old.',
        rows: rowsForPlotIds(plotIds, (plotId) => {
          const actions = metrics.overdueActions.filter((action) => action.plotProgrammeId === plotId);
          return `${actions.length} overdue action${actions.length === 1 ? '' : 's'} · oldest ${[...actions].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0]?.createdAt.slice(0, 10) ?? ''}`;
        }, 'red'),
      };
    }

    if (selectedMetric === 'inspectionIssues') {
      const plotIds = [...new Set(metrics.inspectionIssues.map((inspection) => inspection.plotProgrammeId))];
      return {
        title: 'Inspection issues',
        subtitle: 'Plots with inspections marked as an issue, failed close-out or blocked.',
        rows: rowsForPlotIds(plotIds, (plotId) => {
          const issues = metrics.inspectionIssues.filter((inspection) => inspection.plotProgrammeId === plotId);
          return issues.map((inspection) => `${inspection.templateName} · ${inspection.status}`).join(' | ');
        }, 'red'),
      };
    }

    if (selectedMetric === 'handover28d') {
      return {
        title: 'Handover in 28 days',
        subtitle: 'Plots whose planned completion falls within the next 28 days.',
        rows: metrics.handoversDue.map((plot) => ({
          id: `handover-${plot.id}`,
          title: plot.plotName,
          meta: `Planned completion ${plot.endDate}`,
          plotId: plot.id,
          tone: 'amber' as Tone,
        })),
      };
    }

    if (selectedMetric === 'awaitingVerify') {
      const plotIds = [...new Set(metrics.verification.map((action) => action.plotProgrammeId))];
      return {
        title: 'Awaiting verification',
        subtitle: 'Plots with reported fixes still waiting for site verification.',
        rows: rowsForPlotIds(plotIds, (plotId) => {
          const actions = metrics.verification.filter((action) => action.plotProgrammeId === plotId);
          return `${actions.length} item${actions.length === 1 ? '' : 's'} awaiting verification · ${[...new Set(actions.map((action) => action.trade))].join(', ')}`;
        }, 'amber'),
      };
    }

    return {
      title: 'Trade contacts',
      subtitle: 'Trade supervisors with contact details entered.',
      rows: tradeContacts
        .filter((contact) => contact.supervisorEmail.trim())
        .map((contact) => ({
          id: contact.id,
          title: contact.trade,
          meta: `${contact.contractor || 'Contractor not entered'} · ${contact.supervisorName || 'Supervisor not entered'} · ${contact.supervisorEmail}`,
          tone: 'violet' as Tone,
        })),
    };
  }, [selectedMetric, metrics, canonicalPlots, sitePlots, tradeContacts]);

  const latestIssue = issueLogs[0];
  const selectMetric = (key: DashboardMetricKey) => setSelectedMetric((current) => current === key ? null : key);

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
        <StatCard icon="home-outline" label="Plots" value={metrics.totalPlots} tone="blue" selected={selectedMetric === 'plots'} onPress={() => selectMetric('plots')} />
        <StatCard icon="construct-outline" label="Live stages" value={metrics.inProgressStages.length} tone="slate" selected={selectedMetric === 'liveStages'} onPress={() => selectMetric('liveStages')} />
        <StatCard icon="trending-down-outline" label="Behind programme" value={metrics.plotsBehind} tone={metrics.plotsBehind ? 'red' : 'green'} selected={selectedMetric === 'behindProgramme'} onPress={() => selectMetric('behindProgramme')} />
        <StatCard icon="pause-circle-outline" label="Plots on hold" value={metrics.holds} tone={metrics.holds ? 'amber' : 'green'} selected={selectedMetric === 'plotsOnHold'} onPress={() => selectMetric('plotsOnHold')} />
        <StatCard icon="warning-outline" label="Open actions" value={metrics.openActions.length} tone={metrics.openActions.length ? 'red' : 'green'} selected={selectedMetric === 'openActions'} onPress={() => selectMetric('openActions')} />
        <StatCard icon="time-outline" label="Overdue actions" value={metrics.overdueActions.length} tone={metrics.overdueActions.length ? 'red' : 'green'} selected={selectedMetric === 'overdueActions'} onPress={() => selectMetric('overdueActions')} />
        <StatCard icon="clipboard-outline" label="Inspection issues" value={metrics.inspectionIssues.length} tone={metrics.inspectionIssues.length ? 'red' : 'green'} selected={selectedMetric === 'inspectionIssues'} onPress={() => selectMetric('inspectionIssues')} />
        <StatCard icon="key-outline" label="Handover 28d" value={metrics.handoversDue.length} tone={metrics.handoversDue.length ? 'amber' : 'green'} selected={selectedMetric === 'handover28d'} onPress={() => selectMetric('handover28d')} />
        <StatCard icon="checkmark-done-outline" label="Awaiting verify" value={metrics.verification.length} tone={metrics.verification.length ? 'amber' : 'green'} selected={selectedMetric === 'awaitingVerify'} onPress={() => selectMetric('awaitingVerify')} />
        <StatCard icon="people-outline" label="Trade contacts" value={tradeContacts.filter((item) => item.supervisorEmail.trim()).length} tone="violet" selected={selectedMetric === 'tradeContacts'} onPress={() => selectMetric('tradeContacts')} />
      </View>

      {drilldown ? (
        <View style={styles.drilldownPanel}>
          <View style={styles.panelHeader}>
            <View style={styles.drilldownHeading}>
              <Text style={styles.sectionEyebrow}>Dashboard drill-down</Text>
              <Text style={styles.panelTitle}>{drilldown.title}</Text>
              <Text style={styles.drilldownSubtitle}>{drilldown.subtitle}</Text>
            </View>
            <Pressable style={styles.closeButton} onPress={() => setSelectedMetric(null)}>
              <Ionicons name="close" size={18} color={siteprogTheme.colors.text} />
            </Pressable>
          </View>
          {drilldown.rows.length === 0 ? (
            <View style={styles.clearState}>
              <Ionicons name="checkmark-circle-outline" size={22} color={siteprogTheme.colors.success} />
              <Text style={styles.clearText}>Nothing currently falls into this category.</Text>
            </View>
          ) : drilldown.rows.map((row) => {
            const content = (
              <View style={styles.drilldownRow}>
                <View style={[styles.riskDot, { backgroundColor: toneStyles[row.tone ?? 'slate'].text.color }]} />
                <View style={styles.rowMain}>
                  <Text style={styles.rowTitle}>{row.title}</Text>
                  <Text style={styles.rowMeta}>{row.meta}</Text>
                </View>
                {row.plotId ? <Ionicons name="chevron-forward" size={18} color={siteprogTheme.colors.muted} /> : null}
              </View>
            );
            return row.plotId ? (
              <Link key={row.id} href={`/plot/${row.plotId}` as never} asChild>
                <Pressable style={({ pressed }) => [pressed && styles.pressed]}>{content}</Pressable>
              </Link>
            ) : <View key={row.id}>{content}</View>;
          })}
        </View>
      ) : null}

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
            const plot = canonicalPlots.find((item) => item.id === stage.plotProgrammeId);
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
            const plot = findCanonicalQaPlot(canonicalPlots, action.plotProgrammeId);
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

function StatCard({
  icon,
  label,
  value,
  tone,
  selected,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  tone: Tone;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}. Show details.`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.statCard,
        toneStyles[tone].card,
        selected && styles.statCardSelected,
        pressed && styles.statCardPressed,
      ]}
    >
      <View style={styles.statTopRow}>
        <Ionicons name={icon} size={21} color={toneStyles[tone].text.color} />
        <Ionicons name={selected ? 'chevron-up' : 'chevron-down'} size={16} color={toneStyles[tone].text.color} />
      </View>
      <Text style={[styles.statValue, toneStyles[tone].text]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Pressable>
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
  statCardSelected: { borderWidth: 2, transform: [{ translateY: -1 }] },
  statCardPressed: { opacity: 0.8 },
  statTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statValue: { fontSize: 25, fontWeight: '900', marginTop: 3 },
  statLabel: { color: siteprogTheme.colors.muted, fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  drilldownPanel: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE3F0', borderRadius: 16, padding: 16, gap: 4 },
  drilldownHeading: { flex: 1, minWidth: 220 },
  drilldownSubtitle: { color: siteprogTheme.colors.muted, fontSize: 12, lineHeight: 18, marginTop: 3 },
  closeButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F1F3F7', alignItems: 'center', justifyContent: 'center' },
  drilldownRow: { borderTopWidth: 1, borderTopColor: '#EEF0F4', paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 10 },
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