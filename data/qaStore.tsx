import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { createQAItems, getQATemplateForActivity } from './qaTemplates';
import {
  QAAction,
  QAInspection,
  QAInspectionStatus,
  StartQAInspectionInput,
  UpdateQAActionInput,
  UpdateQAInspectionItemInput,
} from '../types/qa';

const INSPECTIONS_KEY = 'programme-buddy:qa-inspections:v1';
const ACTIONS_KEY = 'programme-buddy:qa-actions:v1';

function getInspectionStatus(items: QAInspection['items']): QAInspectionStatus {
  if (items.some((item) => item.answer === 'No')) return 'Failed';
  if (items.some((item) => item.answer === 'Not checked')) return 'Incomplete';
  return 'Passed';
}

function makeAction(inspection: QAInspection, item: QAInspection['items'][number]): QAAction {
  const now = new Date().toISOString();
  return {
    id: `qa-action-${inspection.id}-${item.id}`,
    plotId: inspection.plotId,
    plotNo: inspection.plotNo,
    inspectionId: inspection.id,
    inspectionItemId: item.id,
    activityCode: inspection.activityCode,
    stage: inspection.stage,
    trade: item.trade || inspection.trade,
    description: item.comment?.trim() || item.check,
    requiredAction: item.comment?.trim() ? `Rectify: ${item.comment.trim()}` : `Rectify failed check: ${item.check}`,
    sourcePhotoUri: item.photoUri,
    status: 'Open',
    createdAt: now,
  };
}

async function loadArray<T>(key: string) {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return [] as T[];
  try {
    return JSON.parse(raw) as T[];
  } catch {
    return [] as T[];
  }
}

type QAStore = {
  inspections: QAInspection[];
  actions: QAAction[];
  isQALoaded: boolean;
  startInspection: (input: StartQAInspectionInput) => Promise<QAInspection>;
  startReinspection: (inspectionId: string) => Promise<QAInspection | undefined>;
  updateInspectionMeta: (inspectionId: string, input: { inspectorName?: string; generalNotes?: string }) => Promise<void>;
  updateInspectionItem: (inspectionId: string, itemId: string, input: UpdateQAInspectionItemInput) => Promise<void>;
  completeInspection: (inspectionId: string) => Promise<QAInspection | undefined>;
  updateAction: (actionId: string, input: UpdateQAActionInput) => Promise<void>;
};

const QAContext = createContext<QAStore | undefined>(undefined);

