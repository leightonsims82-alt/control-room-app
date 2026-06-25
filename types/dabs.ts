import { ChecklistAnswer } from './models';

export type DabsBriefingItem = {
  id: string;
  briefingDate: string;
  plotProgrammeId: string;
  plotStageId?: string;
  liveTomorrow: boolean;
  plannedActivity: string;
  expectedTrade: string;
  inspectionDue: boolean;
  accessReady: ChecklistAnswer;
  materialsReady: ChecklistAnswer;
  programmeRisk: boolean;
  notesFor8am: string;
  briefingComplete: boolean;
  updatedAt: string;
};

export type UpdateDabsBriefingItemInput = Partial<Omit<DabsBriefingItem, 'id' | 'updatedAt'>>;
