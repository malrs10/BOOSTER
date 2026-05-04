import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export interface ToolDef {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
  glow: string;
  route: string;
}

interface Props {
  tool: ToolDef;
  onPress: () => void;
  disabled?: boolean;
}

export default function ToolCard({ tool, onPress, disabled }: Props) {
  function handlePress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.75}
      disabled={disabled}
      style={[styles.card, { borderColor: disabled ? '#1a1a1a' : tool.color + '30' }]}
    >
      <View style={[styles.iconWrap, { backgroundColor: tool.glow }]}>
        <Feather name={tool.icon} size={22} color={tool.color} />
      </View>
      <View style={styles.info}>
        <Text style={styles.title}>{tool.title}</Text>
        <Text style={styles.subtitle}>{tool.subtitle}</Text>
      </View>
      <View style={styles.arrow}>
        <Feather name="chevron-right" size={18} color="#333" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#111111',
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 10,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  info: { flex: 1 },
  title: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#666',
  },
  arrow: { flexShrink: 0 },
});
