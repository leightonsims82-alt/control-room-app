import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const BACKUP_KEYS = [
  'programme-buddy:plots:v1',
  'programme-buddy:delays:v1',
  'programme-buddy:activity-moves:v1',
  'programme-buddy:trade-contacts:v1',
  'programme-buddy:issue-settings:v1',
  'programme-buddy:issue-logs:v1',
  'programme-buddy:plot-templates:v1',
  'programme-buddy:programme-setup:v1',
  'programme-buddy:programme-notes:v1',
  'programme-buddy:stage-configuration:v1',
  'siteprog:plot-programmes:v1',
  'siteprog:plot-stages:v1',
  'siteprog:inspections:v1',
  'siteprog:defects:v1',
  'siteprog:dabs-briefings:v1',
  'siteprog:8am-walk:v1',
  'siteprog:8am-walk-notes:v1',
  'siteprog:dabs-standalone-meetings:v1',
];

async function currentUserId() {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('Sign in before using cloud backup.');
  return data.user.id;
}

export async function backupProgrammeData() {
  if (!supabase) throw new Error('Supabase is not configured.');
  const userId = await currentUserId();
  const values = await AsyncStorage.multiGet(BACKUP_KEYS);
  const snapshot = Object.fromEntries(values.filter(([, value]) => value !== null));
  const { error } = await supabase
    .from('app_backups')
    .upsert(
      {
        user_id: userId,
        snapshot,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
  if (error) throw error;
  return Object.keys(snapshot).length;
}

export async function restoreProgrammeData() {
  if (!supabase) throw new Error('Supabase is not configured.');
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from('app_backups')
    .select('snapshot, updated_at')
    .eq('user_id', userId)
    .single();
  if (error) throw error;

  const snapshot = (data?.snapshot ?? {}) as Record<string, string>;
  const entries = Object.entries(snapshot).filter(([, value]) => typeof value === 'string');
  if (entries.length) await AsyncStorage.multiSet(entries);
  return {
    restored: entries.length,
    updatedAt: data?.updated_at as string | undefined,
  };
}

export async function getBackupStatus() {
  if (!supabase) return { configured: false, signedIn: false as const };
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { configured: true, signedIn: false as const };
  const { data: backup } = await supabase
    .from('app_backups')
    .select('updated_at')
    .eq('user_id', data.user.id)
    .maybeSingle();
  return {
    configured: true,
    signedIn: true as const,
    email: data.user.email,
    updatedAt: backup?.updated_at as string | undefined,
  };
}