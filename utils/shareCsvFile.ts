import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

function safeFileName(name: string) {
  return name.replace(/[^a-z0-9-_]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'programme-export';
}

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

function csvToExcelHtml(csvText: string) {
  const rows = csvText.split(/\r?\n/).map((line) => parseCsvLine(line));
  const body = rows
    .map((row, rowIndex) => {
      const tag = rowIndex === 0 ? 'th' : 'td';
      const cells = row.map((cell) => `<${tag}>${escapeHtml(cell).replace(/\n/g, '<br />')}</${tag}>`).join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>table{border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px}td,th{border:1px solid #c8d7e6;padding:6px;vertical-align:top}th{background:#173b5f;color:#fff;font-weight:bold}</style></head><body><table>${body}</table></body></html>`;
}

async function shareOnWeb(fileName: string, htmlText: string) {
  const url = URL.createObjectURL(new Blob([htmlText], { type: 'application/vnd.ms-excel' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function shareCsvFile(input: { fileName: string; csvText: string }) {
  const fileName = `${safeFileName(input.fileName)}.xls`;
  const spreadsheetText = csvToExcelHtml(input.csvText);
  if (Platform.OS === 'web') {
    await shareOnWeb(fileName, spreadsheetText);
    return;
  }
  const uri = `${FileSystem.documentDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(uri, spreadsheetText, { encoding: FileSystem.EncodingType.UTF8 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/vnd.ms-excel',
      dialogTitle: 'Share programme spreadsheet',
      UTI: 'com.microsoft.excel.xls',
    });
  }
}
