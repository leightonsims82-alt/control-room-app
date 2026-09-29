import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { siteprogTheme } from '../theme/siteprogTheme';

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
    backgroundColor: siteprogTheme.colors.card,
    borderRadius: siteprogTheme.radius.card,
    borderWidth: 1,
    borderColor: siteprogTheme.colors.border,
    padding: 18,
    gap: 12,
    shadowColor: '#0B1736',
    shadowOpacity: 0.035,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  header: {
    gap: 3,
  },
  title: {
    color: siteprogTheme.colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  subtitle: {
    color: siteprogTheme.colors.muted,
    fontSize: 13,
  },
});
