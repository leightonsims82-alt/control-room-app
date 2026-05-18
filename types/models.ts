export type BuildType = 'Traditional' | 'Timber Frame' | 'Steel Frame';
export type BedroomSize = '2 Bed' | '3 Bed' | '4 Bed' | '5 Bed' | '6 Bed';
export type StageStatus = 'Not started' | 'In progress' | 'Complete';
export type HoldStatus = 'Active' | 'On hold' | 'Released';
export type InspectionStatus = 'Not applicable' | 'Ready for inspection' | 'Pending' | 'Passed' | 'Issues noted' | 'Blocked';

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

export type Supervisor = {
  id: string;
  supervisorName: string;
  trade: string;
  phone?: string;
  email?: string;
};
