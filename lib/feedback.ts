import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const LOCAL_FEEDBACK_KEY = 'siteprog:feedback:v1';
const FEEDBACK_SCREENSHOT_BUCKET = 'siteprog-feedback';

export type SiteProgFeedbackCategory = 'Bug' | 'Idea' | 'Usability' | 'General';

export type SiteProgFeedback = {
  id: string;
  page: string;
  category: SiteProgFeedbackCategory;
  message: string;
  createdAt: string;
  synced: boolean;
  screenshotPath?: string;
  screenshotDataUrl?: string;
};

async function saveLocal(item: SiteProgFeedback) {
  const stored = await AsyncStorage.getItem(LOCAL_FEEDBACK_KEY);
  const current = stored ? (JSON.parse(stored) as SiteProgFeedback[]) : [];
  const next = [item, ...current].slice(0, 100);
  await AsyncStorage.setItem(LOCAL_FEEDBACK_KEY, JSON.stringify(next));
}

function screenshotMimeType(dataUrl: string) {
  return dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/)?.[1] ?? 'image/png';
}

function screenshotExtension(mimeType: string) {
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/webp') return 'webp';
  return 'png';
}

async function uploadScreenshot(dataUrl: string, feedbackId: string) {
  if (!supabase) return undefined;
  const mimeType = screenshotMimeType(dataUrl);
  const extension = screenshotExtension(mimeType);
  const path = `${new Date().toISOString().slice(0, 10)}/${feedbackId}.${extension}`;
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const { error } = await supabase.storage.from(FEEDBACK_SCREENSHOT_BUCKET).upload(path, blob, {
    contentType: mimeType,
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function submitSiteProgFeedback(input: {
  page: string;
  category: SiteProgFeedbackCategory;
  message: string;
  screenshotDataUrl?: string;
}) {
  const message = input.message.trim();
  if (message.length < 3) throw new Error('Please add a little more detail.');

  const id = `feedback-${Date.now()}`;
  let screenshotPath: string | undefined;

  if (supabase && input.screenshotDataUrl) {
    try {
      screenshotPath = await uploadScreenshot(input.screenshotDataUrl, id);
    } catch (error) {
      console.warn('Unable to upload feedback screenshot', error);
    }
  }

  const item: SiteProgFeedback = {
    id,
    page: input.page,
    category: input.category,
    message,
    createdAt: new Date().toISOString(),
    synced: false,
    screenshotPath,
    screenshotDataUrl: screenshotPath ? undefined : input.screenshotDataUrl,
  };

  if (supabase) {
    const { error } = await supabase.from('siteprog_feedback').insert({
      page: input.page,
      category: input.category,
      message,
      screenshot_path: screenshotPath ?? null,
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