export function QADataProvider({ children }: PropsWithChildren) {
  const [inspections, setInspections] = useState<QAInspection[]>([]);
  const [actions, setActions] = useState<QAAction[]>([]);
  const [isQALoaded, setIsQALoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [storedInspections, storedActions] = await Promise.all([
          loadArray<QAInspection>(INSPECTIONS_KEY),
          loadArray<QAAction>(ACTIONS_KEY),
        ]);
        if (mounted) {
          setInspections(storedInspections);
          setActions(storedActions);
        }
      } finally {
        if (mounted) setIsQALoaded(true);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const startInspection = async (input: StartQAInspectionInput) => {
    const active = inspections.find((inspection) =>
      inspection.plotId === input.plotId
      && inspection.activityCode === input.activityCode
      && !inspection.completedAt,
    );
    if (active) return active;

    const sequence = inspections.filter((inspection) => inspection.plotId === input.plotId && inspection.activityCode === input.activityCode).length + 1;
    const template = getQATemplateForActivity(input.activityCode, input.templateId);
    const inspection: QAInspection = {
      id: `qa-${input.plotId}-${input.activityCode.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${Date.now()}`,
      ...input,
      activityName: input.activityName || template.title,
      startedAt: new Date().toISOString(),
      status: 'Draft',
      sequence,
      items: createQAItems(input.activityCode, input.templateId),
    };
    const next = [inspection, ...inspections];
    setInspections(next);
    await AsyncStorage.setItem(INSPECTIONS_KEY, JSON.stringify(next));
    return inspection;
  };

  const startReinspection = async (inspectionId: string) => {
    const original = inspections.find((inspection) => inspection.id === inspectionId);
    if (!original) return undefined;
    return startInspection({
      plotId: original.plotId,
      plotNo: original.plotNo,
      templateId: original.templateId,
      activityCode: original.activityCode,
      activityName: original.activityName,
      stage: original.stage,
      trade: original.trade,
      reinspectionOfId: original.id,
    });
  };

  const updateInspectionMeta = async (inspectionId: string, input: { inspectorName?: string; generalNotes?: string }) => {
    const next = inspections.map((inspection) => inspection.id === inspectionId ? { ...inspection, ...input } : inspection);
    setInspections(next);
    await AsyncStorage.setItem(INSPECTIONS_KEY, JSON.stringify(next));
  };

  const updateInspectionItem = async (inspectionId: string, itemId: string, input: UpdateQAInspectionItemInput) => {
    const next = inspections.map((inspection) => {
      if (inspection.id !== inspectionId) return inspection;
      const items = inspection.items.map((item) => item.id === itemId ? { ...item, ...input } : item);
      return { ...inspection, items, status: inspection.completedAt ? inspection.status : 'Draft' as const };
    });
    setInspections(next);
    await AsyncStorage.setItem(INSPECTIONS_KEY, JSON.stringify(next));
  };

  const completeInspection = async (inspectionId: string) => {
    const inspection = inspections.find((item) => item.id === inspectionId);
    if (!inspection) return undefined;
    const status = getInspectionStatus(inspection.items);
    const completed: QAInspection = {
      ...inspection,
      status,
      completedAt: new Date().toISOString(),
    };
    const nextInspections = inspections.map((item) => item.id === inspectionId ? completed : item);
    const nextActions = [...actions];
    inspection.items.filter((item) => item.answer === 'No').forEach((item) => {
      const existing = nextActions.find((action) => action.inspectionId === inspection.id && action.inspectionItemId === item.id);
      if (!existing) nextActions.unshift(makeAction(completed, item));
    });
    setInspections(nextInspections);
    setActions(nextActions);
    await Promise.all([
      AsyncStorage.setItem(INSPECTIONS_KEY, JSON.stringify(nextInspections)),
      AsyncStorage.setItem(ACTIONS_KEY, JSON.stringify(nextActions)),
    ]);
    return completed;
  };

  const updateAction = async (actionId: string, input: UpdateQAActionInput) => {
    const now = new Date().toISOString();
    const currentAction = actions.find((action) => action.id === actionId);
    if (!currentAction) return;
    const nextActions = actions.map((action) => {
      if (action.id !== actionId) return action;
      const sentToTradeAt = input.status === 'Sent to trade' && !action.sentToTradeAt ? now : action.sentToTradeAt;
      const fixedAt = input.status === 'Fixed awaiting verification' && !action.fixedAt ? now : action.fixedAt;
      const verifiedAt = input.status === 'Verified fixed' && !action.verifiedAt ? now : action.verifiedAt;
      return { ...action, ...input, sentToTradeAt, fixedAt, verifiedAt };
    });
    const mergedAction = nextActions.find((action) => action.id === actionId) || currentAction;
    const nextInspections = inspections.map((inspection) => {
      if (inspection.id !== currentAction.inspectionId) return inspection;
      return {
        ...inspection,
        items: inspection.items.map((item) => item.id === currentAction.inspectionItemId
          ? {
            ...item,
            trade: mergedAction.trade,
            fixed: mergedAction.status === 'Verified fixed' ? 'Yes' : mergedAction.status === 'Rejected' ? 'No' : item.fixed,
            closeOutComment: mergedAction.closeOutComment,
            closeOutPhotoUri: mergedAction.closeOutPhotoUri,
          }
          : item),
      };
    });
    setActions(nextActions);
    setInspections(nextInspections);
    await Promise.all([
      AsyncStorage.setItem(ACTIONS_KEY, JSON.stringify(nextActions)),
      AsyncStorage.setItem(INSPECTIONS_KEY, JSON.stringify(nextInspections)),
    ]);
  };

  const value = useMemo(() => ({
    inspections,
    actions,
    isQALoaded,
    startInspection,
    startReinspection,
    updateInspectionMeta,
    updateInspectionItem,
    completeInspection,
    updateAction,
  }), [inspections, actions, isQALoaded]);

  return <QAContext.Provider value={value}>{children}</QAContext.Provider>;
}

export function useQAData() {
  const context = useContext(QAContext);
  if (!context) throw new Error('useQAData must be used within QADataProvider');
  return context;
}
