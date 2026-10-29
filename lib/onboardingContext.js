import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getOnboardingComplete, setOnboardingComplete as persistOnboardingComplete, clearOnboardingComplete } from './onboardingStorage';

const OnboardingContext = createContext(null);

export function OnboardingProvider({ children }) {
  const [onboardingComplete, setOnboardingComplete] = useState(undefined);

  useEffect(() => {
    getOnboardingComplete().then(setOnboardingComplete);
  }, []);

  // Writes the flag and flips local state in the same call, so the root
  // layout's redirect effect sees onboardingComplete=true *before* the
  // onboarding screen navigates away — otherwise it would bounce the user
  // straight back to /onboarding on the stale false value.
  const markOnboardingComplete = useCallback(async () => {
    await persistOnboardingComplete();
    setOnboardingComplete(true);
  }, []);

  // Dev-only: clears the flag and flips local state to false in the same
  // call, same ordering reason as markOnboardingComplete — so the root
  // layout's redirect effect sees the fresh value before the caller
  // navigates to /onboarding, instead of bouncing back to (tabs) on stale
  // state.
  const resetOnboarding = useCallback(async () => {
    await clearOnboardingComplete();
    setOnboardingComplete(false);
  }, []);

  return (
    <OnboardingContext.Provider value={{ onboardingComplete, markOnboardingComplete, resetOnboarding }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider');
  return ctx;
}
