export type RegulationsJurisdiction = 'England' | 'Wales';

export type FoundationType =
  | 'Strip foundation'
  | 'Trench fill foundation'
  | 'Raft foundation'
  | 'Piled foundation'
  | 'Pier and beam foundation'
  | 'Engineered fill foundation'
  | 'Ground improvement foundation'
  | 'Unknown';

export type RegulationReference = {
  id: string;
  jurisdiction: RegulationsJurisdiction | 'Both';
  source: 'NHBC Standards 2026' | 'Building Regulations';
  partOrChapter: string;
  title: string;
  url?: string;
  note?: string;
};

export type MeasurementTolerance = {
  id: string;
  label: string;
  unit: 'mm' | 'degrees' | 'ratio' | 'text';
  rule: string;
  measurementRequired: boolean;
  prompt: string;
  values?: Record<string, string | number>;
  references: RegulationReference[];
};

export type RegulationRoute = {
  jurisdiction: RegulationsJurisdiction;
  label: string;
  sourceUrl: string;
  notes: string;
  approvedDocuments: RegulationReference[];
};
