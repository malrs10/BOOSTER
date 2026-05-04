import React, { useRef, useEffect } from 'react';
import { ScrollView, Text, StyleSheet, View } from 'react-native';

interface Props { logs: string[] }

export default function LogView({ logs }: Props) {
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (logs.length > 0) scrollRef.current?.scrollToEnd({ animated: true });
  }, [logs.length]);

  if (!logs.length) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>LOG OUTPUT</Text>
      <ScrollView ref={scrollRef} style={styles.scroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
        {logs.map((line, i) => {
          const isFail = line.includes('[FAIL]') || line.includes('[ERR]');
          const isOk = line.includes('[OK]') || line.includes('[DONE]') || line.includes('[SUCCESS]');
          return (
            <Text key={i} style={[styles.line, isFail && styles.fail, isOk && styles.ok]}>
              {line}
            </Text>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#0e0e0e',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1f1f1f',
    marginBottom: 14,
    overflow: 'hidden',
  },
  label: {
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    color: '#444',
    letterSpacing: 1.2,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  scroll: { maxHeight: 180, padding: 10 },
  line: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: '#888',
    lineHeight: 18,
  },
  fail: { color: '#ef4444' },
  ok: { color: '#22c55e' },
});
