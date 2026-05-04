import React, { useEffect, useState } from 'react';
import { Image, Linking, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useApp } from '@/context/AppContext';
import ToolCard, { type ToolDef } from '@/components/ToolCard';

const APP_VERSION = '1.5.1';
const API_BASE = (process.env['EXPO_PUBLIC_API_URL'] ?? 'https://rpw-boosterxd.onrender.com/api/fb').replace('/api/fb', '');

interface ReleaseInfo {
  tag: string;
  name: string;
  url: string;
  downloads: number;
}

function useLatestRelease() {
  const [release, setRelease] = useState<ReleaseInfo | null>(null);
  const [hasUpdate, setHasUpdate] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const r = await fetch(`${API_BASE}/api/releases/latest`);
        if (!r.ok) return;
        const data = (await r.json()) as ReleaseInfo;
        setRelease(data);
        const remoteVersion = data.tag?.replace(/^v/, '').split('.').slice(0, 2).join('.');
        const localVersion  = APP_VERSION.split('.').slice(0, 2).join('.');
        const remoteNum = parseInt(data.tag?.replace(/\D/g, '') ?? '0', 10);
        const localNum  = parseInt(APP_VERSION.replace(/\./g, ''), 10);
        setHasUpdate(remoteNum > localNum);
      } catch {}
    };
    check();
  }, []);

  return { release, hasUpdate };
}

const TOOLS: ToolDef[] = [
  { id: 'react',   title: 'Auto React',    subtitle: 'Boost reactions · 7 types',     icon: 'thumbs-up',     color: '#ef4444', glow: 'rgba(239,68,68,0.14)',   route: '/react-tool' },
  { id: 'share',   title: 'Spam Share',    subtitle: 'Multi-share · Fast 0.1s mode',  icon: 'share-2',       color: '#3b82f6', glow: 'rgba(59,130,246,0.14)',  route: '/share-tool' },
  { id: 'comment', title: 'Mass Comment',  subtitle: 'Bulk comments · All accounts',  icon: 'message-square', color: '#22c55e', glow: 'rgba(34,197,94,0.14)',  route: '/comment-tool' },
  { id: 'token',   title: 'Access Token',  subtitle: 'Extract EAAG token',            icon: 'key',           color: '#f59e0b', glow: 'rgba(245,158,11,0.14)', route: '/token-tool' },
  { id: 'guard',   title: 'Profile Guard', subtitle: 'Enable / disable shield',       icon: 'shield',        color: '#8b5cf6', glow: 'rgba(139,92,246,0.14)', route: '/guard-tool' },
];

