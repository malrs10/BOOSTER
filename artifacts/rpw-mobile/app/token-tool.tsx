import React, { useState } from 'react';
import {
  ActivityIndicator, Alert, Platform, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { api } from '@/lib/api';
import { useApp } from '@/context/AppContext';
import LogView from '@/components/LogView';

export default function TokenToolPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activeAccount } = useApp();

  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [expires, setExpires] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(false);

  async function handleGetToken() {
    if (!activeAccount) { Alert.alert('Error', 'Login first'); return; }
    setLoading(true); setToken(null); setLogs([]); setRevealed(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await api.token(activeAccount.cookie);
      setLogs(res.logs || []);
      if (res.token) {
        setToken(res.token);
        setUid(res.uid);
        setExpires(res.expires);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert('Failed', 'Could not extract token. Cookie may have expired.');
      }
    } catch (e: unknown) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setLogs([`[FAIL] ${e instanceof Error ? e.message : String(e)}`]);
      Alert.alert('Error', e instanceof Error ? e.message : 'Token extraction failed');
    } finally {
      setLoading(false);
    }
  }

  function copyToken() {
    if (!token) return;
    Alert.alert('Token', token, [{ text: 'OK' }]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function maskToken(t: string) {
    if (revealed) return t;
    if (t.length <= 12) return '•'.repeat(t.length);
    return t.slice(0, 8) + '•'.repeat(Math.min(t.length - 12, 20)) + t.slice(-4);
  }

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom + 16;

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={[styles.toolIcon, { backgroundColor: 'rgba(245,158,11,0.14)' }]}>
          <Feather name="key" size={18} color="#f59e0b" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.toolTitle}>Access Token</Text>
          <Text style={styles.toolSub}>Extract EAAG Token · Business Graph</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: botPad }}>
        {activeAccount && (
          <View style={styles.profileCard}>
            <View style={styles.profileIconWrap}>
              <Feather name="user" size={16} color="#f59e0b" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName} numberOfLines={1}>
                {activeAccount.name.startsWith('User ') ? `UID: ${activeAccount.uid}` : activeAccount.name}
              </Text>
              <Text style={styles.profileUid}>UID: {activeAccount.uid}</Text>
            </View>
            <View style={styles.onlineDot} />
          </View>
        )}

        <View style={styles.infoCard}>
          <Feather name="info" size={14} color="#f59e0b" style={{ marginTop: 1, flexShrink: 0 }} />
          <Text style={styles.infoText}>Extracts the EAAG access token using Business Graph API. This token provides full account access — keep it secret.</Text>
        </View>

        {token && (
          <View style={styles.tokenCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={styles.tokenLabel}>ACCESS TOKEN</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity onPress={() => setRevealed(r => !r)} style={styles.iconBtn}>
                  <Feather name={revealed ? 'eye-off' : 'eye'} size={14} color="#f59e0b" />
                </TouchableOpacity>
                <TouchableOpacity onPress={copyToken} style={styles.iconBtn}>
                  <Feather name="copy" size={14} color="#f59e0b" />
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.tokenValue} selectable>{maskToken(token)}</Text>
            {uid && <Text style={styles.tokenMeta}>UID: {uid}</Text>}
            {expires && <Text style={styles.tokenMeta}>Expires: {expires}</Text>}
          </View>
        )}

        <LogView logs={logs} />

        <TouchableOpacity style={[styles.actionBtn, loading && styles.disabledBtn]} onPress={handleGetToken} disabled={loading} activeOpacity={0.8}>
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <><Feather name="key" size={16} color="#fff" /><Text style={styles.actionBtnText}>{token ? 'Re-Extract Token' : 'Extract Access Token'}</Text></>
          }
        </TouchableOpacity>

        <View style={styles.warnCard}>
          <Feather name="alert-triangle" size={12} color="#ef4444" />
          <Text style={styles.warnText}>Keep your access token secret. It grants full account access to whoever has it.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: '#0e0e0e', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#1a1a1a', flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' },
  toolIcon: { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  toolTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  toolSub: { fontSize: 10, fontFamily: 'Inter_400Regular', color: '#555' },
  profileCard: { backgroundColor: '#111', borderRadius: 12, borderWidth: 1, borderColor: '#f59e0b25', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  profileIconWrap: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(245,158,11,0.14)', alignItems: 'center', justifyContent: 'center' },
  profileName: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  profileUid: { fontSize: 11, fontFamily: 'Inter_400Regular', color: '#555', marginTop: 2 },
  onlineDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#22c55e' },
  infoCard: { backgroundColor: 'rgba(245,158,11,0.06)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)', padding: 12, flexDirection: 'row', gap: 8, marginBottom: 16 },
  infoText: { fontSize: 12, fontFamily: 'Inter_400Regular', color: '#999', lineHeight: 18, flex: 1 },
  tokenCard: { backgroundColor: '#0e0e0e', borderRadius: 12, borderWidth: 1, borderColor: '#f59e0b30', padding: 16, marginBottom: 16 },
  tokenLabel: { fontSize: 10, fontFamily: 'Inter_700Bold', color: '#555', letterSpacing: 1.2 },
  iconBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: 'rgba(245,158,11,0.1)', alignItems: 'center', justifyContent: 'center' },
  tokenValue: { fontSize: 12, fontFamily: 'Inter_400Regular', color: '#fbbf24', lineHeight: 20, marginBottom: 8 },
  tokenMeta: { fontSize: 11, fontFamily: 'Inter_400Regular', color: '#555', marginTop: 4 },
  actionBtn: { backgroundColor: '#d97706', borderRadius: 12, padding: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginBottom: 12 },
  disabledBtn: { opacity: 0.5 },
  actionBtnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  warnCard: { flexDirection: 'row', gap: 8, backgroundColor: '#111', borderRadius: 10, borderWidth: 1, borderColor: '#1f1f1f', padding: 12, alignItems: 'flex-start' },
  warnText: { fontSize: 11, fontFamily: 'Inter_400Regular', color: '#666', lineHeight: 16, flex: 1 },
});
