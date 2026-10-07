import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { SectionCard } from '../../components/SectionCard';
import { useSitePlanner } from '../../data/sitePlannerStore';
import { formatBritishDate, getProgrammeWeekForDate } from '../../utils/programmeDates';
import { getActivitiesForTemplateDay, getWorkingDayNumbers } from '../../utils/templateProgramme';

const DABS_MEETING_KEY = 'siteprog:dabs-standalone-meetings:v1';

type DabsMeeting = {
  id: string;
  meetingDate: string;
  chair: string;
  attendees: string;
  agenda: string;
  tomorrowFocus: string;
  risksAndBlockers: string;
  actionsAgreed: string;
  meetingNotes: string;
  completed: boolean;
  updatedAt: string;
};

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getNextProgrammeWorkingDate(includeSaturday: boolean, includeSunday: boolean) {
  const workingDays = [1, 2, 3, 4, 5, ...(includeSaturday ? [6] : []), ...(includeSunday ? [7] : [])];
  const now = new Date();
  const date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  for (let guard = 0; guard < 8; guard += 1) {
    date.setUTCDate(date.getUTCDate() + 1);
    const day = date.getUTCDay() || 7;
    if (workingDays.includes(day)) return date;
  }
  return date;
}

function createBlankMeeting(): DabsMeeting {
  const today = getTodayDate();
  return {
    id: `dabs-${today}`,
    meetingDate: today,
    chair: '',
    attendees: '',
    agenda: 'Daily activity briefing, programme position, labour, materials, inspections, blockers, safety and quality actions.',
    tomorrowFocus: '',
    risksAndBlockers: '',
    actionsAgreed: '',
    meetingNotes: '',
    completed: false,
    updatedAt: new Date().toISOString(),
  };
}

