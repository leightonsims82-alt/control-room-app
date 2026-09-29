import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const LOCAL_FEEDBACK_KEY = 'siteprog:feedback:v1';

export type SiteProgFeedbackCategory = 'Bug' | 'Idea' | 'Usability' | 'General';

export type SiteProgFeedback = {
  id: string;
  page: string;
  category: SiteProgFeedbackCategory;
  message: string;
  createdAt: string;
  synced: boolean;
};

async function saveLocal(item: SiteProgFeedback) {
  const stored = await AsyncStorage.getItem(LOCAL_FEEDBACK_KEY);
  const current = stored ? (JSON.parse(stored) as SiteProgFeedback[]) : [];
  const next = [item, ...current].slice(0, 100);
  await AsyncStorage.setItem(LOCAL_FEEDBACK_KEY, JSON.stringify(next));
}

export async function submitSiteProgFeedback(input: {
  page: string;
  category: SiteProgFeedbackCategory;
  message: string;
}) {
  const message = input.message.trim();
  if (message.length < 3) throw new Error('Please add a little more detail.');

  const item: SiteProgFeedback = {
    id: `feedback-${Date.now()}`,
    page: input.page,
    category: input.category,
    message,
    createdAt: new Date().toISOString(),
    synced: false,
  };

  if (supabase) {
    const { error } = await supabase.from('siteprog_feedback').insert({
      page: input.page,
      category: input.category,
      message,
      app_version: '1.0.0',
    });

    if (!error) {
      const syncedItem = { ...item, synced: true };
      await saveLocal(syncedItem);
      return syncedItem;
    }
  }

  await saveLocal(item);
  return item;
}
