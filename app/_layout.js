import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { supabase } from '@/lib/supabase';
import { OnboardingProvider, useOnboarding } from '@/lib/onboardingContext';

export default function RootLayout() {
  return (
    <OnboardingProvider>
      <RootNavigation />
    </OnboardingProvider>
  );
}

function RootNavigation() {
  const [session, setSession] = useState(undefined);
  const { onboardingComplete } = useOnboarding();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session === undefined || onboardingComplete === undefined) return;
    const inAuth = segments[0] === '(auth)';
    const inOnboarding = segments[0] === 'onboarding';

    if (!session) {
      if (!inAuth) router.replace('/(auth)');
      return;
    }
    // Logged in but hasn't finished the first-run intro yet — keep them on it
    // regardless of where they landed.
    if (!onboardingComplete) {
      if (!inOnboarding) router.replace('/onboarding');
      return;
    }
    if (inAuth || inOnboarding) {
      router.replace('/(tabs)');
    }
  }, [session, onboardingComplete, segments]);

  if (session === undefined || onboardingComplete === undefined) {
    return (
      <View style={{ flex: 1, backgroundColor: '#07090D', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#F5A623" />
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#07090D' }, animation: 'fade' }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}
