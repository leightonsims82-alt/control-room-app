import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const defaultSupabaseUrl = 'https://zjjuxdkdxuvfycleyqcx.supabase.co';
const defaultPublishableKey = 'sb_publishable_wKQnc5aK9Xpta9-SS4hpTw_9CKdzgwj';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || defaultSupabaseUrl;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || defaultPublishableKey;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;
