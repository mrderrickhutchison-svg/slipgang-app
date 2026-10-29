import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ONBOARDING_KEY = 'onboarding_complete';

// expo-secure-store has no working web implementation — same constraint
// lib/supabase.js works around for the auth session store — so fall back to
// window.localStorage there.
const hasWebStorage = typeof window !== 'undefined' && !!window.localStorage;

export async function getOnboardingComplete() {
  if (Platform.OS === 'web') {
    return hasWebStorage && window.localStorage.getItem(ONBOARDING_KEY) === 'true';
  }
  const value = await SecureStore.getItemAsync(ONBOARDING_KEY);
  return value === 'true';
}

export async function setOnboardingComplete() {
  if (Platform.OS === 'web') {
    if (hasWebStorage) window.localStorage.setItem(ONBOARDING_KEY, 'true');
    return;
  }
  await SecureStore.setItemAsync(ONBOARDING_KEY, 'true');
}

export async function clearOnboardingComplete() {
  if (Platform.OS === 'web') {
    if (hasWebStorage) window.localStorage.removeItem(ONBOARDING_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(ONBOARDING_KEY);
}
