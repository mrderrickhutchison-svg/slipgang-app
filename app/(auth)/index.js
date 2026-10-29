import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export default function Welcome() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <Image source={require('@/assets/logo.png')} style={styles.logo} />
      <Text style={styles.title}>SlipGang</Text>
      <Text style={styles.subtitle}>THE DOGHOUSE</Text>
      <Text style={styles.tagline}>Every bet. Every book.{'\n'}One Doghouse.</Text>
      <Text style={styles.description}>Track all your bets across FanDuel, DraftKings, BetMGM, and more — live scores, parlay legs, smart alerts — all in one place.</Text>
      <TouchableOpacity style={styles.ctaButton} onPress={() => router.push('/(auth)/phone')} activeOpacity={0.8}>
        <Text style={styles.ctaText}>Let the dogs out →</Text>
      </TouchableOpacity>
      <View style={styles.features}>
        {['Live parlay tracking', 'Smart alerts', 'Multi-book dashboard'].map((f, i) => (
          <View key={i} style={styles.featurePill}>
            <Text style={styles.featureText}>{f}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#07090D', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  logo: { width: 110, height: 110, resizeMode: 'contain', marginBottom: 8 },
  title: { fontSize: 42, fontWeight: '800', color: '#F5A623', letterSpacing: -1 },
  subtitle: { fontSize: 13, fontWeight: '700', color: '#8B95A5', letterSpacing: 4, marginTop: 4, marginBottom: 24 },
  tagline: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', textAlign: 'center', lineHeight: 32, marginBottom: 12 },
  description: { fontSize: 14, color: '#8B95A5', textAlign: 'center', lineHeight: 22, marginBottom: 28, paddingHorizontal: 16 },
  ctaButton: { backgroundColor: '#F5A623', paddingVertical: 16, paddingHorizontal: 48, borderRadius: 999, marginBottom: 28 },
  ctaText: { fontSize: 18, fontWeight: '700', color: '#07090D' },
  features: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  featurePill: { backgroundColor: '#0F1218', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(245,166,35,0.15)' },
  featureText: { fontSize: 13, color: '#F5A623' },
});
