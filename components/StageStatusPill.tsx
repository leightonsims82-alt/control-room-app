import { StyleSheet, Text } from 'react-native';
import { StageStatus } from '../types/models';

export function StageStatusPill({ status }: { status: StageStatus }) {
  const style = status === 'Complete' ? styles.complete : status === 'In progress' ? styles.progress : styles.notStarted;

  return <Text style={[styles.base, style]}>{status}</Text>;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: '800',
    overflow: 'hidden',
  },
  complete: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  progress: {
    backgroundColor: '#dbeafe',
    color: '#1d4ed8',
  },
  notStarted: {
    backgroundColor: '#f1f5f9',
    color: '#475569',
  },
});
