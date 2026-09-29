import * as ImagePicker from 'expo-image-picker';
import { Alert, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  label: string;
  value?: string;
  onChange: (uri?: string) => void | Promise<void>;
  compact?: boolean;
};

function assetUri(asset: ImagePicker.ImagePickerAsset) {
  if (Platform.OS === 'web' && asset.base64) {
    return `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`;
  }
  return asset.uri;
}

export function PhotoCaptureField({ label, value, onChange, compact }: Props) {
  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera permission', 'Camera access is required to capture site evidence.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.72,
      base64: Platform.OS === 'web',
    });
    if (!result.canceled && result.assets[0]) {
      await onChange(assetUri(result.assets[0]));
    }
  };

  const choosePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo permission', 'Photo library access is required to select site evidence.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.72,
      base64: Platform.OS === 'web',
    });
    if (!result.canceled && result.assets[0]) {
      await onChange(assetUri(result.assets[0]));
    }
  };

  return (
    <View style={[styles.wrap, compact ? styles.compact : null]}>
      <Text style={styles.label}>{label}</Text>

      {value ? (
        <View style={styles.previewRow}>
          <Image source={{ uri: value }} style={compact ? styles.compactImage : styles.image} />
          <View style={styles.previewActions}>
            <Pressable style={styles.secondary} onPress={takePhoto}><Text style={styles.secondaryText}>Retake</Text></Pressable>
            <Pressable style={styles.secondary} onPress={choosePhoto}><Text style={styles.secondaryText}>Replace</Text></Pressable>
            <Pressable style={styles.remove} onPress={() => onChange(undefined)}><Text style={styles.removeText}>Remove</Text></Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.buttons}>
          <Pressable style={styles.primary} onPress={takePhoto}>
            <Text style={styles.primaryText}>Take Photo</Text>
          </Pressable>
          <Pressable style={styles.secondary} onPress={choosePhoto}>
            <Text style={styles.secondaryText}>Choose Photo</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 7 },
  compact: { marginTop: 2 },
  label: { color: '#475569', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  primary: { backgroundColor: '#0f172a', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  primaryText: { color: '#ffffff', fontSize: 11, fontWeight: '900' },
  secondary: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  secondaryText: { color: '#1d4ed8', fontSize: 11, fontWeight: '900' },
  remove: { backgroundColor: '#fff7f7', borderWidth: 1, borderColor: '#fecaca', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  removeText: { color: '#b91c1c', fontSize: 11, fontWeight: '900' },
  previewRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' },
  previewActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, flex: 1, minWidth: 190 },
  image: { width: 190, height: 130, borderRadius: 12, backgroundColor: '#e2e8f0' },
  compactImage: { width: 130, height: 92, borderRadius: 10, backgroundColor: '#e2e8f0' },
});