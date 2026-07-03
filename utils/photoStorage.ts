import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

const BUDDY_PHOTO_FOLDER = 'ProgrammeBuddyEvidence';

function getExtension(uri: string, fallback = 'jpg') {
  const clean = uri.split('?')[0];
  const match = clean.match(/\.([a-zA-Z0-9]+)$/);
  return match?.[1]?.toLowerCase() || fallback;
}

function safeName(value: string) {
  return value.replace(/[^a-z0-9-_]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'evidence';
}

export function getBuddyPhotoFolderUri() {
  return `${FileSystem.documentDirectory}${BUDDY_PHOTO_FOLDER}/`;
}

export async function savePhotoToBuddyFolder(input: { sourceUri: string; plotNo?: string; checklistId?: string; itemId?: string; fileName?: string }) {
  if (Platform.OS === 'web' || !FileSystem.documentDirectory) {
    return {
      uri: input.sourceUri,
      fileName: input.fileName || input.sourceUri.split('/').pop() || 'Buddy evidence photo',
      folderUri: '',
      copied: false,
    };
  }

  const folderUri = getBuddyPhotoFolderUri();
  await FileSystem.makeDirectoryAsync(folderUri, { intermediates: true });

  const extension = getExtension(input.fileName || input.sourceUri);
  const prefix = safeName([input.plotNo ? `plot-${input.plotNo}` : 'plot', input.checklistId, input.itemId].filter(Boolean).join('-'));
  const fileName = `${prefix}-${Date.now()}.${extension}`;
  const destinationUri = `${folderUri}${fileName}`;

  try {
    await FileSystem.copyAsync({ from: input.sourceUri, to: destinationUri });
    return { uri: destinationUri, fileName, folderUri, copied: true };
  } catch (error) {
    console.warn('Unable to copy photo to Buddy folder', error);
    return {
      uri: input.sourceUri,
      fileName: input.fileName || input.sourceUri.split('/').pop() || 'Buddy evidence photo',
      folderUri,
      copied: false,
    };
  }
}
