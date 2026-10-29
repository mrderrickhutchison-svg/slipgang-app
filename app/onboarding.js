import { useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, Image, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Zap, Users, BrainCircuit } from 'lucide-react-native';
import { COLORS, SPACING, RADIUS } from '@/lib/theme';
import { useOnboarding } from '@/lib/onboardingContext';

const SLIDES = [
  { key: 'slide-1' },
  {
    key: 'slide-2',
    headline: 'Tail it or fade it.',
    subtext: "See a pick you like? Tail it. Think it's trash? Fade it. One tap.",
  },
  {
    key: 'slide-3',
    headline: 'Keep score.',
    subtext: "SlipGang tracks who's actually sharp. Climb the leaderboard and earn your spot as top dog.",
  },
];

const FEATURES = [
  { key: 'multisport', Icon: Zap, label: 'MULTI-SPORT BETTING' },
  { key: 'groupchat', Icon: Users, label: 'GROUP CHAT INTEGRATION' },
  { key: 'smarter', Icon: BrainCircuit, label: 'SMARTER PICKS' },
];

function HeroSlide({ width }) {
  return (
    <View style={[styles.heroSlide, { width }]}>
      <ScrollView contentContainerStyle={styles.heroScrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroTopSection}>
          <Image source={require('@/assets/logo.png')} style={styles.heroLogo} />
          <View style={styles.heroHeadlineBlock}>
            <Text style={styles.heroHeadlineWhite}>{"YOUR GANG'S BETS,"}</Text>
            <Text style={styles.heroHeadlineGold}>ALL IN ONE PLACE.</Text>
          </View>
          <Text style={styles.heroSubtext}>
            Every pick from every sportsbook — no more digging through group texts.
          </Text>
        </View>

        <Image source={require('@/assets/onboarding-dog.png')} style={styles.heroImage} resizeMode="contain" />

        <View style={styles.featureRow}>
          {FEATURES.map(({ key, Icon, label }) => (
            <View key={key} style={styles.featureItem}>
              <View style={styles.featureIconCircle}>
                <Icon color={COLORS.brand} size={24} />
              </View>
              <Text style={styles.featureLabel}>{label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

export default function Onboarding() {
  const router = useRouter();
  const { markOnboardingComplete } = useOnboarding();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const listRef = useRef(null);

  const finish = useCallback(async () => {
    if (finishing) return;
    setFinishing(true);
    await markOnboardingComplete();
    router.replace('/(tabs)/gang');
  }, [finishing, markOnboardingComplete, router]);

  const handleNext = () => {
    if (index === SLIDES.length - 1) {
      finish();
      return;
    }
    listRef.current?.scrollToIndex({ index: index + 1, animated: true });
  };

  const handleMomentumScrollEnd = (e) => {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  const isLast = index === SLIDES.length - 1;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <TouchableOpacity style={styles.skipBtn} onPress={finish} disabled={finishing}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item }) =>
          item.key === 'slide-1' ? (
            <HeroSlide width={width} />
          ) : (
            <View style={[styles.slide, { width }]}>
              <Text style={styles.headline}>{item.headline}</Text>
              <Text style={styles.subtext}>{item.subtext}</Text>
            </View>
          )
        }
      />

      <View style={styles.footer}>
        <View style={styles.dotsRow}>
          {SLIDES.map((s, i) => (
            <View key={s.key} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.nextBtn, finishing && { opacity: 0.6 }]}
          onPress={handleNext}
          disabled={finishing}
        >
          <Text style={styles.nextText}>{isLast ? 'Get Started →' : 'Next →'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  skipBtn: { position: 'absolute', top: SPACING.lg, right: SPACING.xl, zIndex: 10, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md },
  skipText: { color: COLORS.textMid, fontSize: 15, fontWeight: '600' },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.xxxl },
  logo: { width: 140, height: 140, resizeMode: 'contain', marginBottom: SPACING.xxl },
  headline: { fontSize: 28, fontWeight: '800', color: COLORS.text, textAlign: 'center', lineHeight: 36, marginBottom: SPACING.lg },
  subtext: { fontSize: 16, color: COLORS.textMid, textAlign: 'center', lineHeight: 24, paddingHorizontal: SPACING.sm },
  footer: { paddingHorizontal: SPACING.xxxl, paddingBottom: SPACING.xxl, alignItems: 'center' },
  dotsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.xxl },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.textDim },
  dotActive: { backgroundColor: COLORS.brand, width: 24 },
  nextBtn: { backgroundColor: COLORS.brand, paddingVertical: SPACING.lg, borderRadius: RADIUS.full, width: '100%', alignItems: 'center' },
  nextText: { fontSize: 17, fontWeight: '700', color: COLORS.bg },

  // Slide 1 — hero layout
  heroSlide: { flex: 1 },
  heroScrollContent: { flexGrow: 1, justifyContent: 'center', paddingVertical: SPACING.lg },
  heroTopSection: { paddingHorizontal: SPACING.xxl, alignItems: 'center' },
  heroLogo: { width: 64, height: 64, resizeMode: 'contain', marginBottom: SPACING.lg },
  heroHeadlineBlock: { alignItems: 'center', marginBottom: SPACING.md },
  heroHeadlineWhite: { fontSize: 26, fontWeight: '800', color: COLORS.text, textAlign: 'center', letterSpacing: 0.5, lineHeight: 32 },
  heroHeadlineGold: { fontSize: 26, fontWeight: '800', color: COLORS.brand, textAlign: 'center', letterSpacing: 0.5, lineHeight: 32 },
  heroSubtext: { fontSize: 14, color: COLORS.textMid, textAlign: 'center', lineHeight: 20 },
  heroImage: { width: '100%', aspectRatio: 1080 / 826, marginTop: SPACING.lg },
  featureRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: SPACING.xxl, marginTop: SPACING.lg },
  featureItem: { flex: 1, alignItems: 'center', paddingHorizontal: SPACING.xs },
  featureIconCircle: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: COLORS.brand, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.sm },
  featureLabel: { fontSize: 10, fontWeight: '700', color: COLORS.text, textAlign: 'center', letterSpacing: 0.3 },
});
