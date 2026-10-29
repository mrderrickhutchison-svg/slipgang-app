import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { COLORS } from '@/lib/theme';

export default function EmailAuth() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!email || !email.includes('@')) { Alert.alert('Enter a valid email'); return; }
    if (!password || password.length < 6) { Alert.alert('Password must be 6+ characters'); return; }
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password });
        setLoading(false);
        if (error) Alert.alert('Signup Error', error.message);
        else Alert.alert('Check your email', 'Tap the confirmation link, then come back and log in.');
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        setLoading(false);
        if (error) {
          Alert.alert('Login Error', error.message);
        } else {
          Alert.alert('Success', 'Logged in! Session: ' + (data.session ? 'yes' : 'no'));
        }
      }
    } catch (e) {
      setLoading(false);
      Alert.alert('Catch Error', e.message);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
      <View style={styles.content}>
        <MaterialCommunityIcons name="paw" size={48} color={COLORS.brand} style={styles.emoji} />
        <Text style={styles.title}>{mode === 'login' ? 'Welcome back' : 'Join the pack'}</Text>
        <Text style={styles.subtitle}>{mode === 'login' ? 'Log in to The Doghouse' : 'Create your account'}</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Email address" placeholderTextColor="#505866" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
        <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Password (6+ characters)" placeholderTextColor="#505866" secureTextEntry />
        <TouchableOpacity style={[styles.ctaButton, loading && {opacity:0.6}]} onPress={handleAuth} disabled={loading}>
          <Text style={styles.ctaText}>{loading ? 'Loading...' : mode === 'login' ? 'Log in →' : 'Create account →'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setMode(mode === 'login' ? 'signup' : 'login')} style={{marginTop:20}}>
          <Text style={styles.switchText}>{mode === 'login' ? "Don't have an account? " : 'Already have an account? '}<Text style={{color:'#F5A623',fontWeight:'600'}}>{mode === 'login' ? 'Sign up' : 'Log in'}</Text></Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#07090D' },
  backBtn: { paddingTop: 60, paddingLeft: 20 },
  backText: { color: '#8B95A5', fontSize: 16 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  emoji: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#8B95A5', textAlign: 'center', marginBottom: 32 },
  input: { width: '100%', maxWidth: 320, backgroundColor: '#0F1218', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 16, paddingVertical: 16, color: '#FFFFFF', fontSize: 16, marginBottom: 12 },
  ctaButton: { backgroundColor: '#F5A623', paddingVertical: 16, paddingHorizontal: 48, borderRadius: 999, width: '100%', maxWidth: 320, alignItems: 'center', marginTop: 12 },
  ctaText: { fontSize: 18, fontWeight: '700', color: '#07090D' },
  switchText: { fontSize: 15, color: '#8B95A5' },
});
