import { Ionicons } from '@expo/vector-icons';
import { usePathname } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { submitSiteProgFeedback, SiteProgFeedbackCategory } from '../lib/feedback';
import { siteprogTheme } from '../theme/siteprogTheme';

const categories: SiteProgFeedbackCategory[] = ['Bug', 'Idea', 'Usability', 'General'];

export function FloatingFeedbackButton() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<SiteProgFeedbackCategory>('General');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async () => {
    setSending(true);
    setStatus('');
    try {
      const result = await submitSiteProgFeedback({ page: pathname || '/', category, message });
      setStatus(result.synced ? 'Feedback sent — thank you.' : 'Saved on this device and will be available locally.');
      setMessage('');
      setTimeout(() => {
        setOpen(false);
        setStatus('');
      }, 900);
    } catch (error: any) {
      setStatus(error?.message || 'Unable to save feedback.');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Send feedback"
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.floatingButton,
          pathname === '/master' ? styles.floatingButtonMaster : styles.floatingButtonDefault,
          pressed && styles.pressed,
        ]}
      >
        <Ionicons name="chatbubble-ellipses-outline" size={19} color="#ffffff" />
        <Text style={styles.floatingText}>Feedback</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.titleWrap}>
                <View style={styles.iconWrap}>
                  <Ionicons name="chatbubble-ellipses-outline" size={20} color={siteprogTheme.colors.blue} />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Send feedback</Text>
                  <Text style={styles.modalSubtitle}>Page: {pathname || '/'}</Text>
                </View>
              </View>
              <Pressable onPress={() => setOpen(false)} style={styles.closeButton}>
                <Ionicons name="close" size={20} color={siteprogTheme.colors.text} />
              </Pressable>
            </View>

            <View style={styles.categoryRow}>
              {categories.map((item) => {
                const active = item === category;
                return (
                  <Pressable key={item} onPress={() => setCategory(item)} style={[styles.category, active && styles.categoryActive]}>
                    <Text style={[styles.categoryText, active && styles.categoryTextActive]}>{item}</Text>
                  </Pressable>
                );
              })}
            </View>

            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Tell us what happened, what could be better, or what you would like added..."
              placeholderTextColor="#98A2B3"
              multiline
              autoFocus
              style={styles.input}
            />

            {status ? <Text style={styles.status}>{status}</Text> : null}

            <View style={styles.actions}>
              <Pressable onPress={() => setOpen(false)} style={styles.cancelButton}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable disabled={sending} onPress={submit} style={[styles.sendButton, sending && styles.disabled]}>
                <Ionicons name="send-outline" size={17} color="#ffffff" />
                <Text style={styles.sendText}>{sending ? 'Sending…' : 'Send feedback'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    right: 22,
    zIndex: 1000,
    elevation: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: siteprogTheme.colors.navy,
    borderRadius: siteprogTheme.radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  floatingButtonDefault: { bottom: 94 },
  floatingButtonMaster: { top: 76 },
  floatingText: { color: '#ffffff', fontSize: 12, fontWeight: '900' },
  pressed: { opacity: 0.84, transform: [{ scale: 0.98 }] },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(11,23,54,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 560,
    backgroundColor: siteprogTheme.colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: siteprogTheme.colors.border,
    padding: 18,
    gap: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.22,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 40,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  titleWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  iconWrap: { width: 42, height: 42, borderRadius: 13, backgroundColor: siteprogTheme.colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { color: siteprogTheme.colors.text, fontSize: 20, fontWeight: '900' },
  modalSubtitle: { color: siteprogTheme.colors.muted, fontSize: 11, marginTop: 2 },
  closeButton: { width: 36, height: 36, borderRadius: 12, backgroundColor: siteprogTheme.colors.page, alignItems: 'center', justifyContent: 'center' },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  category: { borderRadius: siteprogTheme.radius.pill, borderWidth: 1, borderColor: siteprogTheme.colors.border, backgroundColor: '#ffffff', paddingHorizontal: 12, paddingVertical: 8 },
  categoryActive: { backgroundColor: siteprogTheme.colors.blueSoft, borderColor: siteprogTheme.colors.blue },
  categoryText: { color: siteprogTheme.colors.muted, fontSize: 12, fontWeight: '800' },
  categoryTextActive: { color: siteprogTheme.colors.blueDark },
  input: {
    minHeight: 150,
    textAlignVertical: 'top',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: siteprogTheme.colors.border,
    backgroundColor: '#FBFCFF',
    color: siteprogTheme.colors.text,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    lineHeight: 20,
  },
  status: { color: siteprogTheme.colors.blueDark, fontSize: 12, fontWeight: '800' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 9, flexWrap: 'wrap' },
  cancelButton: { borderRadius: siteprogTheme.radius.pill, borderWidth: 1, borderColor: siteprogTheme.colors.border, paddingHorizontal: 15, paddingVertical: 10 },
  cancelText: { color: siteprogTheme.colors.muted, fontSize: 12, fontWeight: '900' },
  sendButton: { borderRadius: siteprogTheme.radius.pill, backgroundColor: siteprogTheme.colors.blue, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 7 },
  sendText: { color: '#ffffff', fontSize: 12, fontWeight: '900' },
  disabled: { opacity: 0.55 },
});