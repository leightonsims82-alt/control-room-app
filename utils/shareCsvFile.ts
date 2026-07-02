import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

function safeFileName(name: string) {
  return name.replace(/[^a-z0-9-_]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'programme-export';
}

export async function shareCsvFile(input: { fileName: string; csvText: string }) {
  const fileName = `${safeFileName(input.fileName)}.csv`;
  const uri = `${FileSystem.documentDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(uri, input.csvText, { encoding: FileSystem.EncodingType.UTF8 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'text/csv',
      dialogTitle: 'Share programme spreadsheet',
      UTI: 'public.comma-separated-values-text',
    });
  }
}
