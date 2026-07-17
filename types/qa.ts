export type QAAnswer = 'Yes' | 'No' | 'N/A' | 'Not checked';
export type QAInspectionStatus = 'Draft' | 'Incomplete' | 'Failed' | 'Passed';
export type QAActionStatus = 'Open' | 'Sent to trade' | 'In progress' | 'Fixed awaiting verification' | 'Verified fixed' | 'Rejected';

export type QAInspectionItem = {
  id: string;
  templateItemId: string;
  trade: string;
  check: string;
  answer: QAAnswer;
  comment?: string;
  photoUri?: string;
  fixed: QAAnswer;
  closeOutComment?: string;
  closeOutPhotoUri?: string;
};

export type QAInspection = {
  id: string;
  plotId: string;
  plotNo: string;
  templateId: string;
  activityCode: string;
  activityName: string;
  stage: number;
  trade: string;
  inspectorName?: string;
  generalNotes?: string;
  startedAt: string;
  completedAt?: string;
  status: QAInspectionStatus;
  reinspectionOfId?: string;
  sequence: number;
  items: QAInspectionItem[];
};

export type QAAction = {
  id: string;
  plotId: string;
  plotNo: string;
  inspectionId: string;
  inspectionItemId: string;
  activityCode: string;
  stage: number;
  trade: string;
  description: string;
  requiredAction: string;
  sourcePhotoUri?: string;
  status: QAActionStatus;
  sentToTradeAt?: string;
  fixedAt?: string;
  verifiedAt?: string;
  closeOutComment?: string;
  closeOutPhotoUri?: string;
  createdAt: string;
};

export type StartQAInspectionInput = {
  plotId: string;
  plotNo: string;
  templateId: string;
  activityCode: string;
  activityName: string;
  stage: number;
  trade: string;
  reinspectionOfId?: string;
};

export type UpdateQAInspectionItemInput = Partial<Pick<QAInspectionItem, 'trade' | 'answer' | 'comment' | 'photoUri' | 'fixed' | 'closeOutComment' | 'closeOutPhotoUri'>>;
export type UpdateQAActionInput = Partial<Pick<QAAction, 'trade' | 'status' | 'closeOutComment' | 'closeOutPhotoUri'>>;
