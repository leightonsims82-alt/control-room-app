import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export function StatCard({ label, value, helper, icon }: { label: string; value: string | number; helper?: string; icon?: ReactNode }) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View>{icon}</View>
        <View style={styles.textWrap}>
          <Text style={styles.value}>{value}</Text>
          <Text style={styles.label}>{label}</Text>
          {helper ? <Text style={styles.helper}>{helper}</Text> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 210,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 18,
  },
  row: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  textWrap: {
    flex: 1,
  },
  value: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
  },
  helper: {
    marginTop: 3,
    fontSize: 12,
    color: '#94a3b8',
  },
});
