import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Image, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useOnboarding } from '@/lib/onboardingContext';

export default function Settings() {
  const router = useRouter();
  const { resetOnboarding } = useOnboarding();
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) { setUser(user); setEmail(user.email || ''); }
    });
  }, []);

  const signOut = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ]);
  };

  const handleResetOnboarding = async () => {
    await resetOnboarding();
    router.replace('/onboarding');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}><Text style={styles.headerTitle}>Settings</Text></View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileCard}>
          <Image source={require('@/assets/logo.png')} style={styles.avatar} />
          <View style={styles.profileInfo}>
            <Text style={styles.profileEmail} numberOfLines={1}>{email}</Text>
            <View style={styles.tierBadge}><Text style={styles.tierText}>FREE</Text></View>
          </View>
        </View>

        <TouchableOpacity style={styles.upgradeCard}>
          <Text style={styles.upgradeTitle}>Upgrade to Pro</Text>
          <Text style={styles.upgradeDesc}>Auto-sync from all sportsbooks, unlimited bets, smart alerts, and full analytics.</Text>
          <View style={styles.upgradeBtn}><Text style={styles.upgradeBtnText}>$9.99/mo — Coming Soon</Text></View>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.section}>
          <SettingRow label="Default Grouping" value="By Game" />
          <SettingRow label="Push Notifications" value="On" />
          <SettingRow label="Alert Level" value="Smart" last />
        </View>

        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.section}>
          <SettingRow label="Email" value={email} />
          <SettingRow label="Privacy Policy" arrow />
          <SettingRow label="Terms of Service" arrow />
          <SettingRow label="Responsible Gambling" arrow last />
        </View>

        <Text style={styles.sectionTitle}>Support</Text>
        <View style={styles.section}>
          <SettingRow label="Help & FAQ" arrow />
          <SettingRow label="Contact Us" value="support@slipgang.com" />
          <SettingRow label="App Version" value="1.0.0" last />
        </View>

        <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.resetOnboardingBtn} onPress={handleResetOnboarding}>
          <Text style={styles.resetOnboardingText}>Reset Onboarding (dev)</Text>
        </TouchableOpacity>

        <Image source={require('@/assets/logo.png')} style={styles.footerLogo} />
        <Text style={styles.footer}>SlipGang — The Doghouse{'\n'}Built in Phoenix, AZ</Text>
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingRow({ label, value, arrow, last }) {
  return (
    <TouchableOpacity style={[styles.settingRow, !last && styles.settingRowBorder]}>
      <Text style={styles.settingLabel}>{label}</Text>
      <Text style={styles.settingValue}>{value || ''}{arrow ? ' →' : ''}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#07090D' },
  header: { paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  scrollContent: { padding: 20 },
  profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F1218', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', gap: 16, marginBottom: 16 },
  avatar: { width: 110, height: 110, resizeMode: 'contain' },
  profileInfo: { flex: 1 },
  profileEmail: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  tierBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(245,166,35,0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, marginTop: 4 },
  tierText: { fontSize: 11, fontWeight: '700', color: '#F5A623' },
  upgradeCard: { backgroundColor: 'rgba(245,166,35,0.08)', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: 'rgba(245,166,35,0.2)', marginBottom: 24 },
  upgradeTitle: { fontSize: 18, fontWeight: '800', color: '#F5A623', marginBottom: 8 },
  upgradeDesc: { fontSize: 14, color: '#8B95A5', lineHeight: 20, marginBottom: 16 },
  upgradeBtn: { backgroundColor: '#F5A623', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  upgradeBtnText: { fontSize: 15, fontWeight: '700', color: '#07090D' },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#8B95A5', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, marginTop: 16 },
  section: { backgroundColor: '#0F1218', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  settingRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  settingLabel: { fontSize: 15, color: '#FFFFFF' },
  settingValue: { fontSize: 14, color: '#8B95A5' },
  signOutBtn: { marginTop: 24, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#FF4D6A', alignItems: 'center' },
  signOutText: { fontSize: 15, fontWeight: '600', color: '#FF4D6A' },
  resetOnboardingBtn: { marginTop: 12, paddingVertical: 10, alignItems: 'center' },
  resetOnboardingText: { fontSize: 12, color: '#505866', fontWeight: '500' },
  footerLogo: { width: 110, height: 110, resizeMode: 'contain', alignSelf: 'center', marginTop: 24, opacity: 0.4 },
  footer: { textAlign: 'center', color: '#505866', fontSize: 13, marginTop: 8, lineHeight: 20 },
});
