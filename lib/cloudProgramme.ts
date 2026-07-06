import { supabase } from './supabase';
import { ActivityDelay } from '../utils/siteProgrammeEngine';
import { PlotTemplate, TemplateSitePlot } from '../utils/templateProgramme';
import { IssueLog, TradeContact } from '../data/sitePlannerStore';

export type CloudProject = {
  id: string;
  name: string;
  client?: string | null;
  site_manager_name?: string | null;
  site_manager_email?: string | null;
};

export type CloudProgrammeSnapshot = {
  project: CloudProject;
  plots: TemplateSitePlot[];
  tradeContacts: TradeContact[];
  activityDelays: ActivityDelay[];
  plotTemplates: PlotTemplate[];
  issueLogs: IssueLog[];
};

export async function createCloudProject(input: {
  name: string;
  client?: string;
  siteManagerName?: string;
  siteManagerEmail?: string;
}) {
  if (!supabase) throw new Error('Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  const { data, error } = await supabase
    .from('projects')
    .insert({
      name: input.name,
      client: input.client ?? null,
      site_manager_name: input.siteManagerName ?? null,
      site_manager_email: input.siteManagerEmail ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as CloudProject;
}

export async function pushProgrammeSnapshot(projectId: string, snapshot: Omit<CloudProgrammeSnapshot, 'project'>) {
  if (!supabase) throw new Error('Supabase is not configured.');

  const plots = snapshot.plots.map((plot) => ({
    project_id: projectId,
    local_plot_id: plot.id,
    plot_no: plot.plotNo,
    template_id: plot.templateId ?? 'threeBed',
    stage9_complete_week: plot.stage9CompleteWeek,
  }));

  const trades = snapshot.tradeContacts.map((trade) => ({
    project_id: projectId,
    local_trade_id: trade.id,
    trade: trade.trade,
    contractor: trade.contractor,
    supervisor_name: trade.supervisorName,
    supervisor_email: trade.supervisorEmail,
    supervisor_phone: trade.supervisorPhone,
  }));

  const delays = snapshot.activityDelays.map((delay) => ({
    project_id: projectId,
    plot_id: delay.plotId,
    activity_code: delay.activityCode,
    delay_days: delay.delayDays,
  }));

  const templates = snapshot.plotTemplates.map((template) => ({
    project_id: projectId,
    local_template_id: template.id,
    name: template.name,
    activities: template.activities,
  }));

  const issues = snapshot.issueLogs.map((issue) => ({
    project_id: projectId,
    local_issue_id: issue.id,
    start_week: issue.startWeek,
    recipient_count: issue.recipientCount,
    note: issue.note,
    issued_at: issue.issuedAt,
  }));

  await Promise.all([
    plots.length ? supabase.from('plots').upsert(plots, { onConflict: 'project_id,local_plot_id' }) : Promise.resolve({ error: null }),
    trades.length ? supabase.from('trade_contacts').upsert(trades, { onConflict: 'project_id,local_trade_id' }) : Promise.resolve({ error: null }),
    delays.length ? supabase.from('activity_delays').upsert(delays, { onConflict: 'project_id,plot_id,activity_code' }) : Promise.resolve({ error: null }),
    templates.length ? supabase.from('plot_templates').upsert(templates, { onConflict: 'project_id,local_template_id' }) : Promise.resolve({ error: null }),
    issues.length ? supabase.from('issue_logs').upsert(issues, { onConflict: 'project_id,local_issue_id' }) : Promise.resolve({ error: null }),
  ]).then((results) => {
    const failed = results.find((result: any) => result?.error);
    if (failed?.error) throw failed.error;
  });
}

export async function getSupervisorAccess(projectId: string) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase
    .from('trade_contacts')
    .select('trade, contractor, supervisor_name, supervisor_email, supervisor_phone, access_token, active')
    .eq('project_id', projectId)
    .eq('active', true)
    .order('trade');
  if (error) throw error;
  return data ?? [];
}
