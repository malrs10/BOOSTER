import React, { useState } from 'react';
import {
  ActivityIndicator, Alert, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { api } from '@/lib/api';
import { useApp } from '@/context/AppContext';
import LogView from '@/components/LogView';

export default function ShareToolPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activeAccount } = useApp();

  const [postUrl, setPostUrl] = useState('');
  const [count, setCount] = useState(5);
  const [countStr, setCountStr] = useState('5');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  function updateCount(str: string) {
    setCountStr(str);
    const n = parseInt(str, 10);
    if (!isNaN(n) && n >= 1) setCount(n);
  }

  async function handleShare() {
    if (!postUrl.trim()) { Alert.alert('Error', 'Enter a Facebook post URL'); return; }
    if (!activeAccount) { Alert.alert('Error', 'Login first'); return; }
    setLoading(true); setLogs([]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await api.share(activeAccount.cookie, postUrl.trim(), count);
      setLogs(res.logs || []);
      if (res.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Shares Complete!', `${res.count ?? count}× shares done.\n${res.message}`);
      } else {
        Alert.alert('Result', res.message);
      }
    } catch (e: unknown) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setLogs([`[FAIL] ${e instanceof Error ? e.message : String(e)}`]);
      Alert.alert('Error', e instanceof Error ? e.message : 'Share failed');
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
        <View style={[styles.toolIcon, { backgroundColor: 'rgba(59,130,246,0.14)' }]}>
          <Feather name="share-2" size={18} color="#3b82f6" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.toolTitle}>Spam Share</Text>
          <Text style={styles.toolSub}>Multi-Share Booster · Fast Mode</Text>
        </View>
        <View style={styles.countBadge}>
          <Feather name="repeat" size={10} color="#60a5fa" />
          <Text style={styles.countBadgeText}>{count}×</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: botPad }} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>POST URL</Text>
        <TextInput
          style={styles.input}
          value={postUrl}
          onChangeText={setPostUrl}
          placeholder="https://www.facebook.com/..."
          placeholderTextColor="#333"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={styles.label}>SHARE COUNT</Text>
          <Text style={[styles.label, { color: '#60a5fa' }]}>{count}×</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
          {[5, 10, 20, 50, 100].map(p => (
            <TouchableOpacity
              key={p}
              onPress={() => { setCount(p); setCountStr(String(p)); }}
              style={[styles.presetBtn, count === p && { borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.14)' }]}
            >
              <Text style={[styles.presetText, { color: count === p ? '#93c5fd' : '#555' }]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={[styles.input, { marginBottom: 6 }]}
          value={countStr}
          onChangeText={updateCount}
          keyboardType="number-pad"
          placeholder="Custom count"
          placeholderTextColor="#333"
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 }}>
          <Feather name="zap" size={12} color="#60a5fa" />
          <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#555' }}>Fast mode: 0.1s delay between shares</Text>
        </View>

        <View style={styles.planCard}>
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(59,130,246,0.14)', alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="repeat" size={16} color="#3b82f6" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.planTitle}>Planned Shares</Text>
            <Text style={styles.planSub}>Posted to your timeline</Text>
          </View>
          <Text style={styles.planNum}>{count}</Text>
        </View>

        <LogView logs={logs} />

        <TouchableOpacity
          style={[styles.actionBtn, loading && styles.disabledBtn]}
          onPress={handleShare}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <><Feather name="share-2" size={16} color="#fff" /><Text style={styles.actionBtnText}>Share {count} Times</Text></>
          }
        </TouchableOpacity>

        <View style={styles.warnCard}>
          <Feather name="alert-triangle" size={12} color="#f59e0b" />
          <Text style={styles.warnText}>Spam sharing may trigger Facebook anti-spam. Use on secondary accounts.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#0e0e0e', paddingHorizontal: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#1a1a1a',
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' },
  toolIcon: { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  toolTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  toolSub: { fontSize: 10, fontFamily: 'Inter_400Regular', color: '#555' },
  countBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(59,130,246,0.12)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(59,130,246,0.25)' },
  countBadgeText: { fontSize: 11, fontFamily: 'Inter_700Bold', color: '#60a5fa' },
  label: { fontSize: 10, fontFamily: 'Inter_700Bold', color: '#444', letterSpacing: 1.2, marginBottom: 8 },
  input: { backgroundColor: '#111', borderWidth: 1, borderColor: '#222', borderRadius: 10, padding: 14, fontSize: 13, fontFamily: 'Inter_400Regular', color: '#fff', marginBottom: 16 },
  presetBtn: { flex: 1, paddingVertical: 9, borderRadius: 9, borderWidth: 1.5, borderColor: '#222', backgroundColor: '#111', alignItems: 'center' },
  presetText: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  planCard: { backgroundColor: 'rgba(59,130,246,0.06)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(59,130,246,0.15)', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  planTitle: { fontSize: 13, fontFamily: 'Inter_500Medium', color: '#ccc' },
  planSub: { fontSize: 10, fontFamily: 'Inter_400Regular', color: '#555' },
  planNum: { fontSize: 32, fontFamily: 'Inter_700Bold', color: '#60a5fa' },
  actionBtn: { backgroundColor: '#2563eb', borderRadius: 12, padding: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginBottom: 12 },
  disabledBtn: { opacity: 0.5 },
  actionBtnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  warnCard: { flexDirection: 'row', gap: 8, backgroundColor: '#111', borderRadius: 10, borderWidth: 1, borderColor: '#1f1f1f', padding: 12, alignItems: 'flex-start' },
  warnText: { fontSize: 11, fontFamily: 'Inter_400Regular', color: '#666', lineHeight: 16, flex: 1 },
});
