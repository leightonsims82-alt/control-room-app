import { Ionicons } from '@expo/vector-icons';
import { ReactNode, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export function GuideBox({ title, items, defaultExpanded = true }: { title: string; items: string[]; defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <View style={styles.wrapper}>
      <Pressable style={styles.header} onPress={() => setExpanded((current) => !current)}>
        <View style={styles.titleRow}>
          <Ionicons name="help-circle-outline" size={18} color="#2563eb" />
          <Text style={styles.title}>{title}</Text>
        </View>
        <Ionicons name={expanded ? 'chevron-up-outline' : 'chevron-down-outline'} size={18} color="#2563eb" />
      </Pressable>
      {expanded ? (
        <View style={styles.content}>
          {items.map((item) => (
            <Text key={item} style={styles.item}>• {item}</Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function InlineInfo({ children }: { children: ReactNode }) {
  return <View style={styles.inlineInfo}><Text style={styles.inlineText}>{children}</Text></View>;
}

const styles = StyleSheet.create({
  wrapper: {
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  title: {
    color: '#1e3a8a',
    fontWeight: '900',
    fontSize: 14,
  },
  content: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#bfdbfe',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },
  item: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 18,
  },
  inlineInfo: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 10,
  },
  inlineText: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 17,
  },
});
