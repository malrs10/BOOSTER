import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View, Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { api, type ActionResult } from '@/lib/api';
import { useApp } from '@/context/AppContext';
import LogView from '@/components/LogView';

const REACTIONS = [
  { id: 'LIKE',  label: 'Like',  color: '#3b82f6' },
  { id: 'LOVE',  label: 'Love',  color: '#ef4444' },
  { id: 'HAHA',  label: 'Haha',  color: '#f59e0b' },
  { id: 'WOW',   label: 'Wow',   color: '#f59e0b' },
  { id: 'SAD',   label: 'Sad',   color: '#60a5fa' },
  { id: 'ANGRY', label: 'Angry', color: '#ef4444' },
  { id: 'CARE',  label: 'Care',  color: '#ec4899' },
];

function CooldownTimer({ seconds, onDone }: { seconds: number; onDone: () => void }) {
  const [rem, setRem] = useState(seconds);
  const progress = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(progress, { toValue: 0, duration: seconds * 1000, useNativeDriver: false }).start();
    const t = setInterval(() => setRem(r => { if (r <= 1) { clearInterval(t); onDone(); return 0; } return r - 1; }), 1000);
    return () => clearInterval(t);
  }, []);

  const mins = Math.floor(rem / 60);
  const secs = rem % 60;

  return (
    <View style={cdStyles.wrap}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <View style={cdStyles.iconWrap}><Feather name="clock" size={16} color="#f59e0b" /></View>
        <View style={{ flex: 1 }}>
          <Text style={cdStyles.title}>Cooldown Active</Text>
          <Text style={cdStyles.sub}>10-min anti-suspension protection</Text>
        </View>
        <Text style={cdStyles.timer}>{mins}:{secs.toString().padStart(2, '0')}</Text>
      </View>
      <View style={cdStyles.track}>
        <Animated.View style={[cdStyles.fill, { width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
      </View>
    </View>
  );
}

const cdStyles = StyleSheet.create({
  wrap: { backgroundColor: '#1a1200', borderRadius: 12, borderWidth: 1, borderColor: '#f59e0b30', padding: 16, marginBottom: 14 },
  iconWrap: { width: 34, height: 34, borderRadius: 9, backgroundColor: '#f59e0b18', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  sub: { fontSize: 10, fontFamily: 'Inter_400Regular', color: '#666' },
  timer: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#fbbf24', fontVariant: ['tabular-nums'] as const },
  track: { height: 5, backgroundColor: '#1f1f1f', borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: '#f59e0b', borderRadius: 3 },
});

export default function ReactToolPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activeAccount, accounts } = useApp();

  const [postUrl, setPostUrl] = useState('');
  const [reaction, setReaction] = useState('LIKE');
  const [count, setCount] = useState(1);
  const [useAll, setUseAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [cooldownSec, setCooldownSec] = useState(0);

  const rxn = REACTIONS.find(r => r.id === reaction)!;

  async function handleReact() {
    if (!postUrl.trim()) { Alert.alert('Error', 'Enter a Facebook post URL'); return; }
    if (!activeAccount) { Alert.alert('Error', 'Login first'); return; }
    setLoading(true); setLogs([]); setCooldownSec(0);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      let res: ActionResult;
      if (useAll && accounts.length > 0) {
        res = await api.reactAll(postUrl.trim(), reaction);
      } else {
        res = await api.react(activeAccount.cookie, postUrl.trim(), reaction, count);
      }
      setLogs(res.logs || []);
      if (res.cooldown && res.cooldownSec) { setCooldownSec(res.cooldownSec); }
      if (res.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Success', res.message);
      } else {
        Alert.alert('Result', res.message);
      }
    } catch (e: unknown) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setLogs([`[FAIL] ${e instanceof Error ? e.message : String(e)}`]);
      Alert.alert('Error', e instanceof Error ? e.message : 'Boost failed');
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
        <View style={[styles.toolIcon, { backgroundColor: 'rgba(239,68,68,0.14)' }]}>
          <Feather name="thumbs-up" size={18} color="#ef4444" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.toolTitle}>Auto React</Text>
          <Text style={styles.toolSub}>Reaction Booster · 7 Types</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: botPad }} keyboardShouldPersistTaps="handled">
        {cooldownSec > 0 && <CooldownTimer seconds={cooldownSec} onDone={() => setCooldownSec(0)} />}

        {accounts.length > 1 && (
          <View style={styles.boostAllRow}>
            <View style={styles.boostAllLeft}>
              <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: 'rgba(129,140,248,0.14)', alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="users" size={14} color="#818cf8" />
              </View>
              <View>
                <Text style={styles.boostAllTitle}>Boost All {accounts.length} Accounts</Text>
                <Text style={styles.boostAllSub}>Max 20 per batch · 10-min cooldown</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setUseAll(u => !u)} style={[styles.toggle, useAll && styles.toggleOn]}>
              <View style={[styles.toggleThumb, useAll && styles.toggleThumbOn]} />
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.label}>POST URL</Text>
        <TextInput style={styles.input} value={postUrl} onChangeText={setPostUrl} placeholder="https://www.facebook.com/..." placeholderTextColor="#333" autoCapitalize="none" autoCorrect={false} />

        <Text style={styles.label}>REACTION TYPE</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {REACTIONS.map(r => (
              <TouchableOpacity
                key={r.id}
                onPress={() => setReaction(r.id)}
                style={[styles.rxnBtn, reaction === r.id && { borderColor: r.color, backgroundColor: r.color + '18' }]}
              >
                <Text style={[styles.rxnLabel, { color: reaction === r.id ? r.color : '#555' }]}>{r.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {!useAll && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={styles.label}>BOOST COUNT</Text>
              <Text style={[styles.label, { color: rxn.color }]}>{count}×</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {[1, 5, 10, 20, 50].map(p => (
                <TouchableOpacity
                  key={p}
                  onPress={() => setCount(p)}
                  style={[styles.presetBtn, count === p && { borderColor: '#8b5cf6', backgroundColor: 'rgba(139,92,246,0.14)' }]}
                >
                  <Text style={[styles.presetText, { color: count === p ? '#c4b5fd' : '#555' }]}>{p}×</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <LogView logs={logs} />

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#dc2626' }, (loading || cooldownSec > 0) && styles.disabledBtn]}
          onPress={handleReact}
          disabled={loading || cooldownSec > 0}
          activeOpacity={0.8}
        >
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <><Feather name="thumbs-up" size={16} color="#fff" />
              <Text style={styles.actionBtnText}>
                {useAll ? `Boost ${accounts.length} Accounts` : `Boost ${reaction} ×${count}`}
              </Text></>
          }
        </TouchableOpacity>

        <View style={styles.warnCard}>
          <Feather name="alert-triangle" size={12} color="#f59e0b" />
          <Text style={styles.warnText}>10-min cooldown between bulk boosts prevents suspension.</Text>
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
  label: { fontSize: 10, fontFamily: 'Inter_700Bold', color: '#444', letterSpacing: 1.2, marginBottom: 8 },
  input: {
    backgroundColor: '#111', borderWidth: 1, borderColor: '#222', borderRadius: 10,
    padding: 14, fontSize: 13, fontFamily: 'Inter_400Regular', color: '#fff', marginBottom: 16,
  },
  boostAllRow: {
    backgroundColor: '#111', borderRadius: 12, borderWidth: 1, borderColor: '#1f1f1f',
    padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16,
  },
  boostAllLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  boostAllTitle: { fontSize: 13, fontFamily: 'Inter_500Medium', color: '#fff' },
  boostAllSub: { fontSize: 10, fontFamily: 'Inter_400Regular', color: '#555' },
  toggle: { width: 48, height: 28, borderRadius: 14, backgroundColor: '#222', justifyContent: 'center', padding: 3 },
  toggleOn: { backgroundColor: '#7c3aed' },
  toggleThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#555' },
  toggleThumbOn: { backgroundColor: '#fff', alignSelf: 'flex-end' },
  rxnBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#222', backgroundColor: '#111',
  },
  rxnLabel: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  presetBtn: {
    flex: 1, paddingVertical: 9, borderRadius: 9, borderWidth: 1.5,
    borderColor: '#222', backgroundColor: '#111', alignItems: 'center',
  },
  presetText: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  actionBtn: {
    borderRadius: 12, padding: 16, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 8, marginBottom: 12,
  },
  disabledBtn: { opacity: 0.5 },
  actionBtnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  warnCard: {
    flexDirection: 'row', gap: 8, backgroundColor: '#111', borderRadius: 10,
    borderWidth: 1, borderColor: '#1f1f1f', padding: 12, alignItems: 'flex-start',
  },
  warnText: { fontSize: 11, fontFamily: 'Inter_400Regular', color: '#666', lineHeight: 16, flex: 1 },
});
