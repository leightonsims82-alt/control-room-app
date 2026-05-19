import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BedroomSize } from '../types/models';

const bedroomSizes: BedroomSize[] = ['2 Bed', '3 Bed', '4 Bed', '5 Bed', '6 Bed'];

type BedroomFilterValue = BedroomSize | 'all';

export function BedroomFilterBar({ value, onChange }: { value: BedroomFilterValue; onChange: (value: BedroomFilterValue) => void }) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>Beds:</Text>
      <FilterButton label="All" active={value === 'all'} onPress={() => onChange('all')} />
      {bedroomSizes.map((size) => (
        <FilterButton key={size} label={size} active={value === size} onPress={() => onChange(value === size ? 'all' : size)} />
      ))}
    </View>
  );
}

function FilterButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.button, active ? styles.buttonActive : null]}>
      <Text style={[styles.buttonText, active ? styles.buttonTextActive : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  label: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  button: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#ffffff',
  },
  buttonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  buttonText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '800',
  },
  buttonTextActive: {
    color: '#ffffff',
  },
});