export default function HomePage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activeAccount, accounts, setActive } = useApp();
  const { release, hasUpdate } = useLatestRelease();

  const displayName = activeAccount
    ? (activeAccount.name.startsWith('User ') ? `UID: ${activeAccount.uid}` : activeAccount.name)
    : 'No Account';

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom + 16;

  const fmtDownloads = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <View style={styles.logoRow}>
          <Image source={require('../assets/images/icon.png')} style={styles.headerLogo} />
          <View style={{ flex: 1 }}>
            <Text style={styles.appName}>RPW BOOSTER</Text>
            <Text style={styles.appSub}>v{APP_VERSION} · Multi-Tool Suite</Text>
          </View>
          <TouchableOpacity
            onPress={() => { router.push('/login'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            style={styles.addBtn}
          >
            <Feather name="plus" size={18} color="#dc2626" />
          </TouchableOpacity>
        </View>

        {activeAccount ? (
          <View style={styles.profileCard}>
            <Image
              source={{ uri: activeAccount.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=dc2626&color=fff` }}
              style={styles.avatar}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName} numberOfLines={1}>{displayName}</Text>
              <Text style={styles.profileUid}>UID: {activeAccount.uid}</Text>
            </View>
            <View style={styles.onlineDot} />
          </View>
        ) : (
          <TouchableOpacity style={styles.loginPrompt} onPress={() => router.push('/login')} activeOpacity={0.8}>
            <Feather name="log-in" size={14} color="#dc2626" />
            <Text style={styles.loginPromptText}>Login to get started</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: botPad }}
        showsVerticalScrollIndicator={false}
      >
        {hasUpdate && release && (
          <TouchableOpacity
            style={styles.updateBanner}
            onPress={() => Linking.openURL(release.url)}
            activeOpacity={0.85}
          >
            <View style={styles.updateBadge}>
              <Text style={styles.updateBadgeText}>NEW</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.updateTitle}>Update Available — {release.tag}</Text>
              <Text style={styles.updateSub}>Tap to download latest APK from GitHub</Text>
            </View>
            <Feather name="download" size={18} color="#22c55e" />
          </TouchableOpacity>
        )}

        <Text style={styles.sectionLabel}>TOOLS</Text>
        {TOOLS.map(tool => (
          <ToolCard
            key={tool.id}
            tool={tool}
            disabled={!activeAccount}
            onPress={() => router.push(tool.route as '/react-tool')}
          />
        ))}

        {accounts.length > 1 && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: 18 }]}>SWITCH ACCOUNT</Text>
            {accounts.map(acc => {
              const isActive = activeAccount?.uid === acc.uid;
              const name = acc.name.startsWith('User ') ? `UID: ${acc.uid}` : acc.name;
              return (
                <TouchableOpacity
                  key={acc.uid}
                  style={[styles.accRow, isActive && styles.accRowActive]}
                  onPress={() => { setActive(acc.uid); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: acc.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=dc2626&color=fff` }} style={styles.accAvatar} />
                  <Text style={styles.accName} numberOfLines={1}>{name}</Text>
                  {isActive && <View style={styles.activeDot} />}
                </TouchableOpacity>
              );
            })}
          </>
        )}

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{accounts.length}</Text>
            <Text style={styles.statLabel}>Accounts</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNum, { color: '#22c55e' }]}>
              {release ? fmtDownloads(release.downloads) : TOOLS.length.toString()}
            </Text>
            <Text style={styles.statLabel}>{release ? 'Downloads' : 'Tools'}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNum, { color: '#2176ff' }]}>v{APP_VERSION}</Text>
            <Text style={styles.statLabel}>Version</Text>
          </View>
        </View>

        {release && (
          <TouchableOpacity
            style={styles.downloadRow}
            onPress={() => Linking.openURL(release.url)}
            activeOpacity={0.8}
          >
            <Feather name="github" size={14} color="#555" />
            <Text style={styles.downloadText}>
              {fmtDownloads(release.downloads)} total downloads · {release.tag}
            </Text>
            <Feather name="external-link" size={12} color="#555" />
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#0e0e0e',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  headerLogo: { width: 38, height: 38, borderRadius: 10 },
  appName: { fontSize: 17, fontFamily: 'Inter_700Bold', color: '#fff', letterSpacing: 2 },
  appSub: { fontSize: 10, fontFamily: 'Inter_400Regular', color: '#555', marginTop: 1 },
  addBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#1a0000', borderWidth: 1, borderColor: '#dc262630',
    alignItems: 'center', justifyContent: 'center',
  },
  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#111', borderRadius: 12, borderWidth: 1,
    borderColor: '#dc262625', padding: 12,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1f1f1f' },
  profileName: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  profileUid: { fontSize: 11, fontFamily: 'Inter_400Regular', color: '#555', marginTop: 2 },
  onlineDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#22c55e' },
  loginPrompt: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#1a0000', borderRadius: 10, borderWidth: 1,
    borderColor: '#dc262630', padding: 14, justifyContent: 'center',
  },
  loginPromptText: { fontSize: 14, fontFamily: 'Inter_500Medium', color: '#dc2626' },
  sectionLabel: { fontSize: 10, fontFamily: 'Inter_700Bold', color: '#444', letterSpacing: 1.2, marginBottom: 12 },
  accRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#111', borderRadius: 10, borderWidth: 1,
    borderColor: '#1f1f1f', padding: 12, marginBottom: 6,
  },
  accRowActive: { borderColor: '#dc262640', backgroundColor: '#160000' },
  accAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#1f1f1f' },
  accName: { flex: 1, fontSize: 13, fontFamily: 'Inter_500Medium', color: '#ccc' },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  statCard: {
    flex: 1, backgroundColor: '#111', borderRadius: 12, borderWidth: 1,
    borderColor: '#1f1f1f', padding: 14, alignItems: 'center',
  },
  statNum: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#dc2626', marginBottom: 4 },
  statLabel: { fontSize: 10, fontFamily: 'Inter_400Regular', color: '#555' },
  updateBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#0a1f0e', borderRadius: 12, borderWidth: 1,
    borderColor: '#22c55e40', padding: 12, marginBottom: 16,
  },
  updateBadge: {
    backgroundColor: '#22c55e', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  updateBadgeText: { fontSize: 9, fontFamily: 'Inter_700Bold', color: '#000', letterSpacing: 0.5 },
  updateTitle: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#22c55e' },
  updateSub: { fontSize: 10, fontFamily: 'Inter_400Regular', color: '#555', marginTop: 2 },
  downloadRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center',
    marginTop: 10, padding: 10,
  },
  downloadText: { fontSize: 11, fontFamily: 'Inter_400Regular', color: '#555' },
});
