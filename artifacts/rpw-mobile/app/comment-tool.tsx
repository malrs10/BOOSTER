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

const DEFAULT_COMMENTS = 'Grabe! 😍\nSo cute! 💯\nLove this! ❤️\nSana all 😂\nIkaw na! 🔥\nNice one! 👌\nLodi! 🙌\nWow amazing!';

export default function CommentToolPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activeAccount, accounts } = useApp();

  const [postUrl, setPostUrl] = useState('');
  const [commentText, setCommentText] = useState(DEFAULT_COMMENTS);
  const [repeatEach, setRepeatEach] = useState(1);
  const [useAll, setUseAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const commentList = commentText.split('\n').map(s => s.trim()).filter(Boolean);
  const totalComments = Math.min(commentList.length * repeatEach, 10);

  async function handleComment() {
    if (!postUrl.trim()) { Alert.alert('Error', 'Enter a Facebook post URL'); return; }
    if (!commentList.length) { Alert.alert('Error', 'Add at least one comment'); return; }
    if (!activeAccount) { Alert.alert('Error', 'Login first'); return; }
    setLoading(true); setLogs([]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = useAll && accounts.length > 0
        ? await api.commentAll(postUrl.trim(), commentList, totalComments)
        : await api.comment(activeAccount.cookie, postUrl.trim(), commentList, totalComments);
      setLogs(res.logs || []);
      if (res.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Comments Sent!', res.message);
      } else {
        Alert.alert('Result', res.message);
      }
    } catch (e: unknown) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setLogs([`[FAIL] ${e instanceof Error ? e.message : String(e)}`]);
      Alert.alert('Error', e instanceof Error ? e.message : 'Comment failed');
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
        <View style={[styles.toolIcon, { backgroundColor: 'rgba(34,197,94,0.14)' }]}>
          <Feather name="message-square" size={18} color="#22c55e" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.toolTitle}>Mass Comment</Text>
          <Text style={styles.toolSub}>Bulk Comment · {commentList.length} loaded</Text>
        </View>
        <View style={[styles.badge, { borderColor: 'rgba(34,197,94,0.3)', backgroundColor: 'rgba(34,197,94,0.1)' }]}>
          <Text style={[styles.badgeText, { color: '#4ade80' }]}>{totalComments}×</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: botPad }} keyboardShouldPersistTaps="handled">
        {accounts.length > 1 && (
          <View style={styles.boostAllRow}>
            <View style={styles.boostAllLeft}>
              <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: 'rgba(129,140,248,0.14)', alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="users" size={14} color="#818cf8" />
              </View>
              <View>
                <Text style={styles.boostAllTitle}>Comment All {accounts.length} Accounts</Text>
                <Text style={styles.boostAllSub}>Uses all saved accounts</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setUseAll(u => !u)} style={[styles.toggle, useAll && styles.toggleOn]}>
              <View style={[styles.toggleThumb, useAll && styles.toggleThumbOn]} />
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.label}>POST URL</Text>
        <TextInput style={styles.input} value={postUrl} onChangeText={setPostUrl} placeholder="https://www.facebook.com/..." placeholderTextColor="#333" autoCapitalize="none" autoCorrect={false} />

        <Text style={styles.label}>COMMENTS (one per line · max 10)</Text>
        <TextInput
          style={[styles.input, { minHeight: 140, textAlignVertical: 'top' }]}
          value={commentText}
          onChangeText={setCommentText}
          multiline
          numberOfLines={6}
          placeholder="One comment per line..."
          placeholderTextColor="#333"
        />

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={styles.label}>REPEAT EACH</Text>
          <Text style={[styles.label, { color: '#4ade80' }]}>{repeatEach}×</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          {[1, 2, 3, 5].map(p => (
            <TouchableOpacity key={p} onPress={() => setRepeatEach(p)} style={[styles.presetBtn, repeatEach === p && { borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.14)' }]}>
              <Text style={[styles.presetText, { color: repeatEach === p ? '#4ade80' : '#555' }]}>{p}×</Text>
            </TouchableOpacity>
          ))}
          <View style={[styles.presetBtn, { flex: 2 }]}>
            <Text style={{ fontSize: 11, color: '#666', fontFamily: 'Inter_400Regular' }}>Total: {totalComments} comments</Text>
          </View>
        </View>

        <LogView logs={logs} />

        <TouchableOpacity style={[styles.actionBtn, loading && styles.disabledBtn]} onPress={handleComment} disabled={loading} activeOpacity={0.8}>
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <><Feather name="message-square" size={16} color="#fff" /><Text style={styles.actionBtnText}>{useAll ? `Comment ${accounts.length} Accounts` : `Send ${totalComments} Comments`}</Text></>
          }
        </TouchableOpacity>
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
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  badgeText: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  label: { fontSize: 10, fontFamily: 'Inter_700Bold', color: '#444', letterSpacing: 1.2, marginBottom: 8 },
  input: { backgroundColor: '#111', borderWidth: 1, borderColor: '#222', borderRadius: 10, padding: 14, fontSize: 13, fontFamily: 'Inter_400Regular', color: '#fff', marginBottom: 16 },
  boostAllRow: { backgroundColor: '#111', borderRadius: 12, borderWidth: 1, borderColor: '#1f1f1f', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  boostAllLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  boostAllTitle: { fontSize: 13, fontFamily: 'Inter_500Medium', color: '#fff' },
  boostAllSub: { fontSize: 10, fontFamily: 'Inter_400Regular', color: '#555' },
  toggle: { width: 48, height: 28, borderRadius: 14, backgroundColor: '#222', justifyContent: 'center', padding: 3 },
  toggleOn: { backgroundColor: '#22c55e' },
  toggleThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#555' },
  toggleThumbOn: { backgroundColor: '#fff', alignSelf: 'flex-end' },
  presetBtn: { flex: 1, paddingVertical: 9, borderRadius: 9, borderWidth: 1.5, borderColor: '#222', backgroundColor: '#111', alignItems: 'center' },
  presetText: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  actionBtn: { backgroundColor: '#16a34a', borderRadius: 12, padding: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginBottom: 12 },
  disabledBtn: { opacity: 0.5 },
  actionBtnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#fff' },
});
