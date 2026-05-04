import React, { useState } from 'react';
import {
  ActivityIndicator, Alert, Image, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { api } from '@/lib/api';
import { useApp } from '@/context/AppContext';

export default function LoginPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { accounts, activeAccount, addAccount, removeAccount, setActive } = useApp();
  const [cookie, setCookie] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    const trimmed = cookie.trim();
    if (!trimmed) { Alert.alert('Error', 'Paste your Facebook cookie first'); return; }
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const profile = await api.login(trimmed);
      await addAccount({ uid: profile.uid, name: profile.name, avatar: profile.avatar, cookie: trimmed });
      setCookie('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/home');
    } catch (e: unknown) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Login Failed', e instanceof Error ? e.message : 'Could not verify cookie');
    } finally {
      setLoading(false);
    }
  }

  const topPad = Platform.OS === 'web' ? 67 : insets.top + 16;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom + 16;

  return (
    <KeyboardAwareScrollView
      style={{ flex: 1, backgroundColor: '#0a0a0a' }}
      contentContainerStyle={{ paddingTop: topPad, paddingHorizontal: 20, paddingBottom: botPad }}
      bottomOffset={20}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <Image source={require('../assets/images/icon.png')} style={styles.headerLogo} />
          <View>
            <Text style={styles.appName}>RPW BOOSTER</Text>
            <Text style={styles.appSub}>Facebook Multi-Tool Suite</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Feather name="log-in" size={18} color="#dc2626" />
          <Text style={styles.cardTitle}>Cookie Login</Text>
        </View>
        <Text style={styles.cardDesc}>Paste your Facebook cookie string below. Go to Facebook → F12 → Application → Cookies and copy all cookies as Netscape format.</Text>
        <TextInput
          style={styles.cookieInput}
          placeholder="Paste Facebook cookie here..."
          placeholderTextColor="#444"
          value={cookie}
          onChangeText={setCookie}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          editable={!loading}
          autoCorrect={false}
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <><Feather name="zap" size={16} color="#fff" /><Text style={styles.loginBtnText}>Verify & Login</Text></>
          }
        </TouchableOpacity>
      </View>

      {accounts.length > 0 && (
        <View style={styles.savedSection}>
          <Text style={styles.savedTitle}>SAVED ACCOUNTS</Text>
          {accounts.map(acc => {
            const isActive = activeAccount?.uid === acc.uid;
            const displayName = acc.name.startsWith('User ') ? `UID: ${acc.uid}` : acc.name;
            return (
              <TouchableOpacity
                key={acc.uid}
                style={[styles.accRow, isActive && styles.accRowActive]}
                onPress={() => { setActive(acc.uid); router.replace('/home'); }}
                activeOpacity={0.75}
              >
                <Image
                  source={{ uri: acc.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=dc2626&color=fff` }}
                  style={styles.accAvatar}
                  onError={() => {}}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.accName} numberOfLines={1}>{displayName}</Text>
                  <Text style={styles.accUid}>UID: {acc.uid}</Text>
                </View>
                {isActive && <View style={styles.activeDot} />}
                <TouchableOpacity onPress={() => { removeAccount(acc.uid); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} hitSlop={10}>
                  <Feather name="trash-2" size={15} color="#444" />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity style={styles.continueBtn} onPress={() => router.replace('/home')} activeOpacity={0.8}>
            <Feather name="arrow-right" size={15} color="#dc2626" />
            <Text style={styles.continueBtnText}>Continue with Active Account</Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 28 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  headerLogo: { width: 48, height: 48, borderRadius: 12 },
  appName: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#fff', letterSpacing: 2 },
  appSub: { fontSize: 11, fontFamily: 'Inter_400Regular', color: '#555', marginTop: 2 },
  card: {
    backgroundColor: '#111',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dc262630',
    padding: 20,
    marginBottom: 24,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  cardTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  cardDesc: { fontSize: 12, fontFamily: 'Inter_400Regular', color: '#666', lineHeight: 18, marginBottom: 16 },
  cookieInput: {
    backgroundColor: '#0e0e0e',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 10,
    padding: 14,
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#ccc',
    minHeight: 110,
    marginBottom: 14,
  },
  loginBtn: {
    backgroundColor: '#dc2626',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  loginBtnDisabled: { opacity: 0.5 },
  loginBtnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  savedSection: { marginTop: 8 },
  savedTitle: { fontSize: 10, fontFamily: 'Inter_700Bold', color: '#444', letterSpacing: 1.2, marginBottom: 12 },
  accRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1f1f1f',
    padding: 14,
    marginBottom: 8,
  },
  accRowActive: { borderColor: '#dc262640', backgroundColor: '#1a0000' },
  accAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1f1f1f' },
  accName: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  accUid: { fontSize: 11, fontFamily: 'Inter_400Regular', color: '#555', marginTop: 2 },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dc262630',
    justifyContent: 'center',
    marginTop: 4,
  },
  continueBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#dc2626' },
});
