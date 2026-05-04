import React, { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SplashPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const tagOpacity = useRef(new Animated.Value(0)).current;
  const glowScale = useRef(new Animated.Value(0.8)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, tension: 40, friction: 8, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(glowOpacity, { toValue: 0.6, duration: 1000, useNativeDriver: true }),
        Animated.spring(glowScale, { toValue: 1.2, tension: 20, friction: 10, useNativeDriver: true }),
      ]),
      Animated.timing(textOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(tagOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(async () => {
      try {
        const accsJson = await AsyncStorage.getItem('rpw_accounts');
        const accs = accsJson ? JSON.parse(accsJson) as unknown[] : [];
        if (accs.length > 0) {
          router.replace('/home');
        } else {
          router.replace('/login');
        }
      } catch {
        router.replace('/login');
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={[styles.container, { paddingTop: Platform.OS === 'web' ? 67 : insets.top }]}>
      <View style={styles.center}>
        <Animated.View style={[styles.glowRing, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]} />
        <Animated.View style={[styles.logoWrap, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
          <Image
            source={require('../assets/images/icon.png')}
            style={styles.logo}
            contentFit="contain"
          />
        </Animated.View>
        <Animated.Text style={[styles.title, { opacity: textOpacity }]}>
          RPW BOOSTER
        </Animated.Text>
        <Animated.Text style={[styles.sub, { opacity: tagOpacity }]}>
          v1.5.1 · Facebook Multi-Tool Suite
        </Animated.Text>
        <Animated.View style={[styles.dots, { opacity: tagOpacity }]}>
          <BounceDot delay={0} />
          <BounceDot delay={200} />
          <BounceDot delay={400} />
        </Animated.View>
      </View>
      <Animated.Text style={[styles.footer, { opacity: tagOpacity, paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 16 }]}>
        Auto React · Spam Share · Mass Comment · Token · Guard
      </Animated.Text>
    </View>
  );
}

function BounceDot({ delay }: { delay: number }) {
  const y = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: -6, duration: 350, delay, useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, duration: 350, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View style={[styles.dot, { transform: [{ translateY: y }] }]} />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'space-between' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  glowRing: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.3)',
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
    elevation: 20,
  },
  logoWrap: { width: 160, height: 160, marginBottom: 32 },
  logo: { width: '100%', height: '100%' },
  title: {
    fontSize: 30,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
    letterSpacing: 5,
    marginBottom: 8,
    textAlign: 'center',
  },
  sub: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#dc2626',
    letterSpacing: 0.5,
    marginBottom: 36,
    textAlign: 'center',
  },
  dots: { flexDirection: 'row', gap: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#dc2626' },
  footer: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    color: '#333',
    letterSpacing: 0.5,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
