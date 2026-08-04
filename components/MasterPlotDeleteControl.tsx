import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSitePlanner } from '../data/sitePlannerStore';

function plotNumberValue(plotNo: string) {
  const value = Number(plotNo.replace(/[^0-9.]/g, ''));
  return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;
}

export function MasterPlotDeleteControl() {
  const { sitePlots, removeSitePlot } = useSitePlanner();
  const [visible, setVisible] = useState(false);
  const [selectedPlotId, setSelectedPlotId] = useState('');
  const [deleting, setDeleting] = useState(false);

  const orderedPlots = useMemo(
    () => sitePlots.slice().sort((a, b) => (a.buildOrder ?? Number.MAX_SAFE_INTEGER) - (b.buildOrder ?? Number.MAX_SAFE_INTEGER) || plotNumberValue(a.plotNo) - plotNumberValue(b.plotNo)),
    [sitePlots],
  );
  const selectedPlot = orderedPlots.find((plot) => plot.id === selectedPlotId) ?? orderedPlots[0];

  const openDeleteControl = () => {
    setSelectedPlotId((current) => orderedPlots.some((plot) => plot.id === current) ? current : orderedPlots[0]?.id ?? '');
    setVisible(true);
  };

  const closeDeleteControl = () => {
    if (deleting) return;
    setVisible(false);
  };

  const deleteSelectedPlot = async () => {
    if (!selectedPlot || deleting) return;
    setDeleting(true);
    try {
      await removeSitePlot(selectedPlot.id);
      setVisible(false);
      setSelectedPlotId('');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Delete a plot from the master programme"
        style={styles.floatingButton}
        onPress={openDeleteControl}
      >
        <Ionicons name="trash-outline" size={18} color="#ffffff" />
        <Text style={styles.floatingButtonText}>Delete plot</Text>
      </Pressable>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={closeDeleteControl}>
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIcon}>
                <Ionicons name="trash-outline" size={22} color="#b91c1c" />
              </View>
              <View style={styles.modalHeaderText}>
                <Text style={styles.modalTitle}>Delete a plot</Text>
                <Text style={styles.modalSubtitle}>Select the plot that you want to remove from the master programme.</Text>
              </View>
            </View>

            {orderedPlots.length ? (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.plotList}>
                  {orderedPlots.map((plot) => {
                    const active = plot.id === selectedPlot?.id;
                    return (
                      <Pressable
                        key={plot.id}
                        style={[styles.plotChip, active ? styles.plotChipActive : null]}
                        onPress={() => setSelectedPlotId(plot.id)}
                      >
                        <Text style={[styles.plotChipText, active ? styles.plotChipTextActive : null]}>Plot {plot.plotNo}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                <View style={styles.warningBox}>
                  <Text style={styles.warningTitle}>Delete Plot {selectedPlot?.plotNo}?</Text>
                  <Text style={styles.warningText}>This removes the plot, its programme changes, notes, delays and linked QA records from this device. This cannot be undone.</Text>
                </View>

                <View style={styles.actions}>
                  <Pressable disabled={deleting} style={styles.cancelButton} onPress={closeDeleteControl}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </Pressable>
                  <Pressable disabled={deleting} style={[styles.deleteButton, deleting ? styles.disabledButton : null]} onPress={deleteSelectedPlot}>
                    <Text style={styles.deleteButtonText}>{deleting ? 'Deleting…' : `Delete Plot ${selectedPlot?.plotNo}`}</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyTitle}>No plots to delete</Text>
                  <Text style={styles.emptyText}>Add a plot to the master programme first.</Text>
                </View>
                <Pressable style={styles.cancelButton} onPress={closeDeleteControl}>
                  <Text style={styles.cancelButtonText}>Close</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    right: 18,
    bottom: 104,
    zIndex: 20,
    elevation: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#b91c1c',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  floatingButtonText: { color: '#ffffff', fontSize: 13, fontWeight: '900' },
  overlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.56)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 560, backgroundColor: '#ffffff', borderRadius: 22, padding: 20, gap: 18 },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  modalIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center' },
  modalHeaderText: { flex: 1 },
  modalTitle: { color: '#0f172a', fontSize: 22, fontWeight: '900' },
  modalSubtitle: { color: '#64748b', fontSize: 13, lineHeight: 19, marginTop: 4 },
  plotList: { gap: 8, paddingVertical: 2 },
  plotChip: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 999, paddingHorizontal: 13, paddingVertical: 9, backgroundColor: '#ffffff' },
  plotChipActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  plotChipText: { color: '#64748b', fontSize: 13, fontWeight: '900' },
  plotChipTextActive: { color: '#ffffff' },
  warningBox: { backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fdba74', borderRadius: 14, padding: 14, gap: 5 },
  warningTitle: { color: '#9a3412', fontSize: 16, fontWeight: '900' },
  warningText: { color: '#9a3412', fontSize: 13, lineHeight: 19, fontWeight: '700' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 10 },
  cancelButton: { alignSelf: 'flex-end', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 11, backgroundColor: '#ffffff' },
  cancelButtonText: { color: '#0f172a', fontWeight: '900' },
  deleteButton: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 11, backgroundColor: '#b91c1c' },
  deleteButtonText: { color: '#ffffff', fontWeight: '900' },
  disabledButton: { opacity: 0.55 },
  emptyBox: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, padding: 16 },
  emptyTitle: { color: '#0f172a', fontSize: 16, fontWeight: '900' },
  emptyText: { color: '#64748b', fontSize: 13, marginTop: 4 },
});
