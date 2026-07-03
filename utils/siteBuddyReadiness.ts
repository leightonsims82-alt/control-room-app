import AsyncStorage from '@react-native-async-storage/async-storage';

export const SITE_BUDDY_READINESS_KEY = 'programme-buddy:site-buddy-readiness:v1';

export type SiteBuddyInspectionStatus = 'Passed' | 'Failed' | 'Incomplete';

function nextQueueStatus(status: SiteBuddyInspectionStatus) {
  if (status === 'Passed') return 'Accepted';
  if (status === 'Failed') return 'Needs review';
  return 'Needs review';
}

export async function updateSiteBuddyReadinessFromQa(input: {
  plotId?: string;
  activityCode?: string;
  inspectionStatus: SiteBuddyInspectionStatus;
  failCount: number;
  checklistTitle: string;
}) {
  if (!input.plotId || !input.activityCode) return;
  const stored = await AsyncStorage.getItem(SITE_BUDDY_READINESS_KEY);
  if (!stored) return;
  const records = JSON.parse(stored);
  const recordId = `${input.plotId}:${input.activityCode}`;
  const now = new Date().toISOString();
  const next = records.map((record: any) => {
    if (record.id !== recordId) return record;
    return {
      ...record,
      queueStatus: nextQueueStatus(input.inspectionStatus),
      smComment: `QA result ${input.inspectionStatus}: ${input.checklistTitle}. Items needing attention: ${input.failCount}`,
      smUpdatedAt: now,
      updatedAt: now,
    };
  });
  await AsyncStorage.setItem(SITE_BUDDY_READINESS_KEY, JSON.stringify(next));
}
