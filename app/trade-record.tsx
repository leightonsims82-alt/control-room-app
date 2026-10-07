import { Ionicons } from '@expo/vector-icons';
import { Link, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../components/AppScreen';
import { SectionCard } from '../components/SectionCard';
import { useProgrammeData } from '../data/programmeStore';
import { useSitePlanner } from '../data/sitePlannerStore';
import { formatCalendarWeek, getCurrentProgrammeWeek } from '../utils/programmeDates';
import { getActivitiesForTemplateDay, getWorkingDayNumbers } from '../utils/templateProgramme';

export default function TradeRecord() {
  const params = useLocalSearchParams<{ trade?: string }>();
  const { sitePlots, plotTemplates, activityDelays, activityMoves, tradeContacts, issueLogs, siteSetup } = useSitePlanner();
  const { defects } = useProgrammeData();
  const trade = decodeURIComponent(String(params.trade || tradeContacts[0]?.trade || 'Trade'));
  const contact = tradeContacts.find((item) => item.trade.toLowerCase() === trade.toLowerCase());
  const startWeek = getCurrentProgrammeWeek(siteSetup.programmeStartDate);
  const workingDays = getWorkingDayNumbers(siteSetup);

  const planned = useMemo(() => {
    return sitePlots.flatMap((plot) => {
      const cells = [startWeek, startWeek + 1].flatMap((week) =>
        workingDays.flatMap((day) =>
          getActivitiesForTemplateDay(plot, week, day, activityDelays, plotTemplates, siteSetup, activityMoves)
            .filter((activity) => activity.trade.toLowerCase() === trade.toLowerCase())
            .map((activity) => ({ plot, activity, week, day })),
        ),
      );
      const unique = new Map(cells.map((item) => [`${item.plot.id}|${item.activity.code}`, item]));
      return [...unique.values()];
    });
  }, [sitePlots, startWeek, workingDays, activityDelays, plotTemplates, siteSetup, activityMoves, trade]);

  const openActions = defects.filter((item) => item.trade.toLowerCase() === trade.toLowerCase() && item.status !== 'Verified fixed');
  const relevantIssues = issueLogs.filter((item) => item.note.toLowerCase().includes(trade.toLowerCase()));

  return (
    <AppScreen>
      <Link href="/trades" style={styles.back}>← Trades</Link>

      <View style={styles.hero}>
        <View style={styles.icon}><Ionicons name="briefcase-outline" size={26} color="#ffffff" /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>Trade record</Text>
          <Text style={styles.title}>{trade}</Text>
          <Text style={styles.subtitle}>{contact?.contractor || 'Contractor not entered'} · {contact?.supervisorName || 'Supervisor not entered'}</Text>
        </View>
      </View>

      <View style={styles.stats}>
        <Stat label="Planned activities" value={planned.length} />
        <Stat label="Open QA actions" value={openActions.length} danger={openActions.length > 0} />
        <Stat label="Issue records" value={relevantIssues.length} />
      </View>

      <SectionCard
        title="Current 2-week workload"
        subtitle={`${formatCalendarWeek(siteSetup.programmeStartDate, startWeek, siteSetup.calendarWeekOne)} + ${formatCalendarWeek(siteSetup.programmeStartDate, startWeek + 1, siteSetup.calendarWeekOne)}`}
      >
        {planned.length ? planned.map((item) => (
          <View key={`${item.plot.id}-${item.activity.code}`} style={styles.row}>
            <View style={styles.plotBadge}><Text style={styles.plotText}>{item.plot.plotNo}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{item.activity.displayText || item.activity.code}</Text>
              <Text style={styles.meta}>Stage {item.activity.stage} · {formatCalendarWeek(siteSetup.programmeStartDate, item.week, siteSetup.calendarWeekOne)}</Text>
            </View>
          </View>
        )) : <Text style={styles.empty}>No planned work for this trade in the current two-week window.</Text>}
      </SectionCard>

      <SectionCard title="Open trade actions" subtitle="QA defects assigned to this trade that are not yet verified fixed.">
        {openActions.length ? openActions.map((action) => (
          <View key={action.id} style={styles.actionRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{action.description}</Text>
              <Text style={styles.meta}>{action.status} · {action.createdAt.slice(0, 10)}</Text>
            </View>
            <Link href="/qa" asChild>
              <Pressable style={styles.openButton}><Text style={styles.openButtonText}>Open QA</Text></Pressable>
            </Link>
          </View>
        )) : <Text style={styles.good}>No open QA actions for {trade}. ✓</Text>}
      </SectionCard>

      <SectionCard title="Supervisor contact" subtitle="Contact details used by the issue and supervisor workflows.">
        <Info label="Contractor" value={contact?.contractor || 'Not entered'} />
        <Info label="Supervisor" value={contact?.supervisorName || 'Not entered'} />
        <Info label="Email" value={contact?.supervisorEmail || 'Not entered'} />
        <Info label="Phone" value={contact?.supervisorPhone || 'Not entered'} />
        <View style={styles.buttons}>
          <Link href={`/supervisor?trade=${encodeURIComponent(trade)}`} asChild>
            <Pressable style={styles.primary}><Text style={styles.primaryText}>Open Live Programme</Text></Pressable>
          </Link>
          <Link href="/trades" asChild>
            <Pressable style={styles.secondary}><Text style={styles.secondaryText}>Edit Trade Setup</Text></Pressable>
          </Link>
        </View>
      </SectionCard>
    </AppScreen>
  );
}

function Stat({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return <View style={[styles.stat, danger ? styles.statDanger : null]}><Text style={[styles.statValue, danger ? styles.dangerText : null]}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <View style={styles.infoRow}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View>;
}

const styles=StyleSheet.create({
  back:{ color:'#2563eb',fontWeight:'900' },
  hero:{ flexDirection:'row',alignItems:'center',gap:14,backgroundColor:'#0f172a',borderRadius:22,padding:18 },
  icon:{ width:50,height:50,borderRadius:15,backgroundColor:'#2563eb',alignItems:'center',justifyContent:'center' },
  kicker:{ color:'#93c5fd',fontSize:11,fontWeight:'900',textTransform:'uppercase' },
  title:{ color:'#ffffff',fontSize:28,fontWeight:'900',marginTop:2 },
  subtitle:{ color:'#cbd5e1',fontSize:12,marginTop:3 },
  stats:{ flexDirection:'row',flexWrap:'wrap',gap:10 },
  stat:{ flex:1,minWidth:130,backgroundColor:'#ffffff',borderWidth:1,borderColor:'#e2e8f0',borderRadius:15,padding:14 },
  statDanger:{ borderColor:'#fecaca',backgroundColor:'#fff7f7' },
  statValue:{ color:'#0f172a',fontSize:22,fontWeight:'900' },
  dangerText:{ color:'#dc2626' },
  statLabel:{ color:'#64748b',fontSize:10,fontWeight:'900',textTransform:'uppercase' },
  row:{ flexDirection:'row',alignItems:'center',gap:10,borderTopWidth:1,borderTopColor:'#f1f5f9',paddingTop:10 },
  plotBadge:{ minWidth:44,borderRadius:10,backgroundColor:'#eff6ff',paddingHorizontal:9,paddingVertical:7,alignItems:'center' },
  plotText:{ color:'#1d4ed8',fontWeight:'900' },
  rowTitle:{ color:'#0f172a',fontWeight:'900',fontSize:13 },
  meta:{ color:'#64748b',fontSize:11,fontWeight:'700',marginTop:2 },
  empty:{ color:'#64748b',fontWeight:'700' },
  good:{ color:'#166534',fontWeight:'900' },
  actionRow:{ flexDirection:'row',alignItems:'center',gap:10,borderTopWidth:1,borderTopColor:'#f1f5f9',paddingTop:10 },
  openButton:{ backgroundColor:'#eff6ff',borderRadius:999,paddingHorizontal:10,paddingVertical:7 },
  openButtonText:{ color:'#1d4ed8',fontSize:11,fontWeight:'900' },
  infoRow:{ flexDirection:'row',justifyContent:'space-between',gap:12,borderTopWidth:1,borderTopColor:'#f1f5f9',paddingTop:10 },
  infoLabel:{ color:'#64748b',fontWeight:'800' },
  infoValue:{ color:'#0f172a',fontWeight:'900',textAlign:'right' },
  buttons:{ flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:4 },
  primary:{ backgroundColor:'#0f172a',borderRadius:999,paddingHorizontal:13,paddingVertical:10 },
  primaryText:{ color:'#ffffff',fontWeight:'900',fontSize:12 },
  secondary:{ backgroundColor:'#ffffff',borderWidth:1,borderColor:'#cbd5e1',borderRadius:999,paddingHorizontal:13,paddingVertical:10 },
  secondaryText:{ color:'#1d4ed8',fontWeight:'900',fontSize:12 },
});
