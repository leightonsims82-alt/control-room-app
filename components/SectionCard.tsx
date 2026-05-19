import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 18,
    gap: 12,
  },
  header: {
    gap: 3,
  },
  title: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '900',
  },
  subtitle: {
    color: '#64748b',
    fontSize: 13,
  },
});
