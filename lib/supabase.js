import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const SUPABASE_URL = 'https://muegafzqzxvvppzkszka.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11ZWdhZnpxenh2dnBwemtzemthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0NzY4MDQsImV4cCI6MjA5OTA1MjgwNH0.oK12ycs1ULeJOaUE920RHQ0Be-JmwFvtIHzZNzR6A5o';

const ExpoSecureStoreAdapter = {
  getItem: async (key) => await SecureStore.getItemAsync(key),
  setItem: async (key, value) => { await SecureStore.setItemAsync(key, value); },
  removeItem: async (key) => { await SecureStore.deleteItemAsync(key); },
};

// expo-secure-store has no working web implementation; fall back to
// window.localStorage there. Guarded for SSR (no `window`) and for Node's
// experimental global `localStorage` stub, which exists but isn't functional.
const hasWebStorage = typeof window !== 'undefined' && !!window.localStorage;
const WebStorageAdapter = {
  getItem: async (key) => (hasWebStorage ? window.localStorage.getItem(key) : null),
  setItem: async (key, value) => { if (hasWebStorage) window.localStorage.setItem(key, value); },
  removeItem: async (key) => { if (hasWebStorage) window.localStorage.removeItem(key); },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: Platform.OS === 'web' ? WebStorageAdapter : ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
