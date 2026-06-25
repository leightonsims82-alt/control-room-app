export type BuildType = 'Traditional' | 'Timber Frame' | 'Steel Frame';
export type BedroomSize = '2 Bed' | '3 Bed' | '4 Bed' | '5 Bed' | '6 Bed';
export type StageStatus = 'Not started' | 'In progress' | 'Complete';
export type HoldStatus = 'Active' | 'On hold' | 'Released';
export type InspectionStatus =
  | 'Not applicable'
  | 'Ready for inspection'
  | 'Pending'
  | 'Inspection in progress'
  | 'Passed'
  | 'Issues noted'
  | 'Failed awaiting close out'
  | 'Verified complete'
  | 'Blocked';
export type HandoverStatus = 'Not Ready' | 'Partially Ready' | 'Ready for Handover';
export type SiteStatus = 'free' | 'paid';
export type IssuedProgrammeStatus = 'draft' | 'issued';
export type UserRole = 'admin' | 'manager' | 'asm' | 'tsm' | 'supervisor' | 'user';
export type ChecklistAnswer = 'Yes' | 'No' | 'N/A' | 'Not checked';
export type DefectPriority = 'Low' | 'Medium' | 'High';
export type DefectStatus = 'Open' | 'Sent to trade' | 'In progress' | 'Fixed awaiting verification' | 'Verified fixed' | 'Rejected';
export type DefectType = 'Quality' | 'Trade missing' | 'Safety' | 'Delay' | 'Material' | 'Access' | 'Programme risk';

export type HouseType = {
  id: string;
  name: string;
  bedroomSize: BedroomSize;
  buildType: BuildType;
};

export type StageTemplate = {
  id: string;
  name: string;
  trade: string;
  durationDays: number;
  order: number;
  houseTypeId: string;
  isKeyStage?: boolean;
};

export type PlotProgramme = {
  id: string;
  plotName: string;
  phase: string;
  houseTypeId: string;
  startDate: string;
  endDate: string;
  mode: 'forward' | 'reverse';
  isLocked: boolean;
  sharedWithUserIds?: string[];
  holdStatus: HoldStatus;
  holdReason?: string;
};

export type PlotStage = {
  id: string;
  plotProgrammeId: string;
  stageName: string;
  trade: string;
  order: number;
  startDate: string;
  endDate: string;
  durationDays: number;
  delayDays: number;
  delayReason?: string;
  status: StageStatus;
  holdStatus: HoldStatus;
  holdReason?: string;
  isKeyStage: boolean;
  inspectionStatus: InspectionStatus;
  inspectionWindowStart?: string;
  inspectionWindowEnd?: string;
  inspectionNotes?: string;
};

export type KeyStageInspectionTemplateItem = {
  id: string;
  trade: string;
  check: string;
};

export type KeyStageInspectionTemplate = {
  id: string;
  keyStageName: string;
  matchedStageNames: string[];
  description: string;
  items: KeyStageInspectionTemplateItem[];
};

export type InspectionChecklistItem = {
  id: string;
  templateItemId: string;
  trade: string;
  check: string;
  compliant: ChecklistAnswer;
  description?: string;
  imageUri?: string;
  fixed: ChecklistAnswer;
  fixedImageUri?: string;
};

export type InspectionRecord = {
  id: string;
  plotProgrammeId: string;
  plotStageId: string;
  templateId: string;
  templateName: string;
  startedAt: string;
  completedAt?: string;
  status: InspectionStatus;
  items: InspectionChecklistItem[];
};

export type DefectAction = {
  id: string;
  plotProgrammeId: string;
  plotStageId: string;
  inspectionRecordId?: string;
  checklistItemId?: string;
  source: 'Key stage inspection' | '8am walk' | 'Quick finding' | 'DABS';
  stage: string;
  trade: string;
  type: DefectType;
  description: string;
  requiredAction: string;
  imageUri?: string;
  priority: DefectPriority;
  status: DefectStatus;
  sentToTrade: boolean;
  fixed: ChecklistAnswer;
  fixedImageUri?: string;
  createdAt: string;
  closedAt?: string;
};

export type HandoverChecklist = {
  id: string;
  plotProgrammeId: string;
  overallStatus: HandoverStatus;
};

export type HandoverChecklistItem = {
  id: string;
  checklistId: string;
  plotProgrammeId: string;
  itemName: string;
  isComplete: boolean;
  note?: string;
  order: number;
};

export type Supervisor = {
  id: string;
  supervisorName: string;
  trade?: string;
  phone?: string;
  email?: string;
};

export type TradeSupervisor = {
  id: string;
  trade: string;
  supervisorId: string;
};

export type ASMConfig = {
  id: string;
  smUserId: string;
  asmEmail: string;
  asmUserId?: string;
  isActive: boolean;
  controlModeEnabled: boolean;
};

export type Site = {
  id: string;
  name: string;
  status: SiteStatus;
  plotLimit: number;
  description?: string;
  trial_start_date?: string;
  trial_end_date?: string;
  trial_active: boolean;
};

export type IssuedProgramme = {
  id: string;
  plotIds: string[];
  supervisorTrades: string[];
  stageData: Record<string, unknown>;
  submittedBy: string;
  submissionDate: string;
  status: IssuedProgrammeStatus;
  shareToken?: string;
  shareCreatedAt?: string;
};

export type User = {
  id: string;
  role: UserRole;
};
