import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { formatBritishDate, parseProgrammeDate } from '../utils/programmeDates';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type ProgrammeDatePickerProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  initialDate?: string;
  minimumDate?: string;
  mondaysOnly?: boolean;
  error?: boolean;
};

function firstDayOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function currentUtcDate() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

function sameDate(first?: Date | null, second?: Date | null) {
  return Boolean(first && second && first.getTime() === second.getTime());
}

export function ProgrammeDatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  initialDate,
  minimumDate,
  mondaysOnly = false,
  error = false,
}: ProgrammeDatePickerProps) {
  const [visible, setVisible] = useState(false);
  const [displayMonth, setDisplayMonth] = useState(() => firstDayOfMonth(parseProgrammeDate(value) ?? parseProgrammeDate(initialDate) ?? parseProgrammeDate(minimumDate) ?? currentUtcDate()));

  const selectedDate = parseProgrammeDate(value);
  const earliestDate = parseProgrammeDate(minimumDate);

  const calendarDays = useMemo(() => {
    const year = displayMonth.getUTCFullYear();
    const month = displayMonth.getUTCMonth();
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const mondayFirstOffset = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
    return Array.from({ length: 42 }, (_, index) => {
      const day = index - mondayFirstOffset + 1;
      return day >= 1 && day <= daysInMonth ? new Date(Date.UTC(year, month, day)) : null;
    });
  }, [displayMonth]);

  const openCalendar = () => {
    const openingDate = selectedDate ?? parseProgrammeDate(initialDate) ?? earliestDate ?? currentUtcDate();
    setDisplayMonth(firstDayOfMonth(openingDate));
    setVisible(true);
  };

  const moveMonth = (change: number) => {
    setDisplayMonth((current) => new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + change, 1)));
  };

  const selectDate = (date: Date) => {
    const isBeforeMinimum = Boolean(earliestDate && date.getTime() < earliestDate.getTime());
    const isWrongDay = mondaysOnly && date.getUTCDay() !== 1;
    if (isBeforeMinimum || isWrongDay) return;
    onChange(formatBritishDate(date));
    setVisible(false);
  };

  const monthTitle = displayMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });

  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={`Choose date. Current value ${value || 'not set'}`} style={[styles.dateField, error ? styles.dateFieldError : null]} onPress={openCalendar}>
        <Text style={[styles.dateText, !value ? styles.placeholderText : null]}>{value || placeholder}</Text>
        <View style={styles.calendarIcon}>
          <Ionicons name="calendar-outline" size={20} color="#173b5f" />
        </View>
      </Pressable>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.calendarCard}>
            <View style={styles.calendarHeader}>
              <Pressable accessibilityLabel="Previous month" style={styles.monthButton} onPress={() => moveMonth(-1)}>
                <Ionicons name="chevron-back" size={22} color="#173b5f" />
              </Pressable>
              <Text style={styles.monthTitle}>{monthTitle}</Text>
              <Pressable accessibilityLabel="Next month" style={styles.monthButton} onPress={() => moveMonth(1)}>
                <Ionicons name="chevron-forward" size={22} color="#173b5f" />
              </Pressable>
            </View>

            <View style={styles.weekHeader}>
              {DAY_LABELS.map((day) => <Text key={day} style={styles.dayLabel}>{day}</Text>)}
            </View>

            <View style={styles.calendarGrid}>
              {calendarDays.map((date, index) => {
                if (!date) return <View key={`empty-${index}`} style={styles.dayCell} />;
                const isSelected = sameDate(date, selectedDate);
                const isBeforeMinimum = Boolean(earliestDate && date.getTime() < earliestDate.getTime());
                const isWrongDay = mondaysOnly && date.getUTCDay() !== 1;
                const disabled = isBeforeMinimum || isWrongDay;
                return (
                  <View key={date.toISOString()} style={styles.dayCell}>
                    <Pressable
                      disabled={disabled}
                      accessibilityLabel={formatBritishDate(date)}
                      style={[styles.dayButton, isSelected ? styles.dayButtonSelected : null, disabled ? styles.dayButtonDisabled : null]}
                      onPress={() => selectDate(date)}
                    >
                      <Text style={[styles.dayText, isSelected ? styles.dayTextSelected : null, disabled ? styles.dayTextDisabled : null]}>{date.getUTCDate()}</Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>

            {mondaysOnly ? <Text style={styles.helperText}>Select a Monday for the start of programme Week 1.</Text> : null}
            {earliestDate ? <Text style={styles.helperText}>Dates before {formatBritishDate(earliestDate)} are unavailable.</Text> : null}

            <Pressable style={styles.cancelButton} onPress={() => setVisible(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  dateField: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, backgroundColor: '#ffffff', paddingLeft: 12, overflow: 'hidden' },
  dateFieldError: { borderColor: '#dc2626' },
  dateText: { flex: 1, color: '#0f172a', fontWeight: '800' },
  placeholderText: { color: '#64748b' },
  calendarIcon: { alignSelf: 'stretch', minWidth: 46, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: '#e2e8f0', backgroundColor: '#f8fafc' },
  overlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.56)', alignItems: 'center', justifyContent: 'center', padding: 18 },
  calendarCard: { width: '100%', maxWidth: 430, backgroundColor: '#ffffff', borderRadius: 22, padding: 18, gap: 12 },
  calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthButton: { width: 42, height: 42, borderRadius: 12, borderWidth: 1, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' },
  monthTitle: { color: '#0f172a', fontSize: 18, fontWeight: '900' },
  weekHeader: { flexDirection: 'row' },
  dayLabel: { width: '14.2857%', textAlign: 'center', color: '#64748b', fontSize: 11, fontWeight: '900' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.2857%', aspectRatio: 1, padding: 2 },
  dayButton: { flex: 1, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  dayButtonSelected: { backgroundColor: '#173b5f' },
  dayButtonDisabled: { opacity: 0.28 },
  dayText: { color: '#0f172a', fontSize: 13, fontWeight: '800' },
  dayTextSelected: { color: '#ffffff' },
  dayTextDisabled: { color: '#94a3b8' },
  helperText: { color: '#64748b', fontSize: 12, lineHeight: 17 },
  cancelButton: { alignSelf: 'flex-end', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#ffffff' },
  cancelButtonText: { color: '#0f172a', fontWeight: '900' },
});