export default function DabsScreen() {
  const { sitePlots, plotTemplates, activityDelays, activityMoves, siteSetup } = useSitePlanner();
  const [meeting, setMeeting] = useState<DabsMeeting>(createBlankMeeting());
  const [savedMeetings, setSavedMeetings] = useState<DabsMeeting[]>([]);

  useEffect(() => {
    async function loadMeetings() {
      const stored = await AsyncStorage.getItem(DABS_MEETING_KEY);
      const meetings = stored ? (JSON.parse(stored) as DabsMeeting[]) : [];
      const today = getTodayDate();
      const todaysMeeting = meetings.find((item) => item.meetingDate === today) ?? createBlankMeeting();
      setSavedMeetings(meetings);
      setMeeting(todaysMeeting);
    }
    loadMeetings();
  }, []);

  async function saveMeeting(update: Partial<DabsMeeting>) {
    const updated = { ...meeting, ...update, updatedAt: new Date().toISOString() };
    const exists = savedMeetings.some((item) => item.id === updated.id);
    const nextMeetings = exists ? savedMeetings.map((item) => (item.id === updated.id ? updated : item)) : [updated, ...savedMeetings];
    setMeeting(updated);
    setSavedMeetings(nextMeetings);
    await AsyncStorage.setItem(DABS_MEETING_KEY, JSON.stringify(nextMeetings));
  }

  const completedCount = savedMeetings.filter((item) => item.completed).length;

  const tomorrowProgramme = useMemo(() => {
    const targetDate = getNextProgrammeWorkingDate(siteSetup.includeSaturday, siteSetup.includeSunday);
    const targetDateText = formatBritishDate(targetDate);
    const targetWeek = getProgrammeWeekForDate(siteSetup.programmeStartDate, targetDateText);
    const targetDay = targetDate.getUTCDay() || 7;
    if (!targetWeek || !getWorkingDayNumbers(siteSetup).includes(targetDay)) return { date: targetDateText, rows: [] as Array<{ plot: string; activities: string; trades: string }> };

    const rows = sitePlots.flatMap((plot) => {
      const activities = getActivitiesForTemplateDay(plot, targetWeek, targetDay, activityDelays, plotTemplates, siteSetup, activityMoves);
      if (!activities.length) return [];
      return [{
        plot: plot.plotNo,
        activities: activities.map((activity) => activity.displayText || activity.code).join(' / '),
        trades: [...new Set(activities.map((activity) => activity.trade))].join(', '),
      }];
    });
    return { date: targetDateText, rows };
  }, [sitePlots, plotTemplates, activityDelays, activityMoves, siteSetup]);

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>DABS</Text>
        <Text style={styles.title}>Daily Activity Briefing</Text>
        <Text style={styles.subtitle}>Standalone PM meeting record for programme, trades, blockers, inspections and agreed actions.</Text>
      </View>

      <View style={styles.summaryRow}>
        <Summary label="Meetings" value={String(savedMeetings.length || 1)} />
        <Summary label="Completed" value={String(completedCount)} />
        <Summary label="Today" value={meeting.completed ? 'Done' : 'Open'} danger={!meeting.completed} />
      </View>

      <SectionCard title="Tomorrow from Programme V2" subtitle={`Next working day: ${tomorrowProgramme.date}`}>
        {tomorrowProgramme.rows.length ? tomorrowProgramme.rows.map((row) => (
          <View key={row.plot} style={styles.programmeRow}>
            <Text style={styles.programmePlot}>Plot {row.plot}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.programmeActivity}>{row.activities}</Text>
              <Text style={styles.programmeTrade}>{row.trades}</Text>
            </View>
          </View>
        )) : <Text style={styles.emptyText}>No activities are programmed for the next working day.</Text>}
      </SectionCard>

      <SectionCard title="PM meeting record" subtitle={`Meeting date: ${meeting.meetingDate}`}>
        <Field label="Chair">
          <TextInput style={styles.input} value={meeting.chair} placeholder="Who chaired DABS?" onChangeText={(value) => saveMeeting({ chair: value })} />
        </Field>

        <Field label="Attendees">
          <TextInput style={styles.input} value={meeting.attendees} placeholder="Site manager, assistant, trades, contractors" onChangeText={(value) => saveMeeting({ attendees: value })} />
        </Field>

        <Field label="Agenda">
          <TextInput style={[styles.input, styles.notes]} value={meeting.agenda} multiline onChangeText={(value) => saveMeeting({ agenda: value })} />
        </Field>

        <Field label="Tomorrow's focus">
          <TextInput style={[styles.input, styles.notes]} value={meeting.tomorrowFocus} placeholder="Main activities and priorities for tomorrow" multiline onChangeText={(value) => saveMeeting({ tomorrowFocus: value })} />
        </Field>

        <Field label="Risks and blockers">
          <TextInput style={[styles.input, styles.notes]} value={meeting.risksAndBlockers} placeholder="Labour, materials, access, scaffold, safety, quality or programme risks" multiline onChangeText={(value) => saveMeeting({ risksAndBlockers: value })} />
        </Field>

        <Field label="Actions agreed">
          <TextInput style={[styles.input, styles.notes]} value={meeting.actionsAgreed} placeholder="Action, owner and target date" multiline onChangeText={(value) => saveMeeting({ actionsAgreed: value })} />
        </Field>

        <Field label="Meeting notes">
          <TextInput style={[styles.input, styles.notes]} value={meeting.meetingNotes} placeholder="Additional PM briefing notes" multiline onChangeText={(value) => saveMeeting({ meetingNotes: value })} />
        </Field>

        <Pressable style={[styles.completeButton, meeting.completed ? styles.completeButtonDone : null]} onPress={() => saveMeeting({ completed: !meeting.completed })}>
          <Text style={[styles.completeButtonText, meeting.completed ? styles.completeButtonTextDone : null]}>{meeting.completed ? 'DABS complete' : 'Mark DABS complete'}</Text>
        </Pressable>
      </SectionCard>
    </AppScreen>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function Summary({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <View style={[styles.summary, danger ? styles.summaryDanger : null]}>
      <Text style={[styles.summaryValue, danger ? styles.summaryValueDanger : null]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: 4 },
  eyebrow: { color: '#2563eb', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  title: { color: '#0f172a', fontSize: 30, fontWeight: '900' },
  subtitle: { color: '#64748b', fontSize: 14 },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  summary: { flex: 1, minWidth: 120, backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', padding: 16 },
  summaryDanger: { borderColor: '#fecaca', backgroundColor: '#fff7f7' },
  summaryValue: { color: '#0f172a', fontSize: 22, fontWeight: '900' },
  summaryValueDanger: { color: '#dc2626' },
  summaryLabel: { color: '#64748b', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  field: { gap: 6, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },
  programmeRow: { flexDirection: 'row', gap: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10 },
  programmePlot: { minWidth: 70, color: '#1d4ed8', fontWeight: '900' },
  programmeActivity: { color: '#0f172a', fontWeight: '900', fontSize: 13 },
  programmeTrade: { color: '#64748b', fontWeight: '700', fontSize: 11, marginTop: 2 },
  emptyText: { color: '#64748b', fontWeight: '700' },
  label: { color: '#475569', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: '#0f172a', backgroundColor: '#ffffff' },
  notes: { minHeight: 76, textAlignVertical: 'top' },
  completeButton: { alignSelf: 'flex-start', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: '#ffffff' },
  completeButtonDone: { backgroundColor: '#dcfce7', borderColor: '#86efac' },
  completeButtonText: { color: '#475569', fontSize: 12, fontWeight: '900' },
  completeButtonTextDone: { color: '#166534' },
});
