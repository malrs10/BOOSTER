import React, { useState } from 'react';
import {
  ActivityIndicator, Alert, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { api } from '@/lib/api';
import { useApp } from '@/context/AppContext';
import LogView from '@/components/LogView';

type Tab = 'cookie' | 'email';

export default function GuardToolPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activeAccount } = useApp();

  const [tab, setTab] = useState<Tab>('cookie');
  const [enable, setEnable] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  async function handleGuard() {
    if (tab === 'cookie' && !activeAccount) { Alert.alert('Error', 'Login with cookie first'); return; }
    if (tab === 'email' && (!email.trim() || !password.trim())) { Alert.alert('Error', 'Enter email and password'); return; }
    setLoading(true); setLogs([]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = tab === 'cookie'
        ? await api.guard(activeAccount!.cookie, enable)
        : await api.guardEmail(email.trim(), password, enable);
      setLogs(res.logs || []);
      if (res.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Success', res.message || `Profile guard ${enable ? 'enabled' : 'disabled'} successfully!`);
      } else {
        Alert.alert('Result', res.message);
      }
    } catch (e: unknown) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setLogs([`[FAIL] ${e instanceof Error ? e.message : String(e)}`]);
      Alert.alert('Error', e instanceof Error ? e.message : 'Guard failed');
    } finally {
      setLoading(false);
    }
  }

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom + 16;

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={[styles.toolIcon, { backgroundColor: 'rgba(139,92,246,0.14)' }]}>
          <Feather name="shield" size={18} color="#8b5cf6" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.toolTitle}>Profile Guard</Text>
          <Text style={styles.toolSub}>Enable / Disable Facebook Shield</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: enable ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', borderColor: enable ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)' }]}>
          <Text style={[styles.badgeText, { color: enable ? '#4ade80' : '#f87171' }]}>{enable ? 'ON' : 'OFF'}</Text>
        </View>
      </View>

      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: botPad }}
        bottomOffset={20}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.tabRow}>
          <TouchableOpacity style={[styles.tabBtn, tab === 'cookie' && styles.tabBtnActive]} onPress={() => setTab('cookie')}>
            <Feather name="cookie" size={13} color={tab === 'cookie' ? '#8b5cf6' : '#555'} />
            <Text style={[styles.tabText, tab === 'cookie' && styles.tabTextActive]}>Cookie</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabBtn, tab === 'email' && styles.tabBtnActive]} onPress={() => setTab('email')}>
            <Feather name="mail" size={13} color={tab === 'email' ? '#8b5cf6' : '#555'} />
            <Text style={[styles.tabText, tab === 'email' && styles.tabTextActive]}>Email + Password</Text>
          </TouchableOpacity>
        </View>

        {tab === 'cookie' ? (
          activeAccount ? (
            <View style={styles.profileCard}>
              <View style={styles.profileIconWrap}>
                <Feather name="user" size={16} color="#8b5cf6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.profileName} numberOfLines={1}>
                  {activeAccount.name.startsWith('User ') ? `UID: ${activeAccount.uid}` : activeAccount.name}
                </Text>
                <Text style={styles.profileUid}>UID: {activeAccount.uid}</Text>
              </View>
              <View style={styles.onlineDot} />
            </View>
          ) : (
            <View style={styles.noAccountCard}>
              <Feather name="alert-circle" size={14} color="#ef4444" />
              <Text style={styles.noAccountText}>No active account. Login first or use Email mode.</Text>
            </View>
          )
        ) : (
          <>
            <Text style={styles.label}>EMAIL</Text>
            <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="your@email.com" placeholderTextColor="#333" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
            <Text style={styles.label}>PASSWORD</Text>
            <View style={{ position: 'relative', marginBottom: 16 }}>
              <TextInput style={[styles.input, { marginBottom: 0, paddingRight: 48 }]} value={password} onChangeText={setPassword} placeholder="Your password" placeholderTextColor="#333" secureTextEntry={!showPass} autoCorrect={false} autoCapitalize="none" />
              <TouchableOpacity onPress={() => setShowPass(s => !s)} style={styles.eyeBtn}>
                <Feather name={showPass ? 'eye-off' : 'eye'} size={16} color="#555" />
              </TouchableOpacity>
            </View>
          </>
        )}

        <Text style={[styles.label, { marginTop: 8 }]}>GUARD ACTION</Text>
        <View style={styles.guardToggleRow}>
          <TouchableOpacity style={[styles.guardBtn, enable && styles.guardBtnActive]} onPress={() => setEnable(true)}>
            <Feather name="shield" size={16} color={enable ? '#4ade80' : '#555'} />
            <Text style={[styles.guardBtnText, { color: enable ? '#4ade80' : '#555' }]}>Enable Guard</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.guardBtn, !enable && styles.guardBtnOff]} onPress={() => setEnable(false)}>
            <Feather name="shield-off" size={16} color={!enable ? '#f87171' : '#555'} />
            <Text style={[styles.guardBtnText, { color: !enable ? '#f87171' : '#555' }]}>Disable Guard</Text>
          </TouchableOpacity>
        </View>

        <LogView logs={logs} />

        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: enable ? '#7c3aed' : '#991b1b' }, loading && styles.disabledBtn]} onPress={handleGuard} disabled={loading} activeOpacity={0.8}>
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <><Feather name={enable ? 'shield' : 'shield-off'} size={16} color="#fff" /><Text style={styles.actionBtnText}>{enable ? 'Enable Profile Guard' : 'Disable Profile Guard'}</Text></>
          }
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: '#0e0e0e', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#1a1a1a', flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' },
  toolIcon: { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  toolTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  toolSub: { fontSize: 10, fontFamily: 'Inter_400Regular', color: '#555' },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  badgeText: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  tabRow: { flexDirection: 'row', backgroundColor: '#111', borderRadius: 12, borderWidth: 1, borderColor: '#1f1f1f', padding: 4, marginBottom: 20 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 9 },
  tabBtnActive: { backgroundColor: 'rgba(139,92,246,0.15)' },
  tabText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: '#555' },
  tabTextActive: { color: '#8b5cf6' },
  label: { fontSize: 10, fontFamily: 'Inter_700Bold', color: '#444', letterSpacing: 1.2, marginBottom: 8 },
  input: { backgroundColor: '#111', borderWidth: 1, borderColor: '#222', borderRadius: 10, padding: 14, fontSize: 13, fontFamily: 'Inter_400Regular', color: '#fff', marginBottom: 16 },
  eyeBtn: { position: 'absolute', right: 14, top: 14 },
  profileCard: { backgroundColor: '#111', borderRadius: 12, borderWidth: 1, borderColor: '#8b5cf625', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  profileIconWrap: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(139,92,246,0.14)', alignItems: 'center', justifyContent: 'center' },
  profileName: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  profileUid: { fontSize: 11, fontFamily: 'Inter_400Regular', color: '#555', marginTop: 2 },
  onlineDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#22c55e' },
  noAccountCard: { backgroundColor: 'rgba(239,68,68,0.06)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', padding: 14, flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 16 },
  noAccountText: { fontSize: 12, fontFamily: 'Inter_400Regular', color: '#f87171', flex: 1 },
  guardToggleRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  guardBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#222', backgroundColor: '#111' },
  guardBtnActive: { borderColor: 'rgba(34,197,94,0.4)', backgroundColor: 'rgba(34,197,94,0.08)' },
  guardBtnOff: { borderColor: 'rgba(239,68,68,0.4)', backgroundColor: 'rgba(239,68,68,0.08)' },
  guardBtnText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  actionBtn: { borderRadius: 12, padding: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginBottom: 12 },
  disabledBtn: { opacity: 0.5 },
  actionBtnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#fff' },
});
